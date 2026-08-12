[English](README.md) | [繁體中文](README.zh-TW.md)

# Codex Taskboard

一個本機優先的議題面板，可在瀏覽器中執行，也可透過獨立 CDP 啟動器或其注入指令碼嵌入 Codex。同一套 HTTP API 同時供 React UI 與隨附 Codex Skill 使用的 `taskctl` CLI 存取。

![Codex Taskboard 產品截圖](docs/assets/codex-taskboard.png)

## 系統要求

- Node.js 22.5 或更高版本
- 建置 macOS App 和 DMG：Xcode Command Line Tools、Rust 1.88 或更高版本，以及 `aarch64-apple-darwin` 和 `x86_64-apple-darwin` target。`npm install` 會安裝本專案使用的 Tauri CLI。

## 在本機執行

```bash
npm install
npm run build
npm start
```

開啟 <http://127.0.0.1:47823>。SQLite 資料庫會儲存在 `.data/taskboard.sqlite`。

如需以前端即時重新載入模式開發：

```bash
npm run dev
```

Vite UI 會在 <http://127.0.0.1:5173> 執行，並將 API 請求代理至本機服務。

## 使用 CLI

在專案中執行：

```bash
npm run taskctl -- project create \
  --id my-project \
  --name "My project" \
  --workspace-path /absolute/path/to/repository

npm run taskctl -- issue create \
  --project my-project \
  --title "Implement the next slice" \
  --status todo \
  --priority high \
  --labels product,mvp
```

請執行 `npm link`，以便直接從 shell 使用 `taskctl`。設定 `CODEX_TASKBOARD_URL` 可讓 CLI 指向其他本機或區域網路服務。雲端部署則透過**回送 companion**（裝置本機的 loopback 配套服務，不是聊天角色）使用 `taskctl cloud login` 設定。

## 安裝 Codex Skill

將 `skills/manage-taskboard` 複製或符號連結到 Codex Skill 目錄，然後啟動一個新的 Codex 任務：

```bash
ln -s /absolute/path/to/codex-taskboard/skills/manage-taskboard \
  ~/.codex/skills/manage-taskboard
```

該 Skill 會指導 Codex 檢查議題，將其移到 `in_progress`，使用樂觀版本控制，驗證工作，然後將其移到 `in_review`；只有在使用者明確確認接受或要求將議題標記為完成後，才會將議題移到 `done`。

## 嵌入 Codex

### 手動：使用專用 CDP 埠

讓現有 Codex 視窗保持開啟。在 Taskboard 儲存庫中，使用專用 CDP 埠啟動第二個 Codex 執行個體：

```bash
open -n -a /Applications/ChatGPT.app --args \
  --remote-debugging-port=9231 \
  --remote-allow-origins=http://127.0.0.1:9231
```

新 Codex 視窗出現後，在另一個終端中執行注入器：

```bash
CODEX_TASKBOARD_HOST=127.0.0.1 \
npm run codex:inject -- --port 9231 --open
```

使用嵌入式面板時，讓注入器終端保持執行。原 Codex 視窗不會變化，新視窗會顯示 Taskboard 側邊欄入口。如果埠 `9231` 已被佔用，請在兩個命令中使用另一個埠。

### 推薦：用一個命令啟動獨立 Taskboard 視窗

讓現有 Codex 視窗保持開啟，然後執行：

```bash
CODEX_TASKBOARD_HOST=127.0.0.1 npm run codex
```

該命令會視需要啟動本機 Taskboard 服務，使用獨立設定檔與僅允許本機回送位址存取的連接埠 `9231` 啟動官方 macOS Codex App，等待主渲染器與側邊欄就緒，在 Plugins 後方注入一個具有原生外觀的 Taskboard 入口，並持續監控服務與替換後的渲染器。現有 Codex 視窗不會改變。使用嵌入式面板時，請讓該命令持續執行。啟動器不會修改 `ChatGPT.app` 或其 `app.asar`。

原始碼啟動器會將帶有身分資訊的服務位址寫入 `.data/launcher-runtime.json`。透過 `npm link` 安裝的 `taskctl` 預設會讀取此檔案，因此一般 shell 與從面板開啟的 Codex 任務不必另設環境變數，即可共用同一個 Taskboard 服務。

### macOS App：無需終端即可開啟和注入

如需進行 Tauri 開發，請執行：

```bash
npm run app:dev
```

如需建置本機 App 和 DMG，請先安裝兩個 Rust target，再執行建置：

```bash
rustup target add aarch64-apple-darwin x86_64-apple-darwin
npm run app:build
```

從 Finder 開啟 `src-tauri/target/universal-apple-darwin/release/bundle/macos/Codex Taskboard.app`。DMG 位於 `src-tauri/target/universal-apple-darwin/release/bundle/dmg/`。若只需要穩定版，請從 [GitHub Releases](https://github.com/chuspeeism/dashi-taskboard/releases/latest) 下載目前的 DMG。

該 App 包含自己的 Node 執行環境、Taskboard 服務、建置後的 Web UI、Skill、CLI 包裝器與注入指令碼。它會啟動服務與官方 Codex App、等待渲染器就緒、注入側邊欄入口，並在不顯示終端機視窗的情況下開啟面板。該 App 可以複製到目前檢出目錄之外；目標 Mac 只需安裝官方 Codex App，不需要此儲存庫、系統 Node 或獨立的 Codex CLI。Taskboard 資料會儲存在 `~/Library/Application Support/Codex Taskboard`，啟動器輸出則寫入 `~/Library/Logs/Codex Taskboard/codex-taskboard-launcher.log`。

本機建置使用 ad-hoc 程式碼簽章進行直接驗證。公開的 macOS 下載仍需要 Developer ID 簽章與 Apple 公證。

Codex 26.715.52143 的渲染器 CSP 會阻擋任意 HTTP iframe。因此，啟動器會啟用 CDP CSP 繞過、重新載入該渲染器一次、安裝 `document-start` 指令碼，並等待 Taskboard OOPIF 實際載入。同一台機器上的其他程式存取 CDP 時不需要身分驗證，因此啟動器執行期間只能執行受信任的原生程式碼。

要注入一個已經透過其他方式使用 CDP 啟動的 Codex 執行個體，請執行：

```bash
npm run codex:inject -- --port 9229 --open
```

該命令也會保持駐留，因此服務退出後，注入的標籤頁可以重新啟動 Taskboard。使用 `Ctrl-C` 停止該命令。

該指令碼會在 Codex 側邊欄新增 Taskboard 入口，並在 Codex 的整個主工作區（包含上下文標題列區域）渲染 iframe，因此 Taskboard 的頁首不會留下空白。完整的矩形頁首位於 Electron 可拖曳層之上，並標記為 `no-drag`；Taskboard 啟用時會隱藏原生上下文操作，因此它自己的操作可使用正常邊緣內距，不會產生多餘的右側空隙。原生側邊欄會保持掛載，原頁面的選取狀態與上下文頁首則暫時隱藏；選擇其他 Codex 頁面後便會恢復。

「在對話中開啟」會在可用時選擇對應的原生 Codex 專案，並開啟一個尚未傳送的原生 composer，其中包含 `e-taskboard` 指令與議題的實際識別碼。已安裝的 Skill 會根據該指令自動選用，因此 composer 不會額外加入 `$manage-taskboard`。只有在工作階段實際處理該議題後，系統才會記錄工作階段的歸屬關係：`taskctl` 會讀取 Codex 的 `CODEX_THREAD_ID`，並在議題或留言變更上記錄該 ID。記錄的 ID 可透過 Codex 的原生路由橋接點選。每個議題可以綁定一個 Git 分支或 worktree；選項會從所選 Codex 專案的儲存庫掃描，不必手動輸入。此整合使用 Codex 現有的專案、composer 與路由標記；不會修改 React、替換 `fetch`、載入私有 chunk 或編輯 Codex 資料檔案。

要使用不同的 UI 來源，請在使用者指令碼執行前設定 `window.__CODEX_TASKBOARD_URL__`。

## 設定

| 變數 | 預設值 | 用途 |
| --- | --- | --- |
| `CODEX_TASKBOARD_HOST` | `0.0.0.0` | HTTP 綁定位址；使用 `127.0.0.1` 可停用區域網路存取 |
| `CODEX_TASKBOARD_PORT` | `47823` | 本機 HTTP 連接埠 |
| `CODEX_TASKBOARD_DATA_DIR` | `.data` | SQLite 資料目錄 |
| `CODEX_TASKBOARD_URL` | `http://127.0.0.1:47823` | CLI API 來源網址 |

`npm start` 會輸出本機 URL 與可用的區域網路 URL。同一受信任網路中的協作者可以開啟其中一個區域網路 URL，共用同一個 Taskboard 服務。任務、留言與附件的變更會透過伺服器傳送事件，廣播給所有已開啟的用戶端；用戶端重新連線後會完整重新整理，因此不會遺漏斷線期間發生的變更。使用 `taskctl` 的協作者可以透過 `CODEX_TASKBOARD_URL=http://<host-ip>:47823` 指向共享服務。

區域網路模式未提供帳戶身分驗證：受信任本機網路中任何可存取該 URL 的人都能讀寫 Taskboard。公開網路與雲端部署則需要具備身分驗證的部署邊界。

## 透過 Cloudflare 共享

若有兩名受信任的協作者，Taskboard 可部署至 Cloudflare，使用 Worker Static Assets 與 API 路由、以 D1 作為權威業務資料庫，並透過私有 R2 bucket 儲存附件。此部署使用帶有共用密碼的 HTTPS Basic 身分驗證，並在全域修訂編號變更後重新整理已開啟的面板。

每台裝置各自保留專案檢出路徑的對應關係，並繼續使用**本機 companion**（本機配套服務／回送代理）提供 Codex、Git/worktree、Skill 與 MCP 能力。請勿將 companion 翻成「伴侶」，也不要把一般 Taskboard HTTP 介面稱為「伴侶 API」。雲端模式不會退回本機 SQLite 資料庫，也不會同時寫入本機資料庫。

請參閱[雲端協作](docs/cloud-collaboration.md)，了解擁有者部署、現有 GitHub 安裝設定、密碼輪替、本機路徑對應與一次性本機資料遷移流程。

## 驗證

```bash
npm run check
```

該命令會執行 TypeScript 檢查、正式版前端建置，以及伺服器、CLI 與注入測試套件。
