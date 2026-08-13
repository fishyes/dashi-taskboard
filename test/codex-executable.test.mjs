import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { resolveCodexExecutable } from "../shared/codex-executable.mjs";
import { executableCommand } from "../shared/executable-command.mjs";

test("an explicit Codex executable remains the highest-priority choice", () => {
  assert.equal(resolveCodexExecutable({ explicit: " C:\\tools\\codex.exe " }), "C:\\tools\\codex.exe");
});

test("Windows npm installs resolve to the native codex.exe instead of a shim", {
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

test("Windows PATH resolves the npm Codex shim to its Node entry", {
  skip: process.platform !== "win32",
}, async (context) => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "codex-executable-test-"));
  context.after(() => rm(directory, { force: true, recursive: true }));
  const npmEntry = path.join(
    directory,
    "node_modules",
    "@openai",
    "codex",
    "bin",
    "codex.js",
  );
  await mkdir(path.dirname(npmEntry), { recursive: true });
  await Promise.all([
    writeFile(path.join(directory, "codex"), "#!/bin/sh\n"),
    writeFile(path.join(directory, "codex.cmd"), "@echo off\r\n"),
    writeFile(npmEntry, ""),
  ]);

  const executable = resolveCodexExecutable({
    explicit: "",
    env: { PATH: directory },
    platform: "win32",
  });
  assert.equal(executable, npmEntry);
  assert.deepEqual(executableCommand(executable, ["debug", "models"]), {
    executable: process.execPath,
    args: [npmEntry, "debug", "models"],
  });
});
