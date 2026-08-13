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

function executableOnPath(env, platform) {
  for (const directory of (env.PATH || "").split(path.delimiter)) {
    if (!directory) continue;
    if (platform === "win32") {
      const nativeExecutable = executableFile(path.join(directory, "codex.exe"));
      if (nativeExecutable) return nativeExecutable;

      const npmEntry = executableFile(path.join(
        directory,
        "node_modules",
        "@openai",
        "codex",
        "bin",
        "codex.js",
      ));
      if (npmEntry) return npmEntry;
      continue;
    }

    const executable = executableFile(path.join(directory, "codex"));
    if (executable) return executable;
  }
  return null;
}

function codexExecutableInWindowsNpm(env, platform = process.platform, architecture = process.arch) {
  if (platform !== "win32") return null;

  const packageArch = architecture === "arm64" ? "arm64" : "x64";
  const rustTarget = architecture === "arm64"
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

export function codexExecutableInApp(appPath, platform = process.platform) {
  if (platform === "win32") {
    return path.win32.join(path.win32.dirname(appPath), "resources", "codex.exe");
  }
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
    const bundled = executableFile(codexExecutableInApp(appPath, platform));
    if (bundled) return bundled;
  }

  const windowsNpmCli = codexExecutableInWindowsNpm(env, platform);
  if (windowsNpmCli) return windowsNpmCli;

  const installedCli = executableOnPath(env, platform);
  if (installedCli) return installedCli;

  if (platform === "darwin") {
    for (const applicationDirectory of ["/Applications", path.join(homeDirectory, "Applications")]) {
      for (const applicationName of ["ChatGPT.app", "Codex.app"]) {
        const bundled = executableFile(codexExecutableInApp(
          path.join(applicationDirectory, applicationName),
          platform,
        ));
        if (bundled) return bundled;
      }
    }
  }

  return platform === "win32" ? "codex.exe" : "codex";
}
