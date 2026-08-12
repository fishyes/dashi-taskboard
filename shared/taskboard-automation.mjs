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
  "projectName",
  "workspacePath",
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
  if (!validAbsolutePath(value.workspacePath) || !validAbsolutePath(value.skillPath)) return null;
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
    projectName: value.projectName,
    workspacePath: value.workspacePath,
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
  return [
    `[$manage-taskboard](${request.skillPath}) e-taskboard 每 ${request.intervalMinutes} 分鐘檢查任務面板中的「${request.projectName}」專案（專案 ID：${request.taskboardProjectId}，專案目錄：${request.workspacePath}）。`,
    `本輪所有 taskctl 操作都使用完整命令字首 ${taskctlCommand}，不要使用 PATH 中的 taskctl。`,
    `開始時先執行 ${taskctlCommand} issue list --project ${request.taskboardProjectId} --status todo --json。若沒有 todo，使用 Codex automation_update 將名為「${automationName}」的目前自動化設為 PAUSED，保留其他欄位，然後結束；不要建立或開啟新的任務會話。`,
    "每次僅處理一個 todo：選定後先用 issue get 讀取最新議題內容，並用 comment list 讀取全部評論。根據描述和最新評論判斷是否允許開始；若其中寫明等待、暫不執行或目前不應開始，立即跳過並報告，不改狀態。評論也包含已完成後被打回的返工要求。",
    "確認允許開始後，必須在讀取程式碼、下載附件、分析或實施前，使用剛讀取的 version 將仍可認領的 todo 移到 in_progress；寫入成功前不得繼續。不得認領已被其他會話綁定或其他 Agent 領取的議題。",
    "若因 version 陳舊發生版本衝突，重新執行 issue get 和 comment list；僅當仍為可認領 todo、未綁定其他會話、未歸檔且描述和最新評論未變化時，用最新 version 重試一次。若已被認領、狀態或要求已變、已歸檔、服務或永久 API 錯誤，或重試仍失敗，立即跳過該議題、退出並報告；不得搶佔或迴圈重試。",
    "若首次 issue get 回傳 threadId，議題已綁定原會話：不要在目前自動化會話認領；使用 Codex send_message_to_thread 向原會話傳送繼續處理指令，由原會話按上述協議判斷和認領，然後結束目前自動化會話。若沒有 threadId，則在目前自動化會話處理。",
    "若議題已綁定 branch 或 worktree，必須在該議題綁定的開發上下文執行，避免並行 Agent 修改同一工作目錄。",
    "執行完成並驗證後，先用 comment add 記錄關鍵改動、驗證結果、執行結果和剩餘風險，再使用最新 version 將議題移動到 in_review；不要直接標記為 done。",
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
    projectId: request.codexProjectId,
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
        ? (item.projectId ?? item.target?.projectId) === value
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
  return validText(value, 2_048) && path.isAbsolute(value);
}
