import { spawn } from "node:child_process";

const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";
const inheritedEnv = {
  ...process.env,
  E2E_AUTH_BYPASS: process.env.E2E_AUTH_BYPASS ?? "true",
};

let activeChild = null;
let shuttingDown = false;

function waitForExit(child) {
  return new Promise((resolve, reject) => {
    child.once("error", reject);
    child.once("exit", (code, signal) => {
      resolve({ code, signal });
    });
  });
}

function spawnNpm(args) {
  const child =
    process.platform === "win32"
      ? spawn(
          process.env.ComSpec ?? "cmd.exe",
          [
            "/d",
            "/s",
            "/c",
            `${npmCommand} ${args.join(" ")}`,
          ],
          {
            cwd: process.cwd(),
            env: inheritedEnv,
            stdio: "inherit",
          }
        )
      : spawn(npmCommand, args, {
          cwd: process.cwd(),
          env: inheritedEnv,
          stdio: "inherit",
        });
  activeChild = child;
  return child;
}

async function terminateActiveChild(signal) {
  if (!activeChild || activeChild.killed) {
    return;
  }

  activeChild.kill(signal);
  await waitForExit(activeChild).catch(() => {});
}

async function handleShutdown(signal) {
  if (shuttingDown) {
    return;
  }

  shuttingDown = true;
  await terminateActiveChild(signal);
  process.exit(0);
}

process.on("SIGINT", () => {
  void handleShutdown("SIGINT");
});

process.on("SIGTERM", () => {
  void handleShutdown("SIGTERM");
});

const buildChild = spawnNpm(["run", "build"]);
const buildResult = await waitForExit(buildChild);

if (buildResult.code !== 0) {
  process.exit(buildResult.code ?? 1);
}

if (shuttingDown) {
  process.exit(0);
}

const startChild = spawnNpm(["run", "start", "--", "--hostname", "127.0.0.1"]);
const startResult = await waitForExit(startChild);
process.exit(startResult.code ?? (startResult.signal ? 1 : 0));
