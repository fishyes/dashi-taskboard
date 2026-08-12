import bytedanceLogo from "@lobehub/icons-static-svg/icons/bytedance-color.svg";
import claudeLogo from "@lobehub/icons-static-svg/icons/claude-color.svg";
import claudeCodeLogo from "@lobehub/icons-static-svg/icons/claudecode-color.svg";
import cloudflareLogo from "@lobehub/icons-static-svg/icons/cloudflare-color.svg";
import codexLogo from "@lobehub/icons-static-svg/icons/codex-color.svg";
import geminiLogo from "@lobehub/icons-static-svg/icons/gemini-color.svg";
import jimengLogo from "@lobehub/icons-static-svg/icons/jimeng-color.svg";
import klingLogo from "@lobehub/icons-static-svg/icons/kling-color.svg";
import mcpLogo from "@lobehub/icons-static-svg/icons/mcp.svg";
import midjourneyLogo from "@lobehub/icons-static-svg/icons/midjourney.svg";
import vercelLogo from "@lobehub/icons-static-svg/icons/vercel.svg";
import xLogo from "../assets/x-logo-black.png";
import type { WorkflowCapabilities } from "../types";
import type { WorkflowNodeData } from "./WorkflowNode";
import { workflowText, type WorkflowText } from "./workflowI18n";
export { WORKFLOW_TRIGGER_KINDS, isWorkflowTriggerKind } from "../../../shared/workflow-control-flow.mjs";

export type WorkflowGroup =
  | "觸發器"
  | "流程控制"
  | "Skill 和 MCP"
  | "API"
  | "第三方整合"
  | "開發"
  | "規劃"
  | "結果";

export interface PaletteItem {
  group: WorkflowGroup;
  title: string;
  description: string;
  data: WorkflowNodeData;
}

export const WORKFLOW_GROUPS: WorkflowGroup[] = [
  "觸發器",
  "流程控制",
  "Skill 和 MCP",
  "API",
  "第三方整合",
  "開發",
  "規劃",
  "結果",
];

export const GIT_OPERATIONS = [
  { value: "status", label: "檢視狀態" },
  { value: "commit", label: "提交更改" },
  { value: "pull", label: "拉取更新" },
  { value: "push", label: "推送分支" },
  { value: "create-branch", label: "建立分支" },
  { value: "switch-branch", label: "切換分支" },
  { value: "merge-branch", label: "合併分支" },
  { value: "create-worktree", label: "建立 Worktree" },
] as const;

export const ISSUE_STATUSES = [
  { value: "backlog", label: "積壓事項" },
  { value: "todo", label: "待辦事項" },
  { value: "in_progress", label: "進行中" },
  { value: "in_review", label: "稽核中" },
  { value: "blocked", label: "遇到阻礙" },
  { value: "done", label: "完成" },
  { value: "canceled", label: "已取消" },
] as const;

export const ISSUE_PRIORITIES = [
  { value: "none", label: "無優先順序" },
  { value: "urgent", label: "緊急" },
  { value: "high", label: "高" },
  { value: "medium", label: "中" },
  { value: "low", label: "低" },
] as const;

export const CONDITION_FIELDS = [
  {
    value: "issue-status",
    label: "議題狀態",
    operators: ["equals", "not-equals"],
    defaultOperator: "equals",
    defaultValue: "todo",
  },
  {
    value: "issue-priority",
    label: "議題優先順序",
    operators: ["equals", "not-equals"],
    defaultOperator: "equals",
    defaultValue: "none",
  },
  {
    value: "issue-labels",
    label: "議題標籤",
    operators: ["contains", "not-contains"],
    defaultOperator: "contains",
    defaultValue: "",
  },
  {
    value: "upstream-output",
    label: "上游節點輸出",
    operators: ["equals", "not-equals", "contains", "not-contains"],
    defaultOperator: "equals",
    defaultValue: "",
  },
] as const;

export const CONDITION_OPERATORS = [
  { value: "equals", label: "等於" },
  { value: "not-equals", label: "不等於" },
  { value: "contains", label: "包含" },
  { value: "not-contains", label: "不包含" },
] as const;

export const FEISHU_MESSAGE_RECIPIENTS = [
  { value: "self", label: "傳送給自己" },
  { value: "user", label: "傳送給特定使用者" },
  { value: "chat", label: "傳送到群聊" },
] as const;

export const CODE_RUNTIMES = [
  { value: "shell", label: "Shell" },
  { value: "javascript", label: "JavaScript" },
  { value: "python", label: "Python" },
] as const;

export const TEST_SCOPES = [
  { value: "related", label: "相關測試" },
  { value: "all", label: "全部測試" },
  { value: "custom", label: "自訂命令" },
] as const;

const FEISHU_LOGO = "https://p1-hera.feishucdn.com/tos-cn-i-jbbdkfciu3/84a9f036fe2b44f99b899fff4beeb963~tplv-jbbdkfciu3-image:0:0.image";
const GIT_LOGO = "https://git-scm.com/images/logos/downloads/Git-Icon-1788C.svg";

export const PALETTE_ITEMS: PaletteItem[] = [
  {
    group: "觸發器",
    title: "Issue",
    description: "當議題變化時啟動流程",
    data: {
      kind: "issue-trigger",
      eyebrow: "ISSUE TRIGGER",
      title: "議題觸發器",
      description: "當議題滿足條件時啟動",
      meta: "狀態、標籤或優先順序",
      icon: "myIssues",
      tone: "issue",
      outputLabel: "議題",
      triggerStatus: "todo",
    },
  },
  {
    group: "觸發器",
    title: "RSS 訂閱更新",
    description: "RSS 訂閱釋出新內容時啟動流程",
    data: {
      kind: "rss-trigger",
      eyebrow: "RSS TRIGGER",
      title: "RSS 訂閱更新",
      description: "指定的 RSS 訂閱釋出新內容時觸發",
      meta: "尚未設定 RSS 訂閱位址",
      icon: "recurrence",
      tone: "issue",
      outputLabel: "訂閱條目",
      rssFeedUrl: "",
    },
  },
  {
    group: "觸發器",
    title: "PR 提交",
    description: "目前專案儲存庫提交 PR 時啟動流程",
    data: {
      kind: "pull-request-submitted-trigger",
      eyebrow: "PR TRIGGER",
      title: "PR 提交",
      description: "目前專案儲存庫提交新的 Pull Request 時觸發",
      meta: "目前專案儲存庫 · Pull Request",
      icon: "branch",
      tone: "issue",
      outputLabel: "Pull Request",
    },
  },
  {
    group: "觸發器",
    title: "Issue 提交",
    description: "目前專案儲存庫提交 Issue 時啟動流程",
    data: {
      kind: "repository-issue-submitted-trigger",
      eyebrow: "ISSUE TRIGGER",
      title: "Issue 提交",
      description: "目前專案儲存庫提交新的 Issue 時觸發",
      meta: "目前專案儲存庫 · Issue",
      icon: "createIssue",
      tone: "issue",
      outputLabel: "Issue",
    },
  },
  {
    group: "觸發器",
    title: "Git 狀態",
    description: "目前專案的 Git 工作區狀態變化時啟動流程",
    data: {
      kind: "git-status-trigger",
      eyebrow: "GIT TRIGGER",
      title: "Git 狀態",
      description: "目前專案的 Git 工作區狀態發生變化時觸發",
      meta: "目前專案 · Git 工作區",
      icon: "branch",
      logo: GIT_LOGO,
      tone: "issue",
      outputLabel: "Git 狀態",
    },
  },
  {
    group: "流程控制",
    title: "條件判斷",
    description: "根據判斷結果進入對應路徑",
    data: {
      kind: "condition",
      eyebrow: "CONDITION",
      title: "條件判斷",
      description: "根據判斷結果進入對應路徑",
      meta: "設定一個判斷規則",
      icon: "filter",
      tone: "planning",
      inputLabel: "待判斷資料",
      outputLabel: "符合條件的資料",
      conditionField: "issue-status",
      conditionOperator: "equals",
      conditionValue: "todo",
    },
  },
  {
    group: "Skill 和 MCP",
    title: "Skill",
    description: "呼叫已安裝的 Skill",
    data: {
      kind: "skill",
      eyebrow: "SKILL",
      title: "呼叫 Skill",
      description: "執行工作區中的 Skill",
      meta: "選擇一個 Skill",
      icon: "file",
      tone: "capability",
      inputLabel: "上下文",
      outputLabel: "輸出",
    },
  },
  {
    group: "Skill 和 MCP",
    title: "MCP",
    description: "呼叫 MCP 工具或資源",
    data: {
      kind: "mcp",
      eyebrow: "MCP",
      title: "呼叫 MCP",
      description: "連線已設定的 MCP Server",
      meta: "選擇一個 MCP Server",
      icon: "panel",
      logo: mcpLogo,
      logoMonochrome: true,
      tone: "capability",
      inputLabel: "參數",
      outputLabel: "結果",
    },
  },
  {
    group: "API",
    title: "Nano Banana 生圖",
    description: "呼叫 Gemini 影象產生能力",
    data: {
      kind: "nano-banana",
      eyebrow: "IMAGE API",
      title: "Nano Banana 生圖",
      description: "根據提示詞和參考圖產生影象",
      meta: "Google Gemini · Image",
      icon: "send",
      logo: geminiLogo,
      tone: "api",
      inputLabel: "提示詞",
      outputLabel: "影象",
    },
  },
  {
    group: "API",
    title: "即夢生圖",
    description: "呼叫即夢 AI 圖片產生",
    data: {
      kind: "jimeng-image",
      eyebrow: "IMAGE API",
      title: "即夢生圖",
      description: "使用即夢模型產生圖片素材",
      meta: "即夢 AI · Image",
      icon: "send",
      logo: jimengLogo,
      tone: "api",
      inputLabel: "提示詞",
      outputLabel: "影象",
    },
  },
  {
    group: "API",
    title: "Midjourney 生圖",
    description: "提交 Midjourney 產生任務",
    data: {
      kind: "midjourney-image",
      eyebrow: "IMAGE API",
      title: "Midjourney 生圖",
      description: "透過 Midjourney 產生圖片素材",
      meta: "Midjourney · Image",
      icon: "send",
      logo: midjourneyLogo,
      logoMonochrome: true,
      tone: "api",
      inputLabel: "提示詞",
      outputLabel: "影象",
    },
  },
  {
    group: "API",
    title: "Seedance 2.0 生影片",
    description: "呼叫字節跳動影片產生模型",
    data: {
      kind: "seedance-video",
      eyebrow: "VIDEO API",
      title: "Seedance 2.0 生影片",
      description: "產生多模態音影片內容",
      meta: "ByteDance Seed · Video",
      icon: "send",
      logo: bytedanceLogo,
      tone: "api",
      inputLabel: "素材與提示詞",
      outputLabel: "影片",
    },
  },
  {
    group: "API",
    title: "可靈生影片",
    description: "呼叫可靈 AI 影片產生",
    data: {
      kind: "kling-video",
      eyebrow: "VIDEO API",
      title: "可靈生影片",
      description: "使用可靈模型產生影片素材",
      meta: "Kling AI · Video",
      icon: "send",
      logo: klingLogo,
      tone: "api",
      inputLabel: "素材與提示詞",
      outputLabel: "影片",
    },
  },
  {
    group: "API",
    title: "自訂 API 節點",
    description: "設定任意 HTTP API",
    data: {
      kind: "custom-api",
      eyebrow: "HTTP API",
      title: "自訂 API 節點",
      description: "呼叫自訂 HTTP 介面",
      meta: "GET、POST、PUT",
      icon: "send",
      tone: "api",
      inputLabel: "請求",
      outputLabel: "回應",
    },
  },
  {
    group: "第三方整合",
    title: "Git",
    description: "讀取儲存庫、分支與變更資訊",
    data: {
      kind: "git",
      eyebrow: "INTEGRATION",
      title: "Git",
      description: "讀取或操作目前專案的 Git 儲存庫",
      meta: "Git · Repository",
      icon: "branch",
      logo: GIT_LOGO,
      tone: "integration",
      inputLabel: "儲存庫與操作",
      outputLabel: "Git 結果",
      gitOperation: "commit",
      gitCommitMessage: "",
      gitStageAll: true,
      gitRemote: "origin",
      gitBranchName: "",
      gitBaseBranch: "",
      gitWorktreePath: "",
    },
  },
  {
    group: "第三方整合",
    title: "飛書文件",
    description: "讀取或寫入飛書雲文件",
    data: {
      kind: "feishu-docs",
      eyebrow: "INTEGRATION",
      title: "飛書文件",
      description: "連線飛書文件與知識空間",
      meta: "飛書開放平臺 · Docs",
      icon: "file",
      logo: FEISHU_LOGO,
      tone: "integration",
      inputLabel: "文件參數",
      outputLabel: "文件內容",
    },
  },
  {
    group: "第三方整合",
    title: "飛書訊息",
    description: "傳送訊息給自己、使用者或群聊",
    data: {
      kind: "feishu-message",
      eyebrow: "INTEGRATION",
      title: "飛書訊息",
      description: "透過飛書開放平臺傳送訊息",
      meta: "飛書開放平臺 · IM",
      icon: "conversation",
      logo: FEISHU_LOGO,
      tone: "integration",
      inputLabel: "訊息內容",
      outputLabel: "訊息傳送結果",
      feishuRecipientType: "self",
      feishuUserId: "",
      feishuChatId: "",
    },
  },
  {
    group: "第三方整合",
    title: "釋出到 Twitter",
    description: "將內容釋出到 Twitter",
    data: {
      kind: "twitter-post",
      eyebrow: "INTEGRATION",
      title: "釋出到 Twitter",
      description: "將指定內容釋出到 Twitter",
      meta: "尚未填寫釋出內容",
      icon: "send",
      logo: xLogo,
      logoMonochrome: true,
      tone: "integration",
      inputLabel: "釋出內容",
      outputLabel: "釋出結果",
      twitterPostContent: "",
    },
  },
  {
    group: "第三方整合",
    title: "OpenCLI",
    description: "呼叫網站介面卡和登入態瀏覽器",
    data: {
      kind: "opencli",
      eyebrow: "INTEGRATION",
      title: "OpenCLI",
      description: "透過 OpenCLI 操作網站與本機工具",
      meta: "OpenCLI · Browser",
      icon: "panel",
      tone: "integration",
      inputLabel: "命令",
      outputLabel: "執行結果",
    },
  },
  {
    group: "第三方整合",
    title: "Claude Design 設計",
    description: "呼叫 Claude 產生設計方案",
    data: {
      kind: "claude-design",
      eyebrow: "INTEGRATION",
      title: "Claude Design 設計",
      description: "使用 Claude 完成設計與實現",
      meta: "Claude · Design",
      icon: "write",
      logo: claudeLogo,
      tone: "integration",
      inputLabel: "設計需求",
      outputLabel: "設計結果",
    },
  },
  {
    group: "第三方整合",
    title: "Cloudflare 部署",
    description: "部署 Workers、Pages 等服務",
    data: {
      kind: "cloudflare-deploy",
      eyebrow: "DEPLOYMENT",
      title: "Cloudflare 部署",
      description: "建置並部署到 Cloudflare",
      meta: "Workers · Pages",
      icon: "send",
      logo: cloudflareLogo,
      tone: "integration",
      inputLabel: "建置產物",
      outputLabel: "部署位址",
    },
  },
  {
    group: "第三方整合",
    title: "Vercel 部署",
    description: "部署專案並回傳預覽網址",
    data: {
      kind: "vercel-deploy",
      eyebrow: "DEPLOYMENT",
      title: "Vercel 部署",
      description: "建置並部署到 Vercel",
      meta: "Preview · Production",
      icon: "send",
      logo: vercelLogo,
      logoMonochrome: true,
      tone: "integration",
      inputLabel: "建置產物",
      outputLabel: "部署位址",
    },
  },
  {
    group: "第三方整合",
    title: "自訂整合",
    description: "連線其他第三方服務",
    data: {
      kind: "custom-integration",
      eyebrow: "INTEGRATION",
      title: "自訂整合",
      description: "透過授權或 Webhook 連線服務",
      meta: "OAuth · Webhook",
      icon: "link",
      tone: "integration",
      inputLabel: "整合參數",
      outputLabel: "執行結果",
    },
  },
  {
    group: "開發",
    title: "自訂程式碼",
    description: "使用自訂指令碼處理流程資料",
    data: {
      kind: "custom-code",
      eyebrow: "CODE",
      title: "自訂程式碼",
      description: "在目前專案上下文中執行自訂程式碼",
      meta: "執行環境 · Shell",
      icon: "panel",
      tone: "development",
      inputLabel: "流程資料",
      outputLabel: "程式碼輸出",
      codeRuntime: "shell",
      codeContent: "",
    },
  },
  {
    group: "開發",
    title: "寫測試",
    description: "根據目前議題和專案上下文編寫測試",
    data: {
      kind: "write-tests",
      eyebrow: "TEST",
      title: "寫測試",
      description: "根據目前議題和專案上下文編寫測試",
      meta: "目前專案 · 測試",
      icon: "write",
      tone: "development",
      inputLabel: "任務上下文",
      outputLabel: "測試程式碼",
    },
  },
  {
    group: "開發",
    title: "執行測試",
    description: "執行相關測試、全部測試或自訂命令",
    data: {
      kind: "run-tests",
      eyebrow: "TEST",
      title: "執行測試",
      description: "在目前專案中執行測試",
      meta: "測試範圍 · 相關測試",
      icon: "check",
      tone: "development",
      inputLabel: "專案變更",
      outputLabel: "測試結果",
      testScope: "related",
      testCommand: "",
    },
  },
  {
    group: "規劃",
    title: "基礎規劃",
    description: "拆解步驟、依賴和驗收條件",
    data: {
      kind: "basic-planning",
      eyebrow: "PLANNING",
      title: "基礎規劃",
      description: "根據議題產生結構化執行計畫",
      meta: "內建規劃器",
      icon: "dashboard",
      tone: "planning",
      inputLabel: "任務上下文",
      outputLabel: "執行計畫",
      acceptsChildren: true,
    },
  },
  {
    group: "規劃",
    title: "Claude Code 規劃",
    description: "使用 Claude Code 產生計畫",
    data: {
      kind: "claude-code-planning",
      eyebrow: "PLANNING",
      title: "Claude Code 規劃",
      description: "讓 Claude Code 分析並規劃任務",
      meta: "Claude Code · Plan",
      icon: "dashboard",
      logo: claudeCodeLogo,
      tone: "planning",
      inputLabel: "任務上下文",
      outputLabel: "執行計畫",
      claudeModel: "claude-sonnet",
      reasoningEffort: "high",
      planningRequirements: "分析依賴、風險、執行步驟和驗收條件，輸出可直接執行的計畫。",
    },
  },
  {
    group: "規劃",
    title: "自訂規劃",
    description: "透過自訂提示詞產生計畫",
    data: {
      kind: "custom-planning",
      eyebrow: "PLANNING",
      title: "自訂規劃",
      description: "使用自訂規則拆解任務",
      meta: "Prompt · 自訂",
      icon: "write",
      tone: "planning",
      inputLabel: "任務上下文",
      outputLabel: "執行計畫",
    },
  },
  {
    group: "結果",
    title: "新增 ISSUE",
    description: "在目前專案中建立新議題",
    data: {
      kind: "issue-create",
      eyebrow: "ISSUE ACTION",
      title: "新增 ISSUE",
      description: "在目前流程所屬專案中建立議題",
      meta: "待填寫議題標題",
      icon: "createIssue",
      tone: "result",
      inputLabel: "流程上下文",
      outputLabel: "新議題",
      createIssueTitle: "",
      createIssueDescription: "",
      createIssueStatus: "todo",
      createIssuePriority: "none",
      createIssueLabels: "",
    },
  },
  {
    group: "結果",
    title: "更新 Issue",
    description: "回寫狀態、評論和附件",
    data: {
      kind: "issue-update",
      eyebrow: "ISSUE ACTION",
      title: "更新議題",
      description: "把流程結果寫回議題",
      meta: "狀態、評論或附件",
      icon: "write",
      tone: "result",
      inputLabel: "流程結果",
      outputLabel: "已更新",
      issueTarget: "trigger",
      specificIssueId: "",
      changeStatus: true,
      targetStatus: "in_review",
      addComment: true,
      commentSource: "workflow-output",
      customComment: "",
      addLabels: false,
      labelsToAdd: "",
      setPriority: false,
      targetPriority: "none",
      attachArtifacts: true,
      recordConversation: true,
    },
  },
  {
    group: "結果",
    title: "Codex 稽核",
    description: "由 Codex 稽核結果與變更",
    data: {
      kind: "codex-review",
      eyebrow: "REVIEW",
      title: "Codex 稽核",
      description: "檢查實現結果、測試與驗收條件",
      meta: "Codex · Review",
      icon: "check",
      logo: codexLogo,
      tone: "result",
      inputLabel: "執行結果",
      outputLabel: "稽核結論",
    },
  },
  {
    group: "結果",
    title: "Claude Code 稽核",
    description: "由 Claude Code 稽核結果與變更",
    data: {
      kind: "claude-code-review",
      eyebrow: "REVIEW",
      title: "Claude Code 稽核",
      description: "使用 Claude Code 複核實現結果",
      meta: "Claude Code · Review",
      icon: "check",
      logo: claudeCodeLogo,
      tone: "result",
      inputLabel: "執行結果",
      outputLabel: "稽核結論",
      claudeModel: "claude-sonnet",
      reasoningEffort: "high",
      planningRequirements: "對照執行計畫和驗收條件複核變更、測試結果與潛在迴歸。",
    },
  },
];

const WORKFLOW_NODE_DEFAULT_TEXT: Record<
  string,
  Partial<Record<"title" | "description", readonly string[]>>
> = {
  "basic-planning": {
    title: ["拆解議題執行計畫"],
    description: ["產生步驟、依賴和驗收條件"],
  },
  skill: { description: ["執行一個已安裝的 Skill"] },
  mcp: { description: ["連線一個已設定的 MCP Server"] },
  "nano-banana": {
    title: ["產生預覽素材"],
    description: ["根據議題內容產生預覽圖"],
  },
  "cloudflare-deploy": {
    title: ["部署預覽版本"],
    description: ["建置並發布專案預覽"],
  },
  "codex-review": {
    title: ["稽核交付結果"],
    description: ["檢查產物、測試與驗收條件"],
  },
  "issue-update": {
    title: ["提交稽核"],
    description: ["追加結果評論並更新狀態"],
  },
};

export function paletteData(kind: string): WorkflowNodeData {
  return PALETTE_ITEMS.find((item) => item.data.kind === kind)!.data;
}

export function optionLabel(
  options: readonly { value: string; label: string }[],
  value: string | undefined,
): string {
  return options.find((option) => option.value === value)?.label ?? "";
}

export function selectedCapabilityValue(
  options: readonly { id: string }[],
  value: string | undefined,
): string {
  return value && options.some((option) => option.id === value) ? value : "";
}

export function capabilityNodeMeta(
  data: WorkflowNodeData,
  capabilities: WorkflowCapabilities | null,
  failed: boolean,
  text: WorkflowText,
): string {
  if (data.kind === "issue-create") {
    const status = workflowOptionLabel(text, ISSUE_STATUSES, data.createIssueStatus ?? "todo");
    const priority = workflowOptionLabel(text, ISSUE_PRIORITIES, data.createIssuePriority ?? "none");
    return text(
      `初始狀態 · ${optionLabel(ISSUE_STATUSES, data.createIssueStatus ?? "todo")} · 優先順序 ${optionLabel(ISSUE_PRIORITIES, data.createIssuePriority ?? "none")}`,
      `Initial status · ${status} · Priority ${priority}`,
    );
  }
  if (data.kind === "rss-trigger") {
    const source = rssSourceLabel(data.rssFeedUrl);
    return source ? `RSS · ${source}` : text("尚未設定 RSS 訂閱位址", "RSS feed URL not set");
  }
  if (data.kind === "twitter-post") {
    const content = data.twitterPostContent?.trim();
    return content
      ? text(`釋出內容 · ${twitterPostSummary(content)}`, `Content · ${twitterPostSummary(content)}`)
      : text("尚未填寫釋出內容", "Content not set");
  }
  if (data.kind === "custom-code") {
    return text(
      `執行環境 · ${optionLabel(CODE_RUNTIMES, data.codeRuntime ?? "shell")}`,
      `Runtime · ${workflowOptionLabel(text, CODE_RUNTIMES, data.codeRuntime ?? "shell")}`,
    );
  }
  if (data.kind === "run-tests") {
    return text(
      `測試範圍 · ${optionLabel(TEST_SCOPES, data.testScope ?? "related")}`,
      `Test scope · ${workflowOptionLabel(text, TEST_SCOPES, data.testScope ?? "related")}`,
    );
  }
  if (data.kind === "skill") {
    if (!capabilities) return text("正在讀取可用 Skill", "Loading available skills");
    if (failed) return text("無法讀取可用 Skill", "Could not load available skills");
    const skill = capabilities.skills.find((option) => option.id === data.selectedSkill);
    if (skill) return `${skill.label} · Skill`;
    return data.selectedSkill
      ? text("所選 Skill 目前不可用", "Selected skill is unavailable")
      : text("尚未選擇 Skill", "No skill selected");
  }
  if (data.kind === "mcp") {
    if (!capabilities) return text("正在讀取可用 MCP Server", "Loading available MCP servers");
    if (failed) return text("無法讀取可用 MCP Server", "Could not load available MCP servers");
    const server = capabilities.mcpServers.find((option) => option.id === data.selectedMcpServer);
    if (server) return `${server.label} · ${server.transport}`;
    return data.selectedMcpServer
      ? text("所選 MCP Server 目前不可用", "Selected MCP server is unavailable")
      : text("尚未選擇 MCP Server", "No MCP server selected");
  }
  return workflowText(text, data.meta);
}

function workflowOptionLabel(
  text: WorkflowText,
  options: readonly { value: string; label: string }[],
  value: string | undefined,
): string {
  return workflowText(text, optionLabel(options, value));
}

function isWorkflowNodeDefaultText(
  data: WorkflowNodeData,
  field: "title" | "description",
  value: string,
): boolean {
  const catalogData = PALETTE_ITEMS.find((item) => item.data.kind === data.kind)?.data;
  if (!catalogData) return false;
  const templateValues = WORKFLOW_NODE_DEFAULT_TEXT[data.kind]?.[field] ?? [];
  return value === catalogData[field] || templateValues.includes(value);
}

export function workflowNodeSystemCopyDepth(data: WorkflowNodeData): number {
  if (data.systemCopyDepth !== undefined) return data.systemCopyDepth;
  const copySuffix = " 副本";
  let title = data.title;
  let copyDepth = 0;
  while (title.endsWith(copySuffix)) {
    title = title.slice(0, -copySuffix.length);
    copyDepth += 1;
  }
  return copyDepth;
}

function workflowNodeBaseDisplayTitle(data: WorkflowNodeData, text: WorkflowText): string {
  const copySuffix = " 副本";
  let baseTitle = data.title;
  let copyCount = 0;
  const systemCopyDepth = workflowNodeSystemCopyDepth(data);
  while (copyCount < systemCopyDepth && baseTitle.endsWith(copySuffix)) {
    baseTitle = baseTitle.slice(0, -copySuffix.length);
    copyCount += 1;
  }
  const displayTitle = isWorkflowNodeDefaultText(data, "title", baseTitle)
    ? workflowText(text, baseTitle)
    : baseTitle;
  return displayTitle + text(" 副本", " copy").repeat(copyCount);
}

export function workflowNodeDisplayDescription(
  data: WorkflowNodeData,
  text: WorkflowText,
): string {
  if (data.kind === "issue-trigger") {
    const statusValue = data.triggerStatus ?? "todo";
    const systemDescription = "狀態變為「" + optionLabel(ISSUE_STATUSES, statusValue) + "」時觸發";
    if (data.description === systemDescription) {
      const status = workflowOptionLabel(text, ISSUE_STATUSES, statusValue);
      return text(systemDescription, "Trigger when status changes to ‘" + status + "’");
    }
  }
  return isWorkflowNodeDefaultText(data, "description", data.description)
    ? workflowText(text, data.description)
    : data.description;
}

function formatActionTitle(title: string, actions: string[], text: WorkflowText): string {
  if (actions.length === 0) return title;
  const visibleActions = actions.slice(0, 2).join(text("、", ", "));
  const remaining = actions.length > 2 ? ` +${actions.length - 2}` : "";
  return `${title} · ${visibleActions}${remaining}`;
}

function rssSourceLabel(value: string | undefined): string {
  const feedUrl = value?.trim();
  if (!feedUrl) return "";
  return feedUrl.replace(/^https?:\/\//i, "").split(/[/?#]/)[0] || feedUrl;
}

function twitterPostSummary(value: string): string {
  const normalized = value.replace(/\s+/g, " ").trim();
  return normalized.length > 36 ? `${normalized.slice(0, 36)}…` : normalized;
}

export function workflowNodeDisplayTitle(data: WorkflowNodeData, text: WorkflowText): string {
  const displayTitle = workflowNodeBaseDisplayTitle(data, text);
  if (data.kind === "issue-create") {
    const issueTitle = data.createIssueTitle?.trim();
    return formatActionTitle(displayTitle, issueTitle ? [issueTitle] : [], text);
  }
  if (data.kind === "rss-trigger") {
    const source = rssSourceLabel(data.rssFeedUrl);
    return formatActionTitle(displayTitle, source ? [source] : [], text);
  }
  if (data.kind === "twitter-post") {
    const content = data.twitterPostContent?.trim();
    return formatActionTitle(displayTitle, content ? [twitterPostSummary(content)] : [], text);
  }
  if (data.kind === "condition") {
    const field = CONDITION_FIELDS.find(
      (option) => option.value === data.conditionField,
    ) ?? CONDITION_FIELDS[0];
    const operatorValue = field.operators.find(
      (value) => value === data.conditionOperator,
    ) ?? field.defaultOperator;
    const value = data.conditionValue || field.defaultValue;
    const valueLabel = field.value === "issue-status"
      ? workflowOptionLabel(text, ISSUE_STATUSES, value)
      : field.value === "issue-priority"
        ? workflowOptionLabel(text, ISSUE_PRIORITIES, value)
        : value;
    return formatActionTitle(displayTitle, [
      `${workflowText(text, field.label)} ${workflowOptionLabel(text, CONDITION_OPERATORS, operatorValue)} ${valueLabel || text("未設定", "Not set")}`,
    ], text);
  }
  if (data.kind === "feishu-message") {
    return formatActionTitle(displayTitle, [
      workflowOptionLabel(text, FEISHU_MESSAGE_RECIPIENTS, data.feishuRecipientType ?? "self"),
    ], text);
  }
  if (data.kind === "git") {
    return formatActionTitle(displayTitle, [
      workflowOptionLabel(text, GIT_OPERATIONS, data.gitOperation ?? "commit"),
    ], text);
  }
  if (data.kind === "custom-code") {
    return formatActionTitle(displayTitle, [
      workflowOptionLabel(text, CODE_RUNTIMES, data.codeRuntime ?? "shell"),
    ], text);
  }
  if (data.kind === "run-tests") {
    return formatActionTitle(displayTitle, [
      workflowOptionLabel(text, TEST_SCOPES, data.testScope ?? "related"),
    ], text);
  }
  if (data.kind === "issue-trigger") {
    const status = workflowOptionLabel(text, ISSUE_STATUSES, data.triggerStatus ?? "todo");
    return formatActionTitle(displayTitle, [text(`進入${status}`, `Moved to ${status}`)], text);
  }
  if (data.kind === "issue-update") {
    const actions = [
      data.changeStatus
        ? text(
            `狀態 → ${optionLabel(ISSUE_STATUSES, data.targetStatus ?? "in_review")}`,
            `Status → ${workflowOptionLabel(text, ISSUE_STATUSES, data.targetStatus ?? "in_review")}`,
          )
        : "",
      data.addComment ? text("新增評論", "Add comment") : "",
      data.addLabels ? text("新增標籤", "Add labels") : "",
      data.setPriority
        ? text(
            `優先順序 → ${optionLabel(ISSUE_PRIORITIES, data.targetPriority ?? "none")}`,
            `Priority → ${workflowOptionLabel(text, ISSUE_PRIORITIES, data.targetPriority ?? "none")}`,
          )
        : "",
      data.attachArtifacts ? text("附加產物", "Attach artifacts") : "",
      data.recordConversation ? text("記錄對話", "Record conversation") : "",
    ].filter(Boolean);
    return formatActionTitle(displayTitle, actions, text);
  }
  return displayTitle;
}

export function workflowNodeConfigured(
  data: WorkflowNodeData,
  capabilities: WorkflowCapabilities | null,
  failed: boolean,
): boolean {
  if (data.kind === "issue-create") {
    return Boolean(data.createIssueTitle?.trim());
  }
  if (data.kind === "rss-trigger") {
    return Boolean(data.rssFeedUrl?.trim());
  }
  if (data.kind === "twitter-post") {
    return Boolean(data.twitterPostContent?.trim());
  }
  if (data.kind === "condition") {
    const field = CONDITION_FIELDS.find(
      (option) => option.value === data.conditionField,
    ) ?? CONDITION_FIELDS[0];
    if (!field.operators.some((operator) => operator === data.conditionOperator)) return false;
    if (field.value === "issue-status") {
      return ISSUE_STATUSES.some((status) => status.value === data.conditionValue);
    }
    if (field.value === "issue-priority") {
      return ISSUE_PRIORITIES.some((priority) => priority.value === data.conditionValue);
    }
    return Boolean(data.conditionValue?.trim());
  }
  if (data.kind === "feishu-message") {
    if (data.feishuRecipientType === "user") return Boolean(data.feishuUserId?.trim());
    if (data.feishuRecipientType === "chat") return Boolean(data.feishuChatId?.trim());
    return true;
  }
  if (data.kind === "custom-code") {
    return Boolean(data.codeContent?.trim());
  }
  if (data.kind === "run-tests") {
    if (data.testScope === "custom") return Boolean(data.testCommand?.trim());
    return true;
  }
  if (data.kind === "skill") {
    return !failed
      && Boolean(data.selectedSkill)
      && Boolean(capabilities?.skills.some((item) => item.id === data.selectedSkill));
  }
  if (data.kind === "mcp") {
    return !failed
      && Boolean(data.selectedMcpServer)
      && Boolean(capabilities?.mcpServers.some((item) => item.id === data.selectedMcpServer));
  }
  if (data.kind === "issue-update") {
    return Boolean(
      data.changeStatus
      || data.addComment
      || data.addLabels
      || data.setPriority
      || data.attachArtifacts
      || data.recordConversation,
    );
  }
  return true;
}
