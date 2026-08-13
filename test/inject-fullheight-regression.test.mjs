import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { createHmac } from "node:crypto";
import { access, mkdtemp, readFile, rm } from "node:fs/promises";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const projectRoot = fileURLToPath(new URL("..", import.meta.url));
const instanceToken = "7a6f8d37-78ce-46c9-87a8-08e10db88da2";
const instanceSecret = "2e587946-96d6-47b5-930a-1ba70214fa88";
const sourceRef = process.env.TASKBOARD_INJECTION_SOURCE_REF;
const source = sourceRef
  ? (await execFileAsync(
      "git",
      ["show", `${sourceRef}:inject/codex-taskboard.user.js`],
      { cwd: projectRoot, maxBuffer: 2 * 1024 * 1024 },
    )).stdout
  : await readFile(new URL("../inject/codex-taskboard.user.js", import.meta.url), "utf8");
const embeddedHostSource = await readFile(
  new URL("../web/src/embeddedHost.mjs", import.meta.url),
  "utf8",
);
const embeddedHostClassicSource = embeddedHostSource.replaceAll("export ", "");

function taskboardFrameHtml() {
  return `<!doctype html>
<html>
  <body>
    <a id="external-link" href="https://example.com/review" target="_blank">Review</a>
    <script>
      ${embeddedHostClassicSource}
      installEmbeddedExternalLinkHandler();
      let activated = false;
      let acknowledgedChallenge = "";
      window.addEventListener("message", (event) => {
        if (event.data?.type !== "taskboard:frame-challenge") return;
        const challenge = event.data.payload?.challenge;
        if (!challenge || challenge === acknowledgedChallenge) return;
        acknowledgedChallenge = challenge;
        setEmbeddedFrameChallenge(challenge);
        postEmbeddedHostMessage({ type: "taskboard:ready" });
        if (activated) return;
        activated = true;
        parent.postMessage({ type: "taskboard:ready" }, "*");
        parent.postMessage({ type: "taskboard:open-thread", payload: { threadId: "forged" } }, "*");
        document.getElementById("external-link").click();
      });
      postEmbeddedHostMessage({ type: "taskboard:frame-awaiting-challenge" });
    <\/script>
  </body>
</html>`;
}

async function chromeExecutable() {
  const candidates = [
    process.env.CHROME_PATH,
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Chromium.app/Contents/MacOS/Chromium",
    "/usr/bin/google-chrome",
    "/usr/bin/google-chrome-stable",
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser",
  ].filter(Boolean);
  for (const candidate of candidates) {
    try {
      await access(candidate);
      return candidate;
    } catch (_) {}
  }
  return null;
}

function fixtureHtml(origin) {
  const encodedSource = Buffer.from(source).toString("base64");
  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8">
    <style>
      html, body { width: 1200px; height: 800px; margin: 0; }
      aside { position: absolute; width: 200px; height: 800px; }
      main { position: absolute; left: 200px; width: 1000px; height: 700px; }
      main > header { position: absolute; z-index: 2; width: 1000px; height: 48px; }
      #surface { width: 1000px; height: 700px; }
      [data-app-shell-main-content-layout] { position: absolute; width: 1000px; height: 700px; }
      #conversation { position: absolute; top: 48px; width: 1000px; height: 652px; }
      [data-browser-sidebar-webview] { position: absolute; right: 0; width: 320px; height: 700px; visibility: visible; }
    </style>
  </head>
  <body>
    <aside>
      <nav role="navigation">
        <div data-app-action-sidebar-scroll>
          <div>
            <button><span>首頁</span></button>
            <button><span>站點</span></button>
            <button><svg></svg><span class="text-fade-truncate">外掛</span></button>
          </div>
          <section data-app-action-sidebar-section>
            <div data-app-action-sidebar-section-heading="專案">專案</div>
          </section>
        </div>
      </nav>
    </aside>
    <main>
      <header>Codex header</header>
      <div id="surface">
        <div data-app-shell-main-content-layout>
          <div id="conversation">Conversation</div>
        </div>
      </div>
      <div data-browser-sidebar-webview>
        <webview
          data-browser-sidebar-conversation-id="conversation-1"
          data-browser-sidebar-browser-tab-id="browser-tab-1"
        ></webview>
      </div>
    </main>
    <output id="result"></output>
    <script>
      window.__CODEX_TASKBOARD_URL__ = ${JSON.stringify(`${origin}/taskboard?host=codex`)};
      window.__CODEX_TASKBOARD_INSTANCE_TOKEN__ = ${JSON.stringify(instanceToken)};
      window.__CODEX_TASKBOARD_INSTANCE_SECRET__ = ${JSON.stringify(instanceSecret)};
      window.__CODEX_TASKBOARD_HOST_CAPABILITY__ = "fullheight-host-capability";
      window.__CODEX_TASKBOARD_SOURCE_HASH__ = "fullheight-regression";
      window.__browserPanelClosed = false;
      window.__injectionError = null;
      window.__frameMessages = [];
      window.__externalOpenUrl = null;
      window.__frameVisibleBeforeNavigation = false;
      window.__statusHiddenBeforeNavigation = false;
      window.__hostileNavigationLoaded = false;
      window.__forgedThreadOpened = false;
      window.addEventListener("error", (event) => {
        window.__injectionError = event.error?.stack || event.message;
      });
      window.addEventListener("unhandledrejection", (event) => {
        window.__injectionError = event.reason?.stack || String(event.reason);
      });
      window.addEventListener("message", (event) => {
        if (typeof event.data?.type === "string" && event.data.type.startsWith("taskboard:")) {
          const taskboardOrigin = new URL(window.__CODEX_TASKBOARD_URL__).origin;
          window.__frameMessages.push({
            type: event.data.type,
            origin: event.origin === taskboardOrigin ? "taskboard" : event.origin,
          });
        }
        if (
          event.source === window
          && event.data?.type === "__codexTaskboardHostRequestV1"
          && event.data.capability === "fullheight-host-capability"
        ) {
          const request = event.data.payload;
          if (request.action === "load-frame") {
            const frameUrl = new URL(window.__CODEX_TASKBOARD_URL__);
            frameUrl.hash = new URLSearchParams({
              "codex-frame-capability": request.frameCapability,
            }).toString();
            request.frameUrl = frameUrl.href;
          }
          if (request.action === "open-external") {
            window.__externalOpenUrl = request.url;
            const frame = document.getElementById("codex-taskboard-frame");
            window.__frameVisibleBeforeNavigation = frame?.hidden === false;
            window.__statusHiddenBeforeNavigation = document.getElementById("codex-taskboard-status")?.hidden === true;
            setTimeout(() => {
              frame?.addEventListener("load", () => {
                window.__hostileNavigationLoaded = true;
                window.__resolveHostileNavigationLoaded();
              }, { once: true });
              frame.removeAttribute("srcdoc");
              frame.src = ${JSON.stringify(`${origin}/attacker`)};
            }, 0);
          }
          window.postMessage({
            type: "__codexTaskboardHostResponseV1",
            capability: "fullheight-host-capability",
            response: {
              id: request.id,
              ok: true,
              loaded: true,
              ...(request.frameUrl ? { frameUrl: request.frameUrl } : {}),
            },
          }, window.location.origin);
        }
        if (event.source === window && event.data?.type === "navigate-to-route") {
          window.__forgedThreadOpened = true;
        }
        if (event.data?.type !== "toggle-browser-panel" || event.data.open !== false) return;
        const panel = document.querySelector("[data-browser-sidebar-webview]");
        panel.style.visibility = "hidden";
        panel.hidden = true;
        const conversation = document.getElementById("conversation");
        conversation.style.top = "0";
        conversation.style.height = "700px";
        window.__browserPanelClosed = true;
      });
    </script>
    <script>eval(atob(${JSON.stringify(encodedSource)}));</script>
    <script>
      (async () => {
        const publishHeartbeat = () => window.postMessage({
            type: "__codexTaskboardHostHeartbeatV1",
            capability: "fullheight-host-capability",
            at: Date.now(),
            startupToken: "fullheight-startup",
          }, window.location.origin);
        publishHeartbeat();
        const heartbeatTimer = setInterval(publishHeartbeat, 500);
        await new Promise((resolve) => setTimeout(resolve, 0));
        const entry = document.getElementById("codex-taskboard-entry");
        const panel = document.querySelector("[data-browser-sidebar-webview]");
        const panelVisibleBefore = getComputedStyle(panel).visibility !== "hidden";
        const hostileNavigationLoaded = new Promise((resolve) => {
          window.__resolveHostileNavigationLoaded = resolve;
        });
        entry?.click();
        const hostileNavigationTimedOut = await Promise.race([
          hostileNavigationLoaded.then(() => false),
          new Promise((resolve) => setTimeout(() => resolve(true), 3_000)),
        ]);

        const page = document.getElementById("codex-taskboard-page");
        const frame = document.getElementById("codex-taskboard-frame");
        const surface = document.getElementById("surface");
        const conversation = document.getElementById("conversation");
        const result = {
          panelVisibleBefore,
          browserPanelClosed: window.__browserPanelClosed,
          conversationTop: conversation.getBoundingClientRect().top,
          pageMounted: page?.parentElement === surface,
          pageVisible: Boolean(page && !page.hidden && getComputedStyle(page).display !== "none"),
          frameMounted: frame?.parentElement === page,
          frameVisible: Boolean(frame && !frame.hidden && getComputedStyle(frame).display !== "none"),
          frameIsolated: frame?.contentDocument === null,
          statusHidden: document.getElementById("codex-taskboard-status")?.hidden === true,
          frameMessages: window.__frameMessages,
          externalOpenUrl: window.__externalOpenUrl,
          frameVisibleBeforeNavigation: window.__frameVisibleBeforeNavigation,
          statusHiddenBeforeNavigation: window.__statusHiddenBeforeNavigation,
          hostileNavigationRevoked: Boolean(frame?.hidden && !document.getElementById("codex-taskboard-status")?.hidden),
          forgedThreadOpened: window.__forgedThreadOpened,
          hostileNavigationTimedOut,
          injectionError: window.__injectionError,
        };
        document.getElementById("result").textContent = btoa(JSON.stringify(result));
        clearInterval(heartbeatTimer);
        window.__codexTaskboardInjection__?.destroy();
      })();
    </script>
  </body>
</html>`;
}

test("Taskboard fills the workspace, opens HTTPS links and revokes hostile iframe navigation", async (t) => {
  const chrome = await chromeExecutable();
  if (!chrome) {
    t.skip("Chrome or Chromium is not installed");
    return;
  }

  const taskboardServer = http.createServer((request, response) => {
    response.setHeader("connection", "close");
    if (request.url === "/attacker") {
      response.setHeader("content-type", "text/html; charset=utf-8");
      response.end("<!doctype html><title>attacker</title>");
      return;
    }
    if (request.url?.startsWith("/taskboard")) {
      const challenge = new URL(request.url, "http://127.0.0.1")
        .searchParams.get("__codex_taskboard_challenge");
      if (challenge) {
        response.setHeader(
          "x-codex-taskboard-proof",
          createHmac("sha256", instanceSecret).update(challenge).digest("hex"),
        );
      }
      response.setHeader("content-type", "text/html; charset=utf-8");
      response.end(taskboardFrameHtml());
      return;
    }
    response.statusCode = 404;
    response.end();
  });
  await new Promise((resolve) => taskboardServer.listen(0, "127.0.0.1", resolve));
  const taskboardOrigin = `http://127.0.0.1:${taskboardServer.address().port}`;
  const fixtureServer = http.createServer((_request, response) => {
    response.setHeader("connection", "close");
    response.setHeader("content-type", "text/html; charset=utf-8");
    response.end(fixtureHtml(taskboardOrigin));
  });
  await new Promise((resolve) => fixtureServer.listen(0, "127.0.0.1", resolve));
  t.after(() => new Promise((resolve) => {
    fixtureServer.close(resolve);
    fixtureServer.closeAllConnections();
  }));
  t.after(() => new Promise((resolve) => {
    taskboardServer.close(resolve);
    taskboardServer.closeAllConnections();
  }));

  const profile = await mkdtemp(path.join(os.tmpdir(), "taskboard-fullheight-chrome-"));
  t.after(() => rm(profile, { recursive: true, force: true }));
  const url = `http://127.0.0.1:${fixtureServer.address().port}/fixture`;
  let stdout;
  try {
    ({ stdout } = await execFileAsync(chrome, [
      "--headless=new",
      "--disable-gpu",
      "--no-sandbox",
      `--user-data-dir=${profile}`,
      "--virtual-time-budget=12000",
      "--dump-dom",
      url,
    ], { maxBuffer: 5 * 1024 * 1024, timeout: 20_000 }));
  } catch (error) {
    if (!String(error?.stdout ?? "").trim()) {
      t.skip("Chrome or Chromium cannot run headless dump-dom in this environment");
      return;
    }
    throw error;
  }
  if (!stdout.trim()) {
    t.skip("Chrome or Chromium cannot run headless dump-dom in this environment");
    return;
  }

  const encodedResult = stdout.match(/<output id="result">([^<]+)<\/output>/)?.[1];
  assert.ok(encodedResult, "fixture did not report an injection result");
  const result = JSON.parse(Buffer.from(encodedResult, "base64").toString("utf8"));
  assert.deepEqual(result, {
    panelVisibleBefore: true,
    browserPanelClosed: true,
    conversationTop: 0,
    pageMounted: true,
    pageVisible: true,
    frameMounted: true,
    frameVisible: false,
    frameIsolated: true,
    statusHidden: false,
    frameMessages: [
      { type: "taskboard:frame-awaiting-challenge", origin: "taskboard" },
      { type: "taskboard:ready", origin: "taskboard" },
      { type: "taskboard:ready", origin: "taskboard" },
      { type: "taskboard:open-thread", origin: "taskboard" },
      { type: "taskboard:open-external", origin: "taskboard" },
    ],
    externalOpenUrl: "https://example.com/review",
    frameVisibleBeforeNavigation: true,
    statusHiddenBeforeNavigation: true,
    hostileNavigationRevoked: true,
    forgedThreadOpened: false,
    hostileNavigationTimedOut: false,
    injectionError: null,
  });
});
