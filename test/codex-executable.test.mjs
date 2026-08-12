import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";

import { resolveCodexExecutable } from "../shared/codex-executable.mjs";

test("an explicit Codex executable remains the highest-priority choice", () => {
  assert.equal(resolveCodexExecutable({ explicit: " C:\\tools\\codex.exe " }), "C:\\tools\\codex.exe");
});

test("Windows npm installs resolve to the native codex.exe instead of the extensionless shim", {
  skip: process.platform !== "win32",
}, async (context) => {
  const prefix = await mkdtemp(path.join(os.tmpdir(), "taskboard-codex-executable-"));
  context.after(() => rm(prefix, { recursive: true, force: true }));
  const packageArch = process.arch === "arm64" ? "arm64" : "x64";
  const rustTarget = process.arch === "arm64"
    ? "aarch64-pc-windows-msvc"
    : "x86_64-pc-windows-msvc";
  const expected = path.join(
    prefix,
    "node_modules",
    "@openai",
    "codex",
    "node_modules",
    "@openai",
    `codex-win32-${packageArch}`,
    "vendor",
    rustTarget,
    "bin",
    "codex.exe",
  );
  await mkdir(path.dirname(expected), { recursive: true });
  await writeFile(expected, "");

  assert.equal(resolveCodexExecutable({
    explicit: "",
    env: { npm_config_prefix: prefix, PATH: "" },
    platform: "win32",
    homeDirectory: prefix,
  }), expected);
});
