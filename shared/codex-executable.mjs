import { accessSync, constants } from "node:fs";
import os from "node:os";
import path from "node:path";

function executableFile(candidate) {
  try {
    accessSync(candidate, constants.X_OK);
    return candidate;
  } catch {
    return null;
  }
}

function executableOnPath(env) {
  for (const directory of (env.PATH || "").split(path.delimiter)) {
    if (!directory) continue;
    const executableName = process.platform === "win32" ? "codex.exe" : "codex";
    const candidate = executableFile(path.join(directory, executableName));
    if (candidate) return candidate;
  }
  return null;
}

function codexExecutableInWindowsNpm(env) {
  if (process.platform !== "win32") return null;

  const packageArch = process.arch === "arm64" ? "arm64" : "x64";
  const rustTarget = process.arch === "arm64"
    ? "aarch64-pc-windows-msvc"
    : "x86_64-pc-windows-msvc";
  const prefixes = [
    env.npm_config_prefix,
    env.APPDATA && path.join(env.APPDATA, "npm"),
    ...(env.PATH || "").split(path.delimiter),
  ];

  for (const prefix of new Set(prefixes.filter(Boolean))) {
    const candidate = executableFile(path.join(
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
    ));
    if (candidate) return candidate;
  }
  return null;
}

export function codexExecutableInApp(appPath) {
  return path.join(appPath, "Contents", "Resources", "codex");
}

export function resolveCodexExecutable({
  explicit = process.env.CODEX_EXECUTABLE,
  appPath,
  env = process.env,
  platform = process.platform,
  homeDirectory = os.homedir(),
} = {}) {
  if (typeof explicit === "string" && explicit.trim()) return explicit.trim();

  if (appPath) {
    const bundled = executableFile(codexExecutableInApp(appPath));
    if (bundled) return bundled;
  }

  const windowsNpmCli = codexExecutableInWindowsNpm(env);
  if (windowsNpmCli) return windowsNpmCli;

  const installedCli = executableOnPath(env);
  if (installedCli) return installedCli;

  if (platform === "darwin") {
    for (const applicationDirectory of ["/Applications", path.join(homeDirectory, "Applications")]) {
      for (const applicationName of ["ChatGPT.app", "Codex.app"]) {
        const bundled = executableFile(codexExecutableInApp(
          path.join(applicationDirectory, applicationName),
        ));
        if (bundled) return bundled;
      }
    }
  }

  return platform === "win32" ? "codex.exe" : "codex";
}
