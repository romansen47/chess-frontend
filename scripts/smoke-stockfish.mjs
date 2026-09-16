import { createHash } from "node:crypto";
import { spawn } from "node:child_process";
import {
  copyFile,
  mkdtemp,
  readFile,
  rm,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const engineDir = resolve(
  projectRoot,
  "public/third-party/stockfish/19.0.0",
);
const jsPath = resolve(engineDir, "stockfish-19-lite-single.js");
const wasmPath = resolve(engineDir, "stockfish-19-lite-single.wasm");

const EXPECTED = new Map([
  [
    jsPath,
    "d3344124ab067fb0b90ee77873bb8e9fbf5fc01bc525fe714b0f942581e889e6",
  ],
  [
    wasmPath,
    "57ac2d72312aba346760e3f173f687a8c211208e97a87268436f7f0e10bb5387",
  ],
]);

for (const [path, expected] of EXPECTED) {
  const digest = createHash("sha256")
    .update(await readFile(path))
    .digest("hex");
  if (digest !== expected) {
    throw new Error(
      `Unexpected SHA-256 for ${path}: expected ${expected}, got ${digest}`,
    );
  }
}

const smokeDir = await mkdtemp(
  resolve(tmpdir(), "chess-stockfish-"),
);
const runnableJsPath = resolve(
  smokeDir,
  "stockfish-19-lite-single.cjs",
);
const runnableWasmPath = resolve(
  smokeDir,
  "stockfish-19-lite-single.wasm",
);

await copyFile(jsPath, runnableJsPath);
await copyFile(wasmPath, runnableWasmPath);

const engine = spawn(process.execPath, [runnableJsPath], {
  cwd: smokeDir,
  stdio: ["pipe", "pipe", "pipe"],
});

let stdoutBuffer = "";
let stderr = "";
const seenLines = [];
const waiters = new Set();

function handleLine(line) {
  const trimmed = line.trim();
  if (!trimmed) return;

  seenLines.push(trimmed);
  for (const waiter of [...waiters]) {
    if (!waiter.matches(trimmed)) continue;
    clearTimeout(waiter.timeout);
    waiters.delete(waiter);
    waiter.resolve(trimmed);
  }
}

engine.stdout.setEncoding("utf8");
engine.stdout.on("data", (chunk) => {
  stdoutBuffer += chunk;
  const lines = stdoutBuffer.split(/\r?\n/);
  stdoutBuffer = lines.pop() ?? "";
  for (const line of lines) handleLine(line);
});

engine.stderr.setEncoding("utf8");
engine.stderr.on("data", (chunk) => {
  stderr += chunk;
});

function waitForLine(matches, label, timeoutMs = 15000) {
  const existing = seenLines.find(matches);
  if (existing) return Promise.resolve(existing);

  return new Promise((resolvePromise, rejectPromise) => {
    const waiter = {
      matches,
      resolve: resolvePromise,
      timeout: setTimeout(() => {
        waiters.delete(waiter);
        rejectPromise(new Error(
          `Timed out waiting for ${label}. stderr: ${stderr.trim()}`,
        ));
      }, timeoutMs),
    };
    waiters.add(waiter);
  });
}

function send(command) {
  engine.stdin.write(command + "\n");
}

function waitForExit(timeoutMs = 5000) {
  if (engine.exitCode !== null) return Promise.resolve(engine.exitCode);

  return new Promise((resolvePromise, rejectPromise) => {
    const timeout = setTimeout(() => {
      rejectPromise(new Error("Stockfish process did not exit after quit"));
    }, timeoutMs);

    engine.once("exit", (code) => {
      clearTimeout(timeout);
      resolvePromise(code);
    });
  });
}

try {
  send("uci");
  await waitForLine((line) => line === "uciok", "uciok");

  send("isready");
  await waitForLine((line) => line === "readyok", "readyok");

  send("setoption name MultiPV value 2");
  send("position startpos moves e2e4 e7e5 g1f3");
  send("go infinite");

  await waitForLine(
    (line) => line.startsWith("info ")
      && line.includes(" multipv 1 ")
      && line.includes(" score "),
    "MultiPV 1 info",
  );
  await waitForLine(
    (line) => line.startsWith("info ")
      && line.includes(" multipv 2 ")
      && line.includes(" score "),
    "MultiPV 2 info",
  );

  send("stop");
  const bestMove = await waitForLine(
    (line) => line.startsWith("bestmove "),
    "bestmove",
  );

  send("quit");
  const exitCode = await waitForExit();
  if (exitCode !== 0) {
    throw new Error(
      `Stockfish exited with code ${exitCode}. stderr: ${stderr.trim()}`,
    );
  }

  console.log(
    `Stockfish 19 lite-single smoke test passed (${bestMove})`,
  );
} catch (error) {
  engine.kill("SIGKILL");
  throw error;
} finally {
  await rm(smokeDir, { recursive: true, force: true });
}
