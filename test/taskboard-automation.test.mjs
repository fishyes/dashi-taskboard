import assert from "node:assert/strict";
import { test } from "node:test";

import {
  buildTaskboardAutomationName,
  buildTaskboardAutomationPrompt,
  buildTaskboardAutomationSpec,
  parseTaskboardAutomationHostRequest,
  reconcileTaskboardAutomation,
  taskboardAutomationPolicyOperation,
} from "../shared/taskboard-automation.mjs";
import {
  AUTOMATION_MODELS,
  isSupportedModelEffort,
  withAutomationModel,
} from "../shared/taskboard-automation-options.mjs";

const baseRequest = {
  id: "host-request-1",
  action: "automation",
  requestId: "iframe-request-1",
  operation: "ensure-active",
  taskboardProjectId: "ppt-skill",
  codexProjectId: "codex-project-123",
  codexProjectKind: "local",
  codexHostId: "local",
  projectName: "PPT Skill",
  workspacePath: "/Users/example/Documents/ppt-skill",
  skillPath: "/Users/example/taskboard/skills/manage-taskboard/SKILL.md",
  enabledByUser: true,
  quotaAware: false,
  intervalMinutes: 5,
  model: "gpt-5.5",
  reasoningEffort: "high",
};

const remoteRequest = {
  ...baseRequest,
  codexProjectId: "remote-project-123",
  codexProjectKind: "remote",
  codexHostId: "remote-ssh-discovered:merlin-agent",
  projectName: "Playground",
  workspacePath: "/mlx_devbox/users/example/playground",
  remoteProjects: [
    {
      codexProjectId: "remote-project-123",
      codexProjectKind: "remote",
      codexHostId: "remote-ssh-discovered:merlin-agent",
      workspacePath: "/mlx_devbox/users/example/playground",
    },
    {
      codexProjectId: "remote-worktree-456",
      codexProjectKind: "remote",
      codexHostId: "remote-ssh-discovered:merlin-agent",
      workspacePath: "/mlx_devbox/users/example/playground-worktree",
    },
  ],
};

test("the automation model catalog matches Codex and normalizes unsupported efforts", () => {
  assert.deepEqual(AUTOMATION_MODELS, [
    {
      label: "5.6 Sol",
      slug: "gpt-5.6-sol",
      defaultEffort: "low",
      efforts: ["low", "medium", "high", "xhigh", "max", "ultra"],
    },
    {
      label: "5.6 Terra",
      slug: "gpt-5.6-terra",
      defaultEffort: "medium",
      efforts: ["low", "medium", "high", "xhigh", "max", "ultra"],
    },
    {
      label: "5.6 Luna",
      slug: "gpt-5.6-luna",
      defaultEffort: "medium",
      efforts: ["low", "medium", "high", "xhigh", "max"],
    },
    {
      label: "5.5",
      slug: "gpt-5.5",
      defaultEffort: "medium",
      efforts: ["low", "medium", "high", "xhigh"],
    },
    {
      label: "5.4",
      slug: "gpt-5.4",
      defaultEffort: "medium",
      efforts: ["low", "medium", "high", "xhigh"],
    },
    {
      label: "5.4 Mini",
      slug: "gpt-5.4-mini",
      defaultEffort: "medium",
      efforts: ["low", "medium", "high", "xhigh"],
    },
  ]);

  const current = {
    status: "ACTIVE",
    intervalMinutes: 5,
    model: "gpt-5.6-sol",
    reasoningEffort: "ultra",
  };
  assert.deepEqual(withAutomationModel(current, "gpt-5.6-terra"), {
    ...current,
    model: "gpt-5.6-terra",
  });
  assert.deepEqual(withAutomationModel(current, "gpt-5.6-luna"), {
    ...current,
    model: "gpt-5.6-luna",
    reasoningEffort: "medium",
  });
});

test("the automation host request accepts only whitelisted project automation options", () => {
  assert.deepEqual(parseTaskboardAutomationHostRequest(baseRequest), baseRequest);
  assert.equal(
    parseTaskboardAutomationHostRequest({ ...baseRequest, operation: "delete" }),
    null,
  );
  assert.equal(
    parseTaskboardAutomationHostRequest({ ...baseRequest, method: "automation-delete" }),
    null,
  );
  assert.equal(
    parseTaskboardAutomationHostRequest({ ...baseRequest, prompt: "arbitrary" }),
    null,
  );
  assert.deepEqual(
    parseTaskboardAutomationHostRequest({ ...baseRequest, intervalMinutes: 10 }),
    { ...baseRequest, intervalMinutes: 10 },
  );
  assert.equal(
    parseTaskboardAutomationHostRequest({ ...baseRequest, intervalMinutes: 7 }),
    null,
  );
  assert.equal(
    parseTaskboardAutomationHostRequest({
      ...baseRequest,
      model: "gpt-5.6-sol",
      reasoningEffort: "ultra",
    })?.reasoningEffort,
    "ultra",
  );
  assert.equal(
    parseTaskboardAutomationHostRequest({ ...baseRequest, model: "gpt-future" }),
    null,
  );
  assert.equal(
    parseTaskboardAutomationHostRequest({ ...baseRequest, reasoningEffort: "xhigh" })?.reasoningEffort,
    "xhigh",
  );
  assert.equal(
    parseTaskboardAutomationHostRequest({
      ...baseRequest,
      model: "gpt-5.4",
      reasoningEffort: "ultra",
    }),
    null,
  );
  const allEfforts = ["low", "medium", "high", "xhigh", "max", "ultra"];
  for (const intervalMinutes of [5, 10, 15, 30, 60]) {
    for (const model of AUTOMATION_MODELS) {
      for (const effort of allEfforts) {
        assert.equal(
          parseTaskboardAutomationHostRequest({
            ...baseRequest,
            intervalMinutes,
            model: model.slug,
            reasoningEffort: effort,
          }) !== null,
          model.efforts.includes(effort),
          `${intervalMinutes}m/${model.slug}/${effort}`,
        );
      }
    }
  }
  assert.equal(isSupportedModelEffort("gpt-5.6-luna", "max"), true);
  assert.equal(isSupportedModelEffort("gpt-5.6-luna", "ultra"), false);
  assert.equal(
    parseTaskboardAutomationHostRequest({ ...baseRequest, workspacePath: "relative/path" }),
    null,
  );
  assert.deepEqual(parseTaskboardAutomationHostRequest(remoteRequest), remoteRequest);
  const windowsRemoteRequest = {
    ...remoteRequest,
    workspacePath: String.raw`C:\Users\admin\Documents\dashi-taskboard`,
    remoteProjects: [{
      codexProjectId: "remote-project-123",
      codexProjectKind: "remote",
      codexHostId: "remote-ssh-discovered:merlin-agent",
      workspacePath: String.raw`C:\Users\admin\Documents\dashi-taskboard`,
    }],
  };
  assert.deepEqual(
    parseTaskboardAutomationHostRequest(windowsRemoteRequest),
    windowsRemoteRequest,
  );
  assert.equal(
    parseTaskboardAutomationHostRequest({ ...remoteRequest, codexHostId: "local" }),
    null,
  );
  assert.equal(
    parseTaskboardAutomationHostRequest({ ...baseRequest, codexHostId: "remote-host" }),
    null,
  );
});

test("the stable name and generated prompt are project-scoped and encode the claim protocol", () => {
  assert.equal(
    buildTaskboardAutomationName(baseRequest),
    "Taskboard 自動認領 · ppt-skill",
  );

  const prompt = buildTaskboardAutomationPrompt(baseRequest);
  assert.match(
    prompt,
    /\[\$manage-taskboard\]\(\/Users\/example\/taskboard\/skills\/manage-taskboard\/SKILL\.md\)/,
  );
  assert.match(prompt, /\[\$manage-taskboard\]\([^)]*\) e-taskboard /);
  assert.match(prompt, /PPT Skill/);
  assert.match(prompt, /每 5 分鐘檢查/);
  assert.match(prompt, /ppt-skill/);
  assert.match(prompt, /\/Users\/example\/Documents\/ppt-skill/);
  assert.match(prompt, /每次僅處理一個符合依賴條件的 todo/);
  assert.match(prompt, /issue get/);
  assert.match(prompt, /comment list/);
  assert.match(prompt, /最新 version/);
  assert.match(prompt, /in_progress/);
  assert.match(prompt, /版本衝突.*跳過/);
  assert.match(prompt, /關鍵改動、驗證結果、執行結果和剩餘風險/);
  assert.match(prompt, /in_review/);
  assert.match(prompt, /已綁定.*branch.*worktree/);
});

test("the remote automation prompt keeps taskctl local and delegates work to the SSH project", () => {
  const prompt = buildTaskboardAutomationPrompt(remoteRequest);
  assert.match(prompt, /僅在本機作為任務面板控制器執行/);
  assert.match(prompt, /remote-ssh-discovered:merlin-agent/);
  assert.match(prompt, /\/mlx_devbox\/users\/example\/playground/);
  assert.match(prompt, /remote-worktree-456/);
  assert.match(prompt, /\/mlx_devbox\/users\/example\/playground-worktree/);
  assert.match(prompt, /Codex create_thread/);
  assert.match(prompt, /projectId:actualTarget\.codexProjectId/);
  assert.match(prompt, /同一已儲存主機目前可用的精確遠端專案對應/);
  assert.match(prompt, /developmentContext\.type 是 worktree[\s\S]*workspacePath 與 developmentContext\.path 完全相同/);
  assert.match(prompt, /零項或多項[\s\S]*目標 SSH worktree 未對應[\s\S]*不認領、不 create、不寫入基礎專案 binding/);
  assert.match(prompt, /不得回退到基礎 root、local、專案名稱、其他主機/);
  assert.match(prompt, /Codex wait_threads/);
  assert.match(prompt, /遠端會話不執行 taskctl/);
  assert.match(prompt, /完整 threadBinding 包含 threadId、codexProjectId、codexProjectKind、codexHostId、workspacePath/);
  assert.match(prompt, /目前自動化的專案和主機只能作為未綁定議題的首次目標/);
  assert.match(prompt, /存在 threadId 但沒有完整 threadBinding[\s\S]*舊版本機綁定[\s\S]*--if-version[\s\S]*不得 send、create 或覆蓋該綁定/);
  assert.match(prompt, /所有認領、評論和狀態寫入只由目前本機控制器完成/);
  assert.match(prompt, /已有完整 threadBinding 時，只能使用其儲存的 threadId 和 codexHostId 呼叫 Codex send_message_to_thread/);
  assert.match(prompt, /send 成功後必須重新執行 issue get 一次[\s\S]*status 仍為 todo[\s\S]*threadBinding 與儲存值完全相同[\s\S]*issue move --status in_progress[\s\S]*記錄回應 task\.version 為 ownedVersion/);
  assert.match(prompt, /認領成功後繼續執行後文既有 Codex wait_threads、結果評論和 in_review 寫回路徑，不得結束本輪/);
  assert.doesNotMatch(prompt, /要求原遠端會話按本協議判斷和認領/);
  assert.match(prompt, /未綁定時必須傳入 --clear-binding-thread/);
  assert.match(prompt, /記錄回應 task 的 version 為 ownedVersion[\s\S]*每次 issue move 都必須明確傳入 --if-version ownedVersion/);
  assert.match(prompt, /create_thread 失敗[\s\S]*ownedVersion[\s\S]*--if-version[\s\S]*--clear-binding-thread[\s\S]*移回 todo/);
  assert.match(prompt, /發生 409[\s\S]*立即停止且不得重讀最新 version 後覆蓋/);
  assert.match(prompt, /請求回應遺失或結果不確定[\s\S]*projectId 等於 ownedProjectId[\s\S]*狀態仍為本輪 in_progress[\s\S]*threadBinding 為空或與本輪五欄位 binding 完全相同/);
  assert.match(prompt, /讀到相同 binding 視為前次儲存成功[\s\S]*讀到不同 binding[\s\S]*立即退出/);
  assert.match(prompt, /確定綁定寫入失敗[\s\S]*遠端 threadId[\s\S]*移動到 blocked/);
  assert.match(prompt, /wait_threads 失敗[\s\S]*完整儲存 binding[\s\S]*移動到 blocked/);
  assert.match(prompt, /worker 確認後的每一次 issue move 都必須明確傳入完整遠端 binding/);
  assert.match(prompt, /不得掃描或接管其他 in_progress/);
  assert.match(prompt, /移動到 in_review/);
});

test("the generated automation command uses an argv runtime file instead of an env assignment", () => {
  const previous = process.env.CODEX_TASKBOARD_RUNTIME_FILE;
  const runtimeFile = "/Users/example/Library/Application Support/Codex Taskboard/launcher-runtime.json";
  process.env.CODEX_TASKBOARD_RUNTIME_FILE = runtimeFile;
  try {
    const prompt = buildTaskboardAutomationPrompt(baseRequest);
    // Windows 上 process.execPath 是完整路徑且 cliPath 為反斜線，路徑斷言保持跨平台。
    assert.match(prompt, /taskctl\.mjs'\s+--runtime-file\s+'[^']+launcher-runtime\.json'/);
    assert.ok(prompt.includes(`--runtime-file '${runtimeFile}'`));
    assert.doesNotMatch(prompt, /CODEX_TASKBOARD_RUNTIME_FILE=/);
  } finally {
    if (previous === undefined) {
      delete process.env.CODEX_TASKBOARD_RUNTIME_FILE;
    } else {
      process.env.CODEX_TASKBOARD_RUNTIME_FILE = previous;
    }
  }
});

test("the generated cron spec uses the selected whitelisted local Codex options", () => {
  assert.deepEqual(buildTaskboardAutomationSpec(baseRequest), {
    kind: "cron",
    name: "Taskboard 自動認領 · ppt-skill",
    prompt: buildTaskboardAutomationPrompt(baseRequest),
    projectId: "codex-project-123",
    executionEnvironment: "local",
    localEnvironmentConfigPath: null,
    model: "gpt-5.5",
    reasoningEffort: "high",
    rrule: "RRULE:FREQ=MINUTELY;INTERVAL=5",
  });
  assert.deepEqual(buildTaskboardAutomationSpec({
    ...baseRequest,
    intervalMinutes: 30,
    model: "gpt-5.4",
    reasoningEffort: "medium",
  }), {
    ...buildTaskboardAutomationSpec(baseRequest),
    prompt: buildTaskboardAutomationPrompt({ ...baseRequest, intervalMinutes: 30 }),
    model: "gpt-5.4",
    reasoningEffort: "medium",
    rrule: "RRULE:FREQ=MINUTELY;INTERVAL=30",
  });
  assert.deepEqual(buildTaskboardAutomationSpec(remoteRequest), {
    kind: "cron",
    name: "Taskboard 自動認領 · ppt-skill",
    prompt: buildTaskboardAutomationPrompt(remoteRequest),
    projectId: null,
    executionEnvironment: "local",
    localEnvironmentConfigPath: null,
    model: "gpt-5.5",
    reasoningEffort: "high",
    rrule: "RRULE:FREQ=MINUTELY;INTERVAL=5",
  });
});

test("passive policy checks resume only after quota recovery", () => {
  const passiveAvailable = {
    explicit: false,
    previousQuotaState: "available",
    quotaState: "available",
    currentStatus: "PAUSED",
  };
  assert.equal(
    taskboardAutomationPolicyOperation(
      { ...baseRequest, quotaAware: true },
      passiveAvailable,
    ),
    "list",
  );
  assert.equal(
    taskboardAutomationPolicyOperation(
      { ...baseRequest, quotaAware: true },
      { ...passiveAvailable, quotaState: "unknown" },
    ),
    "list",
  );
  assert.equal(
    taskboardAutomationPolicyOperation(
      { ...baseRequest, quotaAware: true },
      { ...passiveAvailable, previousQuotaState: "blocked" },
    ),
    "ensure-active",
  );
  assert.equal(
    taskboardAutomationPolicyOperation(
      { ...baseRequest, quotaAware: true },
      { ...passiveAvailable, explicit: true },
    ),
    "ensure-active",
  );
  assert.equal(
    taskboardAutomationPolicyOperation(
      { ...baseRequest, quotaAware: false },
      { ...passiveAvailable, currentStatus: "ACTIVE" },
    ),
    "ensure-active",
  );
});

test("ensure-active updates a matching automation by id with a complete active spec", async () => {
  const existing = {
    id: "automation-1",
    status: "ACTIVE",
    kind: "cron",
    name: "Taskboard 自動認領 · ppt-skill",
    prompt: "old prompt",
    projectId: "old-project",
    executionEnvironment: "local",
    localEnvironmentConfigPath: null,
    model: "gpt-5.5",
    reasoningEffort: "medium",
    rrule: "FREQ=HOURLY",
    createdAt: "2026-07-25T00:00:00.000Z",
    internalRevision: 4,
  };
  const calls = [];
  const response = await reconcileTaskboardAutomation(
    { ...baseRequest, automationId: "automation-1" },
    async (method, params) => {
      calls.push({ method, params });
      if (method === "list-automations") return { items: [existing] };
      return { item: params };
    },
  );

  const spec = buildTaskboardAutomationSpec(baseRequest);
  assert.deepEqual(calls, [
    { method: "list-automations", params: {} },
    {
      method: "automation-update",
      params: {
        ...spec,
        id: "automation-1",
        status: "ACTIVE",
      },
    },
  ]);
  assert.deepEqual(response, {
    item: { ...spec, id: "automation-1", status: "ACTIVE" },
  });
});

test("ensure-active is idempotent when the listed automation already matches", async () => {
  const existing = {
    id: "automation-1",
    status: "ACTIVE",
    ...buildTaskboardAutomationSpec(baseRequest),
    createdAt: "2026-07-25T00:00:00.000Z",
  };
  const calls = [];
  const response = await reconcileTaskboardAutomation(
    { ...baseRequest, automationId: "automation-1" },
    async (method, params) => {
      calls.push({ method, params });
      return { items: [existing] };
    },
  );

  assert.deepEqual(calls, [{ method: "list-automations", params: {} }]);
  assert.deepEqual(response, { item: existing });
});

test("a foreign automation id never grants control outside the project", async () => {
  const foreign = {
    id: "foreign-automation",
    status: "ACTIVE",
    ...buildTaskboardAutomationSpec({
      ...baseRequest,
      taskboardProjectId: "another-project",
    }),
  };
  const ensureCalls = [];
  await reconcileTaskboardAutomation(
    { ...baseRequest, automationId: foreign.id },
    async (method, params) => {
      ensureCalls.push({ method, params });
      if (method === "list-automations") return { items: [foreign] };
      return { item: params };
    },
  );
  assert.deepEqual(ensureCalls, [
    { method: "list-automations", params: {} },
    { method: "automation-create", params: buildTaskboardAutomationSpec(baseRequest) },
  ]);

  const pauseCalls = [];
  const paused = await reconcileTaskboardAutomation(
    { ...baseRequest, operation: "pause", automationId: foreign.id },
    async (method, params) => {
      pauseCalls.push({ method, params });
      return { items: [foreign] };
    },
  );
  assert.deepEqual(pauseCalls, [{ method: "list-automations", params: {} }]);
  assert.deepEqual(paused, { error: "not-found" });
});

test("ensure-active falls back to the stable name and otherwise creates", async () => {
  const matching = {
    id: "automation-by-name",
    status: "PAUSED",
    ...buildTaskboardAutomationSpec(baseRequest),
  };
  const updateCalls = [];
  await reconcileTaskboardAutomation(baseRequest, async (method, params) => {
    updateCalls.push({ method, params });
    if (method === "list-automations") return { items: [matching] };
    return { item: params };
  });
  assert.equal(updateCalls[1].method, "automation-update");
  assert.equal(updateCalls[1].params.id, "automation-by-name");

  const createCalls = [];
  const created = await reconcileTaskboardAutomation(baseRequest, async (method, params) => {
    createCalls.push({ method, params });
    if (method === "list-automations") return { items: [] };
    return { item: { id: "created-1", status: "ACTIVE", ...params } };
  });
  assert.deepEqual(createCalls, [
    { method: "list-automations", params: {} },
    { method: "automation-create", params: buildTaskboardAutomationSpec(baseRequest) },
  ]);
  assert.equal(created.item.id, "created-1");
});

test("pause never creates and list returns only sanitized matching project automations", async () => {
  const matching = {
    id: "matching",
    status: "ACTIVE",
    ...buildTaskboardAutomationSpec(baseRequest),
    untrustedListField: "must not be echoed into an update",
  };
  const unrelated = {
    id: "unrelated",
    status: "ACTIVE",
    ...buildTaskboardAutomationSpec({
      ...baseRequest,
      taskboardProjectId: "another-project",
    }),
  };

  const pauseCalls = [];
  const paused = await reconcileTaskboardAutomation(
    { ...baseRequest, operation: "pause" },
    async (method, params) => {
      pauseCalls.push({ method, params });
      if (method === "list-automations") return { items: [unrelated, matching] };
      return { item: params };
    },
  );
  assert.deepEqual(pauseCalls, [
    { method: "list-automations", params: {} },
    {
      method: "automation-update",
      params: {
        ...buildTaskboardAutomationSpec(baseRequest),
        id: "matching",
        status: "PAUSED",
      },
    },
  ]);
  assert.deepEqual(paused, {
    item: {
      ...buildTaskboardAutomationSpec(baseRequest),
      id: "matching",
      status: "PAUSED",
    },
  });

  const notFoundCalls = [];
  const notFound = await reconcileTaskboardAutomation(
    { ...baseRequest, operation: "pause", taskboardProjectId: "missing" },
    async (method, params) => {
      notFoundCalls.push({ method, params });
      return { items: [matching, unrelated] };
    },
  );
  assert.deepEqual(notFoundCalls, [{ method: "list-automations", params: {} }]);
  assert.deepEqual(notFound, { error: "not-found" });

  const listed = await reconcileTaskboardAutomation(
    { ...baseRequest, operation: "list" },
    async () => ({ items: [unrelated, matching] }),
  );
  assert.deepEqual(listed, {
    items: [{
      id: "matching",
      status: "ACTIVE",
      model: "gpt-5.5",
      reasoningEffort: "high",
      rrule: "RRULE:FREQ=MINUTELY;INTERVAL=5",
    }],
  });

  const invalidPair = {
    ...matching,
    id: "invalid-pair",
    model: "gpt-5.4",
    reasoningEffort: "ultra",
  };
  const invalidListed = await reconcileTaskboardAutomation(
    { ...baseRequest, operation: "list" },
    async () => ({ items: [invalidPair] }),
  );
  assert.deepEqual(invalidListed, { items: [] });
});

test("pause is idempotent for an already paused matching automation", async () => {
  const matching = {
    id: "matching",
    status: "PAUSED",
    ...buildTaskboardAutomationSpec(baseRequest),
  };
  const calls = [];
  const response = await reconcileTaskboardAutomation(
    { ...baseRequest, operation: "pause" },
    async (method, params) => {
      calls.push({ method, params });
      return { items: [matching] };
    },
  );
  assert.deepEqual(calls, [{ method: "list-automations", params: {} }]);
  assert.deepEqual(response, { item: matching });
});
