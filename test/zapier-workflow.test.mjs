import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const board = await readFile(new URL("../web/src/components/WorkflowBoard.tsx", import.meta.url), "utf8");
const node = await readFile(new URL("../web/src/components/WorkflowNode.tsx", import.meta.url), "utf8");
const inspector = await readFile(new URL("../web/src/components/WorkflowInspector.tsx", import.meta.url), "utf8");
const picker = await readFile(new URL("../web/src/components/WorkflowStepPicker.tsx", import.meta.url), "utf8");
const catalog = (await readFile(
  new URL("../web/src/components/workflowCatalog.ts", import.meta.url),
  "utf8",
)).replaceAll("\r\n", "\n");
const styles = await readFile(new URL("../web/src/components/workflow.css", import.meta.url), "utf8");
const globalStyles = await readFile(new URL("../web/src/styles.css", import.meta.url), "utf8");
const controlFlow = await readFile(new URL("../shared/workflow-control-flow.mjs", import.meta.url), "utf8");

test("workflow editing is a constrained vertical execution sequence instead of a free canvas", () => {
  assert.match(board, /normalizeWorkflowSnapshot/);
  assert.match(board, /deriveWorkflowLayout/);
  assert.match(board, /insertWorkflowNode/);
  assert.match(board, /edgeTypes=\{EDGE_TYPES\}/);
  assert.match(board, /nodeOrigin=\{TOP_CENTER_ORIGIN\}/);
  assert.match(board, /nodesDraggable=\{false\}/);
  assert.match(board, /nodesConnectable=\{false\}/);
  assert.match(board, /aria-label=\{text\("流程編排區", "Workflow canvas"\)\}/);
  assert.match(board, /instance\.setCenter\(0, 220, \{ zoom: 1 \}\)/);
  assert.doesNotMatch(board, /\n\s+fitView\n/);
  assert.doesNotMatch(board, /MiniMap|onConnect=|aria-label="節點庫"|workflow-library/);
  assert.doesNotMatch(styles, /workflow-minimap|workflow-library-width|workflow-grid-dot/);
});

test("workflow viewport controls are only shown in the bottom-left control group", () => {
  assert.match(board, /<Controls[\s\S]*?position="bottom-left"/);
  assert.doesNotMatch(board, /aria-label="適應流程檢視"/);
  assert.doesNotMatch(styles, /\.workflow-toolbar-status > button/);
});

test("steps are inserted from the connector or sequence end through a searchable chooser", () => {
  assert.match(board, /const openStepPicker = useCallback/);
  assert.match(board, /aria-label=\{text\("新增第一個步驟", "Add the first step"\)\}/);
  assert.match(
    board,
    /layout\.edges\.map[\s\S]*?edge\.data\.insertion[\s\S]*?openStepPicker/,
  );
  assert.match(board, /<WorkflowStepPicker/);
  assert.match(picker, /role="dialog"/);
  assert.match(picker, /aria-label=\{text\("新增流程步驟", "Add workflow step"\)\}/);
  assert.match(picker, /placeholder=\{text\("搜尋應用程式或動作…", "Search apps or actions…"\)\}/);
  assert.match(picker, /WORKFLOW_GROUPS\.filter/);
  assert.match(picker, /onSelect\(item\)/);
  assert.match(styles, /\.workflow-step-picker \{/);
  assert.match(styles, /\.workflow-sequence-add \{[\s\S]*?pointer-events: all/);
});

test("RSS, pull request and repository issue submissions are distinct trigger choices", () => {
  assert.match(
    catalog,
    /group: "觸發器",[\s\S]*?title: "RSS 訂閱更新"[\s\S]*?kind: "rss-trigger"/,
  );
  assert.match(
    catalog,
    /group: "觸發器",[\s\S]*?title: "PR 提交"[\s\S]*?kind: "pull-request-submitted-trigger"/,
  );
  assert.match(
    catalog,
    /group: "觸發器",[\s\S]*?title: "Issue 提交"[\s\S]*?kind: "repository-issue-submitted-trigger"/,
  );
  assert.match(catalog, /kind: "issue-trigger"/);
  assert.match(board, /rootStepIds\.length === 0[\s\S]*?item\.group === "觸發器"/);
});

test("every trigger kind stays pinned first and cannot be deleted or duplicated", () => {
  assert.match(
    controlFlow,
    /WORKFLOW_TRIGGER_KINDS = Object\.freeze\(\[[\s\S]*?"issue-trigger"[\s\S]*?"rss-trigger"[\s\S]*?"pull-request-submitted-trigger"[\s\S]*?"repository-issue-submitted-trigger"[\s\S]*?\]\)/,
  );
  assert.match(
    catalog,
    /export \{ WORKFLOW_TRIGGER_KINDS, isWorkflowTriggerKind \} from "\.\.\/\.\.\/\.\.\/shared\/workflow-control-flow\.mjs"/,
  );
  assert.doesNotMatch(catalog, /export const WORKFLOW_TRIGGER_KINDS/);
  assert.match(
    board,
    /if \(!node \|\| isWorkflowTriggerKind\(node\.data\.kind\)\) return/,
  );
  assert.match(
    board,
    /if \(!source \|\| isWorkflowTriggerKind\(source\.data\.kind\) \|\| source\.data\.kind === "condition"\) return/,
  );
  assert.match(
    board,
    /const pinnedTriggerId = rootStepIds\[0\][\s\S]*?isWorkflowTriggerKind/,
  );
  assert.match(
    controlFlow,
    /Workflow trigger must stay first/,
  );
  assert.doesNotMatch(board, /data\.kind === "issue-trigger"/);
  assert.match(node, /canDuplicate[\s\S]*?\{canDuplicate && \([\s\S]*?>\{text\("複製步驟", "Duplicate step"\)\}</);
  assert.match(node, /canDuplicate=\{!data\.isTrigger && data\.kind !== "condition"\}/);
});

test("RSS trigger stores one feed address and derives its configured source display", () => {
  assert.match(
    catalog,
    /kind: "rss-trigger"[\s\S]*?rssFeedUrl: ""/,
  );
  assert.match(
    inspector,
    /data\.kind === "rss-trigger"[\s\S]*?aria-label=\{text\("RSS 訂閱位址", "RSS feed URL"\)\}[\s\S]*?onChange=\{\(event\) => onChange\(\{ rssFeedUrl: event\.target\.value \}\)\}/,
  );
  assert.match(catalog, /if \(data\.kind === "rss-trigger"\)[\s\S]*?rssFeedUrl/);
  assert.match(
    catalog,
    /if \(data\.kind === "rss-trigger"\)[\s\S]*?Boolean\(data\.rssFeedUrl\?\.trim\(\)\)/,
  );
  assert.doesNotMatch(inspector, /localStorage/);
});

test("repository submission triggers use current project context without fake infrastructure", () => {
  assert.match(
    catalog,
    /kind: "pull-request-submitted-trigger"[\s\S]*?meta: "目前專案儲存庫 · Pull Request"/,
  );
  assert.match(
    catalog,
    /kind: "repository-issue-submitted-trigger"[\s\S]*?meta: "目前專案儲存庫 · Issue"/,
  );
  assert.doesNotMatch(
    catalog,
    /prRepository|issueRepository|rssPollingInterval|rssWebhook|pullRequestWebhook|issueWebhook/,
  );
});

test("Git 狀態 is a distinct current-project trigger without fake execution infrastructure", () => {
  assert.match(
    catalog,
    /group: "觸發器",[\s\S]*?title: "Git 狀態"[\s\S]*?kind: "git-status-trigger"[\s\S]*?title: "Git 狀態"/,
  );
  assert.match(
    catalog,
    /kind: "git-status-trigger"[\s\S]*?description: "目前專案的 Git 工作區狀態發生變化時觸發"[\s\S]*?meta: "目前專案 · Git 工作區"[\s\S]*?logo: GIT_LOGO/,
  );
  assert.match(
    controlFlow,
    /WORKFLOW_TRIGGER_KINDS = Object\.freeze\(\[[\s\S]*?"git-status-trigger"[\s\S]*?\]\)/,
  );
  assert.match(
    inspector,
    /<div[\s\S]*?className="workflow-inspector-tabs"[\s\S]*?>\{text\("設定", "Settings"\)\}<[\s\S]*?>\{text\("設定", "Configuration"\)\}<[\s\S]*?aria-label=\{text\("額外說明", "Additional instructions"\)\}/,
  );
  assert.doesNotMatch(inspector, /data\.kind === "git-status-trigger"/);
  assert.doesNotMatch(
    catalog,
    /gitStatusRepository|gitStatusProject|gitStatusPolling|gitStatusWatcher|gitStatusExecutor|gitStatusSuccess/,
  );
  assert.match(
    board,
    /displayTitle: workflowNodeDisplayTitle\(node\.data, text\)[\s\S]*?configured: workflowNodeConfigured\(/,
  );
  assert.match(
    catalog,
    /export function workflowNodeDisplayTitle\(data: WorkflowNodeData, text: WorkflowText\)[\s\S]*?const displayTitle = workflowNodeBaseDisplayTitle\(data, text\);[\s\S]*?return displayTitle;[\s\S]*?export function workflowNodeConfigured[\s\S]*?return true;/,
  );
  assert.match(
    board,
    /node\.id === selectedNodeId[\s\S]*?data: \{ \.\.\.node\.data, \.\.\.changes \}/,
  );
  assert.match(board, /nodes: snapshot\.nodes/);
});

test("condition steps keep one comparison rule and own two persisted outcome paths", () => {
  assert.match(catalog, /\| "流程控制"/);
  assert.match(catalog, /"觸發器",\s+"流程控制"/);
  assert.match(
    catalog,
    /group: "流程控制",[\s\S]*?title: "條件判斷"[\s\S]*?description: "根據判斷結果進入對應路徑"[\s\S]*?kind: "condition"[\s\S]*?description: "根據判斷結果進入對應路徑"[\s\S]*?conditionField: "issue-status"[\s\S]*?conditionOperator: "equals"[\s\S]*?conditionValue: "todo"/,
  );
  assert.match(
    inspector,
    /data\.kind === "condition"[\s\S]*?aria-label=\{text\("判斷欄位", "Condition field"\)\}[\s\S]*?aria-label=\{text\("運算子", "Operator"\)\}[\s\S]*?aria-label=\{text\("比較值", "Comparison value"\)\}/,
  );
  assert.match(catalog, /if \(data\.kind === "condition"\)[\s\S]*?formatActionTitle/);
  assert.match(controlFlow, /branches: \{[\s\S]*?true: \{ items: trueItems \}[\s\S]*?false: \{ items: falseItems \}/);
  assert.match(controlFlow, /const mergeId = `__flow-merge-\$\{conditionId\}`/);
  assert.match(board, /flow: WorkflowFlow/);
  assert.match(board, /layout\.virtualNodes\.map/);
  assert.match(styles, /\.workflow-flow-merge::after/);
  const mergeAnchorStyles = styles.match(/\.workflow-flow-merge::after\s*\{([^}]+)\}/)?.[1] ?? "";
  assert.match(mergeAnchorStyles, /width:\s*10px/);
  assert.match(mergeAnchorStyles, /height:\s*10px/);
  assert.match(mergeAnchorStyles, /border:[^;]*var\(--border-strong\)/);
  assert.match(mergeAnchorStyles, /background:[^;]*var\(--surface-raised\)/);
  assert.match(styles, /\.workflow-condition-branch-label/);
  assert.doesNotMatch(board, /conditionGraph/);
});

test("condition branch pickers use recursive sequence refs and allow nested conditions", () => {
  assert.match(board, /sequenceRef: WorkflowSequenceRef/);
  assert.match(board, /index: number/);
  assert.match(
    board,
    /insertWorkflowNode\([\s\S]*?pickerTarget\.sequenceRef[\s\S]*?pickerTarget\.index/,
  );
  assert.match(
    board,
    /item\.group !== "觸發器"/,
  );
  assert.doesNotMatch(board, /item\.data\.kind !== "condition"/);
});

test("deleting a condition removes its subtree and conditions cannot duplicate", () => {
  assert.match(
    board,
    /deleteWorkflowNode\(flow, nodeId\)[\s\S]*?deleted\.removedNodeIds/,
  );
  assert.match(
    board,
    /source\.data\.kind === "condition"\) return/,
  );
});

test("condition fields expose only meaningful operators and value controls", () => {
  assert.match(
    catalog,
    /value: "issue-status"[\s\S]*?operators: \["equals", "not-equals"\][\s\S]*?defaultValue: "todo"/,
  );
  assert.match(
    catalog,
    /value: "issue-priority"[\s\S]*?operators: \["equals", "not-equals"\][\s\S]*?defaultValue: "none"/,
  );
  assert.match(
    catalog,
    /value: "issue-labels"[\s\S]*?operators: \["contains", "not-contains"\][\s\S]*?defaultValue: ""/,
  );
  assert.match(
    catalog,
    /value: "upstream-output"[\s\S]*?operators: \["equals", "not-equals", "contains", "not-contains"\][\s\S]*?defaultValue: ""/,
  );
  assert.match(
    inspector,
    /conditionField: selectedField\.value,[\s\S]*?conditionOperator: selectedField\.defaultOperator,[\s\S]*?conditionValue: selectedField\.defaultValue/,
  );
  assert.match(
    inspector,
    /conditionField === "issue-status"[\s\S]*?ISSUE_STATUSES\.map/,
  );
  assert.match(
    inspector,
    /conditionField === "issue-priority"[\s\S]*?ISSUE_PRIORITIES\.map/,
  );
  assert.match(
    inspector,
    /\(conditionField === "issue-labels" \|\| conditionField === "upstream-output"\)[\s\S]*?<input[\s\S]*?aria-label=\{text\("比較值", "Comparison value"\)\}/,
  );
});

test("Feishu message keeps Feishu docs and configures exactly one real delivery target", () => {
  assert.match(
    catalog,
    /kind: "feishu-docs"[\s\S]*?kind: "feishu-message"[\s\S]*?logo: FEISHU_LOGO/,
  );
  assert.match(
    catalog,
    /FEISHU_MESSAGE_RECIPIENTS = \[[\s\S]*?value: "self", label: "傳送給自己"[\s\S]*?value: "user", label: "傳送給特定使用者"[\s\S]*?value: "chat", label: "傳送到群聊"[\s\S]*?\] as const/,
  );
  assert.match(
    inspector,
    /data\.kind === "feishu-message"[\s\S]*?aria-label=\{text\("飛書訊息傳送物件", "Feishu message recipient"\)\}[\s\S]*?data\.feishuRecipientType === "user"[\s\S]*?aria-label=\{text\("飛書使用者", "Feishu user"\)\}[\s\S]*?data\.feishuRecipientType === "chat"[\s\S]*?aria-label=\{text\("飛書群聊", "Feishu chat"\)\}/,
  );
  assert.doesNotMatch(inspector, /localStorage/);
});

test("add ISSUE is a separate result step beside issue update", () => {
  assert.match(
    catalog,
    /group: "結果",[\s\S]*?title: "新增 ISSUE"[\s\S]*?kind: "issue-create"[\s\S]*?title: "新增 ISSUE"[\s\S]*?icon: "createIssue"/,
  );
  assert.match(catalog, /kind: "issue-update"/);
  assert.match(picker, /onSelect\(item\)/);
});

test("add ISSUE owns independent creation fields", () => {
  const createIssueBlock = catalog.match(/kind: "issue-create",[\s\S]*?\n    },\n  },/)?.[0] ?? "";
  assert.match(createIssueBlock, /createIssueTitle: ""/);
  assert.match(createIssueBlock, /createIssueDescription: ""/);
  assert.match(createIssueBlock, /createIssueStatus: "todo"/);
  assert.match(createIssueBlock, /createIssuePriority: "none"/);
  assert.match(createIssueBlock, /createIssueLabels: ""/);
  assert.doesNotMatch(
    createIssueBlock,
    /targetStatus|targetPriority|labelsToAdd|specificIssueId/,
  );
});

test("add ISSUE keeps shared inspector settings and limits its configuration to creation inputs", () => {
  assert.match(inspector, /<div[\s\S]*?className="workflow-inspector-tabs"[\s\S]*?>\{text\("設定", "Settings"\)\}<[\s\S]*?>\{text\("設定", "Configuration"\)\}</);
  assert.match(
    inspector,
    /\{activeTab === "settings" \? \([\s\S]*?aria-label=\{text\("額外說明", "Additional instructions"\)\}[\s\S]*?text\("目前專案", "Current project"\)/,
  );
  assert.doesNotMatch(inspector, /data\.kind !== "issue-create" &&/);
  assert.doesNotMatch(inspector, /data\.kind === "issue-create" \? \(/);
  const createIssueInspector = inspector.match(
    /data\.kind === "issue-create" && \([\s\S]*?\n          \)\}/,
  )?.[0] ?? "";
  assert.match(createIssueInspector, /aria-label=\{text\("ISSUE 標題", "Issue title"\)\}/);
  assert.match(createIssueInspector, /aria-label=\{text\("ISSUE 描述", "Issue description"\)\}/);
  assert.match(createIssueInspector, /aria-label=\{text\("ISSUE 初始狀態", "Issue initial status"\)\}[\s\S]*?ISSUE_STATUSES\.map/);
  assert.match(createIssueInspector, /aria-label=\{text\("ISSUE 優先順序", "Issue priority"\)\}[\s\S]*?ISSUE_PRIORITIES\.map/);
  assert.match(createIssueInspector, /aria-label=\{text\("ISSUE 標籤", "Issue labels"\)\}/);
  assert.doesNotMatch(createIssueInspector, /目前專案|projectName|property-project/);
});

test("add ISSUE title, meta and configured state reflect draft data without executing", () => {
  assert.match(
    catalog,
    /if \(data\.kind === "issue-create"\)[\s\S]*?createIssueTitle\?\.trim\(\)/,
  );
  assert.match(
    catalog,
    /if \(data\.kind === "issue-create"\)[\s\S]*?createIssueStatus[\s\S]*?createIssuePriority/,
  );
  assert.match(
    catalog,
    /if \(data\.kind === "issue-create"\)[\s\S]*?Boolean\(data\.createIssueTitle\?\.trim\(\)\)/,
  );
  assert.doesNotMatch(catalog, /issueCreated|createdIssueId|建立成功/);
});

test("add ISSUE uses the shared node data and workspace persistence path", () => {
  assert.match(inspector, /onChange\(\{ createIssueTitle: event\.target\.value \}\)/);
  assert.match(
    board,
    /node\.id === selectedNodeId[\s\S]*?data: \{ \.\.\.node\.data, \.\.\.changes \}/,
  );
  assert.match(board, /nodes: snapshot\.nodes/);
  assert.doesNotMatch(inspector, /localStorage/);
});

test("new step configuration follows the shared node data and workspace persistence path", () => {
  assert.match(inspector, /onChange\(\{[\s\S]*?conditionField: selectedField\.value/);
  assert.match(
    inspector,
    /feishuRecipientType: event\.target\.value as WorkflowNodeData\["feishuRecipientType"\],[\s\S]*?feishuUserId: "",[\s\S]*?feishuChatId: ""/,
  );
  assert.match(
    board,
    /node\.id === selectedNodeId[\s\S]*?data: \{ \.\.\.node\.data, \.\.\.changes \}/,
  );
  assert.match(board, /nodes: snapshot\.nodes/);
});

test("sequence steps reuse the original structured workflow node presentation", () => {
  assert.match(node, /Position\.Top/);
  assert.match(node, /Position\.Bottom/);
  assert.match(node, /data\.stepNumber/);
  assert.match(node, /data\.configured[\s\S]*?\? text\("已設定", "Configured"\)[\s\S]*?: text\("需要設定", "Needs configuration"\)/);
  assert.match(node, /aria-label=\{text\("步驟操作", "Step actions"\)\}/);
  assert.match(node, />\{text\("複製步驟", "Duplicate step"\)\}</);
  assert.match(node, />\{text\("刪除步驟", "Delete step"\)\}</);
  assert.match(node, /data\.onDuplicate/);
  assert.match(node, /data\.onDelete/);
  assert.match(node, /workflow-node-header/);
  assert.match(node, /workflow-node-heading/);
  assert.match(node, /workflow-node-body/);
  assert.match(node, /workflow-node-footer/);
  assert.match(node, /workflow-node-state/);
  assert.doesNotMatch(node, /workflow-step-card|workflow-step-main/);
  assert.match(board, /const WORKFLOW_STEP_WIDTH = 250/);
  assert.match(board, /const WORKFLOW_STEP_HEIGHT = 138/);
  assert.match(board, /measured: \{ width: WORKFLOW_STEP_WIDTH, height \}/);
  assert.match(board, /measured: \{ width: PLAN_ITEM_WIDTH, height: PLAN_ITEM_HEIGHT \}/);
  assert.match(board, /measured: \{ width: END_STEP_HEIGHT, height: END_STEP_HEIGHT \}/);
  assert.match(globalStyles, /\.workflow-node \{[\s\S]*?width: 250px/);
  assert.match(globalStyles, /\.workflow-node\.selected \{/);
});

test("step configuration is an on-demand right panel rather than a permanent three-column shell", () => {
  assert.match(board, /selectedNode && \([\s\S]*?<WorkflowInspector/);
  assert.match(inspector, /aria-label=\{text\("關閉步驟設定", "Close step settings"\)\}/);
  assert.match(inspector, /role="tablist"/);
  assert.match(inspector, />\{text\("設定", "Settings"\)\}</);
  assert.match(inspector, />\{text\("設定", "Configuration"\)\}</);
  assert.match(board, /listWorkflowCapabilities/);
  assert.match(inspector, /可用 Skill/);
  assert.match(inspector, /可用 MCP Server/);
  assert.match(inspector, /額外說明/);
  assert.match(styles, /\.workflow-board\.has-inspector \{[\s\S]*?grid-template-columns: minmax\(0, 1fr\) 360px/);
  assert.doesNotMatch(styles, /\.workflow-board \{[\s\S]*?grid-template-columns: var\(--workflow-library-width\)/);
});

test("planning remains a compact ordered container inside the lighter sequence", () => {
  assert.match(node, /data\.acceptsChildren/);
  assert.match(node, /data\.onAddChild/);
  assert.match(node, /aria-label=\{text\("向執行計畫新增步驟", "Add a step to the execution plan"\)\}/);
  assert.match(node, /workflow-node-compact/);
  assert.match(board, /reorderPlanItem/);
  assert.match(styles, /\.workflow-plan-list \{/);
  assert.match(globalStyles, /\.workflow-node-compact \{/);
});

test("development steps are distinct reusable workflow choices", () => {
  assert.match(catalog, /\| "開發"/);
  assert.match(catalog, /"第三方整合",\s+"開發",\s+"規劃"/);
  assert.match(
    catalog,
    /group: "開發",[\s\S]*?title: "自訂程式碼"[\s\S]*?kind: "custom-code"[\s\S]*?codeRuntime: "shell"[\s\S]*?codeContent: ""/,
  );
  assert.match(
    catalog,
    /group: "開發",[\s\S]*?title: "寫測試"[\s\S]*?kind: "write-tests"/,
  );
  assert.match(
    catalog,
    /group: "開發",[\s\S]*?title: "執行測試"[\s\S]*?kind: "run-tests"[\s\S]*?testScope: "related"[\s\S]*?testCommand: ""/,
  );
  assert.match(node, /\| "development"/);
  assert.match(board, /NESTABLE_TONES = new Set\(\[[\s\S]*?"development"[\s\S]*?\]\)/);
});

test("the step picker follows the catalog's canonical group order", () => {
  assert.match(
    picker,
    /import \{[\s\S]*?WORKFLOW_GROUPS[\s\S]*?type PaletteItem[\s\S]*?\} from "\.\/workflowCatalog"/,
  );
  assert.doesNotMatch(picker, /const WORKFLOW_GROUPS\s*=/);
  assert.match(
    picker,
    /WORKFLOW_GROUPS\.filter\(\(group\) => availableGroups\.has\(group\)\)/,
  );
});

test("custom code stores an environment and source without executing it", () => {
  assert.match(
    catalog,
    /CODE_RUNTIMES = \[[\s\S]*?value: "shell", label: "Shell"[\s\S]*?value: "javascript", label: "JavaScript"[\s\S]*?value: "python", label: "Python"/,
  );
  assert.match(
    inspector,
    /data\.kind === "custom-code"[\s\S]*?aria-label=\{text\("程式碼執行環境", "Code runtime"\)\}[\s\S]*?CODE_RUNTIMES\.map[\s\S]*?aria-label=\{text\("程式碼內容", "Code"\)\}[\s\S]*?onChange=\{\(event\) => onChange\(\{ codeContent: event\.target\.value \}\)\}/,
  );
  assert.match(
    catalog,
    /if \(data\.kind === "custom-code"\)[\s\S]*?codeRuntime[\s\S]*?Boolean\(data\.codeContent\?\.trim\(\)\)/,
  );
  assert.match(
    catalog,
    /capabilityNodeMeta[\s\S]*?if \(data\.kind === "custom-code"\)[\s\S]*?`執行環境 · \$\{optionLabel\(CODE_RUNTIMES, data\.codeRuntime \?\? "shell"\)\}`/,
  );
  assert.doesNotMatch(
    inspector,
    /spawn|execFile|child_process|WebSocket|EventSource/,
  );
});

test("run tests supports related, all and custom command scopes", () => {
  assert.match(
    catalog,
    /TEST_SCOPES = \[[\s\S]*?value: "related", label: "相關測試"[\s\S]*?value: "all", label: "全部測試"[\s\S]*?value: "custom", label: "自訂命令"/,
  );
  assert.match(
    inspector,
    /data\.kind === "run-tests"[\s\S]*?aria-label=\{text\("測試範圍", "Test scope"\)\}[\s\S]*?TEST_SCOPES\.map[\s\S]*?data\.testScope === "custom"[\s\S]*?aria-label=\{text\("測試命令", "Test command"\)\}/,
  );
  assert.match(
    catalog,
    /if \(data\.kind === "run-tests"\)[\s\S]*?testScope === "custom"[\s\S]*?Boolean\(data\.testCommand\?\.trim\(\)\)[\s\S]*?return true/,
  );
  assert.match(
    catalog,
    /if \(data\.kind === "run-tests"\)[\s\S]*?optionLabel\(TEST_SCOPES/,
  );
  assert.match(
    catalog,
    /capabilityNodeMeta[\s\S]*?if \(data\.kind === "run-tests"\)[\s\S]*?`測試範圍 · \$\{optionLabel\(TEST_SCOPES, data\.testScope \?\? "related"\)\}`/,
  );
});

test("development settings use the shared snapshot persistence path", () => {
  assert.match(inspector, /onChange\(\{ codeRuntime: event\.target\.value as WorkflowNodeData\["codeRuntime"\] \}\)/);
  assert.match(inspector, /onChange\(\{ testScope: event\.target\.value as WorkflowNodeData\["testScope"\] \}\)/);
  assert.match(
    board,
    /node\.id === selectedNodeId[\s\S]*?data: \{ \.\.\.node\.data, \.\.\.changes \}/,
  );
  assert.match(board, /nodes: snapshot\.nodes/);
  assert.doesNotMatch(catalog, /testPassed|testResult|executionStatus|scriptOutput/);
});
