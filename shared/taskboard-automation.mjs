import path from "node:path";
import { isSupportedModelEffort } from "./taskboard-automation-options.mjs";

const AUTOMATION_OPERATIONS = new Set(["ensure-active", "pause", "list", "apply-policy"]);
const INTERVAL_MINUTES = new Set([5, 10, 15, 30, 60]);
const HOST_REQUEST_FIELDS = new Set([
  "id",
  "action",
  "requestId",
  "operation",
  "taskboardProjectId",
  "codexProjectId",
  "codexProjectKind",
  "codexHostId",
  "projectName",
  "workspacePath",
  "remoteProjects",
  "skillPath",
  "automationId",
  "enabledByUser",
  "quotaAware",
  "intervalMinutes",
  "model",
  "reasoningEffort",
]);

export function parseTaskboardAutomationHostRequest(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  if (Object.keys(value).some((field) => !HOST_REQUEST_FIELDS.has(field))) return null;
  if (value.action !== "automation") return null;
  if (!validIdentifier(value.id, 80) || !validIdentifier(value.requestId, 100)) return null;
  if (!AUTOMATION_OPERATIONS.has(value.operation)) return null;
  if (!validProjectId(value.taskboardProjectId)) return null;
  if (!validText(value.codexProjectId, 256) || !validText(value.projectName, 200)) return null;
  const codexProjectKind = value.codexProjectKind ?? "local";
  const codexHostId = value.codexHostId ?? "local";
  if (codexProjectKind !== "local" && codexProjectKind !== "remote") return null;
  if (!validText(codexHostId, 256)) return null;
  if (codexProjectKind === "local" && codexHostId !== "local") return null;
  if (codexProjectKind === "remote" && codexHostId === "local") return null;
  if (!validAbsolutePath(value.workspacePath) || !validAbsolutePath(value.skillPath)) return null;
  const remoteProjects = value.remoteProjects === undefined ? [] : value.remoteProjects;
  if (
    !Array.isArray(remoteProjects)
    || remoteProjects.some((project) => (
      !project
      || typeof project !== "object"
      || Array.isArray(project)
      || Object.keys(project).some((field) => ![
        "codexProjectId",
        "codexProjectKind",
        "codexHostId",
        "workspacePath",
      ].includes(field))
      || !validText(project.codexProjectId, 256)
      || project.codexProjectKind !== "remote"
      || project.codexHostId !== codexHostId
      || !validAbsolutePath(project.workspacePath)
    ))
    || (codexProjectKind === "local" && remoteProjects.length > 0)
  ) return null;
  if (!INTERVAL_MINUTES.has(value.intervalMinutes)) return null;
  if (!isSupportedModelEffort(value.model, value.reasoningEffort)) return null;
  if (value.automationId !== undefined && !validText(value.automationId, 256)) return null;
  if (typeof value.enabledByUser !== "boolean" || typeof value.quotaAware !== "boolean") return null;

  return {
    id: value.id,
    action: "automation",
    requestId: value.requestId,
    operation: value.operation,
    taskboardProjectId: value.taskboardProjectId,
    codexProjectId: value.codexProjectId,
    codexProjectKind,
    codexHostId,
    projectName: value.projectName,
    workspacePath: value.workspacePath,
    ...(value.remoteProjects === undefined ? {} : { remoteProjects }),
    skillPath: value.skillPath,
    ...(value.automationId === undefined ? {} : { automationId: value.automationId }),
    enabledByUser: value.enabledByUser,
    quotaAware: value.quotaAware,
    intervalMinutes: value.intervalMinutes,
    model: value.model,
    reasoningEffort: value.reasoningEffort,
  };
}

export function buildTaskboardAutomationName(request) {
  return `Taskboard 自動認領 · ${request.taskboardProjectId}`;
}

export function buildTaskboardAutomationPrompt(request) {
  const automationName = buildTaskboardAutomationName(request);
  const taskctlCommand = buildTaskctlCommand(request);
  const remoteProject = request.codexProjectKind === "remote";
  const remoteProjects = request.remoteProjects ?? [];
  const executionInstructions = remoteProject
    ? [
        `本自動化僅在本機作為任務面板控制器執行；實際開發必須派發到 Codex SSH 遠端專案。匯入專案的基礎 identity 是 projectId=${JSON.stringify(request.codexProjectId)}、hostId=${JSON.stringify(request.codexHostId)}、workspacePath=${JSON.stringify(request.workspacePath)}；同一已儲存主機目前可用的精確遠端專案對應是 ${JSON.stringify(remoteProjects)}。不要在目前的本機自動化會話修改專案檔案。`,
        "從回傳的 todo 中只選擇依賴已完成的議題：relations.blockedBy 為空，或其中每個依賴的 status 都嚴格等於 done。無依賴的 todo 仍可並行處理。若有 todo 但全部被未完成依賴阻擋，本輪直接結束，不暫停自動化，也不建立或開啟新的任務會話。",
        "每次僅處理一個符合依賴條件的 todo：選定後先用 issue get 讀取最新議題內容，並用 comment list 讀取全部評論。根據描述和最新評論判斷是否允許開始；若其中寫明等待、暫不執行或目前不應開始，立即跳過並報告，不改狀態。評論也包含已完成後被打回的返工要求。",
        "完成 issue get 和 comment list 後、移動狀態前，必須再次執行 issue get，並複核 relations.blockedBy 仍為空或其中每個依賴的 status 都嚴格等於 done。若依賴條件不再符合，立即跳過並結束本輪，不改狀態，也不暫停自動化。",
        "先檢查 issue get 的 projectId、version、threadId 和 threadBinding。完整 threadBinding 包含 threadId、codexProjectId、codexProjectKind、codexHostId、workspacePath，且是該議題後續 send、wait 和狀態寫回的唯一目標；目前自動化的專案和主機只能作為未綁定議題的首次目標，不能取代既有綁定。若存在 threadId 但沒有完整 threadBinding，這是只能由 UI 開啟的舊版本機綁定：使用 comment add 說明自動化無法確認專案和主機，再使用首次讀取的 version 作為 --if-version、用 --binding-thread-id 保留原 threadId，將議題移動到 blocked；若衝突立即停止。不得 send、create 或覆蓋該綁定。",
        `未綁定議題必須先從上述精確遠端專案對應解析 actualTarget。若 developmentContext.type 是 worktree，只保留 codexProjectKind="remote"、codexHostId=${JSON.stringify(request.codexHostId)} 且 workspacePath 與 developmentContext.path 完全相同的項目；必須恰好符合一項，並使用該項目自己的 codexProjectId、codexHostId 和 workspacePath。零項或多項時使用 comment add 明確記錄「目標 SSH worktree 未對應」，隨後結束本輪，不認領、不 create、不寫入基礎專案 binding。若沒有 worktree，actualTarget 才是上述基礎 identity，且必須存在於精確對應中。不得回退到基礎 root、local、專案名稱、其他主機或相同路徑的其他主機。`,
        "確認允許開始後，必須在讀取程式碼、下載附件、分析或實施前，由目前本機控制器使用剛讀取的 version 將仍可認領的 todo 移到 in_progress。已有完整 threadBinding 時，issue move 必須同時傳入 --binding-thread-id、--binding-codex-project-id、--binding-codex-project-kind、--binding-codex-host-id、--binding-workspace-path 的儲存值；未綁定時必須傳入 --clear-binding-thread，避免將本機控制器 CODEX_THREAD_ID 寫成任務綁定。寫入成功後記錄回應 task 的 version 為 ownedVersion、projectId 為 ownedProjectId，並記錄本輪 binding；此後本輪每次 issue move 都必須明確傳入 --if-version ownedVersion，成功後再用回應 version 更新 ownedVersion。不得省略 --if-version 後讓 taskctl 自動讀取最新 version。寫入成功前不得繼續。所有認領、評論和狀態寫入只由目前本機控制器完成，不得要求遠端會話執行 taskctl。",
        "若因 version 陳舊發生版本衝突，重新執行 issue get 和 comment list；僅當仍為可認領 todo、綁定身分未變、未歸檔且描述和最新評論未變化時，用最新 version 重試一次。若已被認領、綁定、狀態或要求已變、已歸檔、服務或永久 API 錯誤，或重試仍失敗，立即跳過該議題、退出並報告；不得搶佔或迴圈重試。",
        "認領成功後，已有完整 threadBinding 時，只能使用其儲存的 threadId 和 codexHostId 呼叫 Codex send_message_to_thread；若儲存的主機或會話不可用，使用 comment add 記錄錯誤，再用 ownedVersion、完整儲存 binding 和明確的 --if-version 將議題移動到 blocked；409 衝突時立即停止，不得在目前自動化目標建立替代會話。只有未綁定議題才使用 Codex create_thread 建立遠端任務，target 必須是 {type:\"project\",projectId:actualTarget.codexProjectId,environment:{type:\"local\"}}，首次 identity 必須使用 actualTarget 的 projectId、kind=\"remote\"、hostId 和 workspacePath。傳送給遠端會話的指令必須包含議題編號、標題、完整描述、全部評論和開發上下文，並說明遠端會話不執行 taskctl，只需完成實作、驗證並回傳改動、結果和剩餘風險。",
        "僅當 send_message_to_thread 成功，或 create_thread 成功回傳遠端 threadId，才視為遠端 worker 已確認。未綁定議題在 create_thread 失敗時，使用 comment add 記錄失敗工具和錯誤；隨後用 ownedVersion、明確的 --if-version 和 --clear-binding-thread 將目前議題移回 todo 並結束。若發生 409，表示其他控制端已修改任務，立即停止且不得重讀最新 version 後覆蓋。此補償只處理本輪目前已認領議題；不得掃描或接管其他 in_progress。",
        "建立遠端任務成功後，使用 ownedVersion 和明確的 --if-version 再次移動到 in_progress；必須用完整 binding 參數儲存 create_thread 回傳的 threadId，以及 actualTarget 的 projectId、kind=\"remote\"、hostId 和 workspacePath。成功後用回應 version 更新 ownedVersion 和本輪 binding。若請求回應遺失或結果不確定，只允許重新執行 issue get 一次；僅當 projectId 等於 ownedProjectId、未歸檔、狀態仍為本輪 in_progress，且 threadBinding 為空或與本輪五欄位 binding 完全相同時才可繼續。讀到相同 binding 視為前次儲存成功；讀到空 binding 時才可用本次核對後的 version 重試一次；讀到不同 binding 或任一其他核對項目變化時立即退出，不得寫回。若確定綁定寫入失敗，使用 comment add 記錄失敗和遠端 threadId，再用 ownedVersion、明確的 --if-version 和同一完整 binding 將議題移動到 blocked；409 時停止且不得重複派發。",
        "使用 Codex wait_threads 等待遠端會話時，目標必須使用任務儲存的 threadBinding.threadId 和 threadBinding.codexHostId。wait_threads 失敗、遠端會話明確需要使用者輸入或無法繼續時，使用 comment add 記錄原因，再用 ownedVersion、明確的 --if-version 和完整儲存 binding 將議題移動到 blocked；409 時立即停止。遠端會話完成後，使用 comment add 寫入改動、驗證結果、執行結果和剩餘風險，再用 ownedVersion、明確的 --if-version 和完整儲存 binding 將議題移動到 in_review。worker 確認後的每一次 issue move 都必須明確傳入完整遠端 binding；不要將未完成工作標記為 in_review。",
      ]
    : [
        "從回傳的 todo 中只選擇依賴已完成的議題：relations.blockedBy 為空，或其中每個依賴的 status 都嚴格等於 done。無依賴的 todo 仍可並行處理。若有 todo 但全部被未完成依賴阻擋，本輪直接結束，不暫停自動化，也不建立或開啟新的任務會話。",
        "每次僅處理一個符合依賴條件的 todo：選定後先用 issue get 讀取最新議題內容，並用 comment list 讀取全部評論。根據描述和最新評論判斷是否允許開始；若其中寫明等待、暫不執行或目前不應開始，立即跳過並報告，不改狀態。評論也包含已完成後被打回的返工要求。",
        "完成 issue get 和 comment list 後、移動狀態前，必須再次執行 issue get，並複核 relations.blockedBy 仍為空或其中每個依賴的 status 都嚴格等於 done。若依賴條件不再符合，立即跳過並結束本輪，不改狀態，也不暫停自動化。",
        "確認允許開始後，必須在讀取程式碼、下載附件、分析或實施前，使用剛讀取的 version 將仍可認領的 todo 移到 in_progress；寫入成功前不得繼續。不得認領已被其他會話綁定或其他 Agent 領取的議題。",
        "若因 version 陳舊發生版本衝突，重新執行 issue get 和 comment list；僅當仍為可認領 todo、未綁定其他會話、未歸檔且描述和最新評論未變化時，用最新 version 重試一次。若已被認領、狀態或要求已變、已歸檔、服務或永久 API 錯誤，或重試仍失敗，立即跳過該議題、退出並報告；不得搶佔或迴圈重試。",
        "若首次 issue get 回傳 threadId，議題已綁定原會話：不要在目前自動化會話認領；使用 Codex send_message_to_thread 向原會話傳送繼續處理指令，由原會話按上述協議判斷和認領，然後結束目前自動化會話。若沒有 threadId，則在目前自動化會話處理。",
        "若議題已綁定 branch 或 worktree，必須在該議題綁定的開發上下文執行，避免並行 Agent 修改同一工作目錄。",
        "執行完成並驗證後，先用 comment add 記錄關鍵改動、驗證結果、執行結果和剩餘風險，再使用最新 version 將議題移動到 in_review；不要直接標記為 done。",
      ];
  return [
    `[$manage-taskboard](${request.skillPath}) e-taskboard 每 ${request.intervalMinutes} 分鐘檢查任務面板中的「${request.projectName}」專案（專案 ID：${request.taskboardProjectId}，專案目錄：${request.workspacePath}）。`,
    `本輪所有 taskctl 操作都使用完整命令字首 ${taskctlCommand}，不要使用 PATH 中的 taskctl。`,
    `開始時先執行 ${taskctlCommand} issue list --project ${request.taskboardProjectId} --status todo --json。若沒有 todo，使用 Codex automation_update 將名為「${automationName}」的目前自動化設為 PAUSED，保留其他欄位，然後結束；不要建立或開啟新的任務會話。`,
    ...executionInstructions,
    `本次處理或交接後，再次執行 ${taskctlCommand} issue list --project ${request.taskboardProjectId} --status todo --json。若沒有 todo，使用 Codex automation_update 將名為「${automationName}」的目前自動化設為 PAUSED，保留其他欄位，避免後續建立空會話。`,
  ].join("\n");
}

function buildTaskctlCommand(request) {
  const cliPath = path.resolve(path.dirname(request.skillPath), "../..", "cli/taskctl.mjs");
  const command = `${shellQuote(process.execPath)} ${shellQuote(cliPath)}`;
  const runtimeFilePath = process.env.CODEX_TASKBOARD_RUNTIME_FILE;
  return runtimeFilePath
    ? `${command} --runtime-file ${shellQuote(runtimeFilePath)}`
    : command;
}

function shellQuote(value) {
  return `'${value.replaceAll("'", "'\\''")}'`;
}

export function buildTaskboardAutomationSpec(request) {
  return {
    kind: "cron",
    name: buildTaskboardAutomationName(request),
    prompt: buildTaskboardAutomationPrompt(request),
    projectId: request.codexProjectKind === "remote" ? null : request.codexProjectId,
    executionEnvironment: "local",
    localEnvironmentConfigPath: null,
    model: request.model,
    reasoningEffort: request.reasoningEffort,
    rrule: `RRULE:FREQ=MINUTELY;INTERVAL=${request.intervalMinutes}`,
  };
}

export function taskboardAutomationPolicyOperation(request, {
  explicit,
  previousQuotaState,
  quotaState,
  currentStatus,
}) {
  if (!request.enabledByUser) return "pause";
  if (
    !explicit
    && currentStatus === "PAUSED"
    && (!request.quotaAware || previousQuotaState === "available")
  ) return "list";
  if (request.quotaAware && quotaState !== "available") return "pause";
  if (
    explicit
    || currentStatus === undefined
    || (request.quotaAware && previousQuotaState !== "available")
  ) return "ensure-active";
  return "ensure-active";
}

export async function reconcileTaskboardAutomation(request, rpc) {
  const listed = await rpc("list-automations", {});
  const items = Array.isArray(listed?.items) ? listed.items : [];
  const name = buildTaskboardAutomationName(request);
  const matchingItems = items.filter((item) => item?.name === name);

  if (request.operation === "list") {
    return { items: matchingItems.map(sanitizeAutomation).filter(Boolean) };
  }

  const existing = (
    request.automationId
      ? matchingItems.find((item) => item?.id === request.automationId)
      : null
  ) ?? matchingItems[0];
  const spec = buildTaskboardAutomationSpec(request);

  if (request.operation === "pause") {
    if (!existing) return { error: "not-found" };
    if (automationMatchesSpec(existing, spec, "PAUSED")) return { item: existing };
    return rpc("automation-update", { ...spec, id: existing.id, status: "PAUSED" });
  }

  if (request.operation !== "ensure-active") {
    throw new Error(`Unsupported automation operation: ${request.operation}`);
  }
  if (existing) {
    if (automationMatchesSpec(existing, spec, "ACTIVE")) return { item: existing };
    return rpc("automation-update", {
      ...spec,
      id: existing.id,
      status: "ACTIVE",
    });
  }
  return rpc("automation-create", spec);
}

function sanitizeAutomation(item) {
  if (
    !validText(item?.id, 256)
    || (item.status !== "ACTIVE" && item.status !== "PAUSED")
    || !isSupportedModelEffort(item.model, item.reasoningEffort)
    || !validRrule(item.rrule)
  ) return null;
  return {
    id: item.id,
    status: item.status,
    model: item.model,
    reasoningEffort: item.reasoningEffort,
    rrule: item.rrule,
    ...(
      item.nextRunAt === null || Number.isFinite(item.nextRunAt)
        ? { nextRunAt: item.nextRunAt }
        : {}
    ),
  };
}

function validRrule(value) {
  return typeof value === "string"
    && /^RRULE:FREQ=MINUTELY;INTERVAL=(5|10|15|30|60)$/.test(value);
}

function automationMatchesSpec(item, spec, status) {
  return item?.status === status
    && Object.entries(spec).every(([field, value]) => (
      field === "projectId"
        ? (item.projectId ?? item.target?.projectId ?? null) === value
        : item[field] === value
    ));
}

function validIdentifier(value, maxLength) {
  return typeof value === "string"
    && value.length > 0
    && value.length <= maxLength
    && /^[a-z0-9-]+$/i.test(value);
}

function validProjectId(value) {
  return typeof value === "string"
    && value.length > 0
    && value.length <= 128
    && /^[a-z0-9._-]+$/i.test(value);
}

function validText(value, maxLength) {
  return typeof value === "string"
    && value.trim() === value
    && value.length > 0
    && value.length <= maxLength
    && !/[\u0000-\u001f\u007f]/.test(value);
}

function validAbsolutePath(value) {
  return validText(value, 2_048)
    && (path.posix.isAbsolute(value) || path.win32.isAbsolute(value));
}
