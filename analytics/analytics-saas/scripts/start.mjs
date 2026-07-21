// Railway single-service launcher: runs the Next.js web server AND the BullMQ
// background workers in one container. Without the workers, report-generation
// jobs are enqueued to Redis but never processed, so reports silently never
// generate. Keeping both in one service avoids duplicating env vars and wiring
// a second Redis/Postgres connection.
//
// If you later split these onto separate Railway services for independent
// scaling, set the worker service start command to `pnpm workers` and this
// service's command to `pnpm start`.
import { spawn } from "node:child_process";

const children = [];

function run(name, command, args) {
  const child = spawn(command, args, { stdio: "inherit", env: process.env });
  children.push(child);

  child.on("exit", (code, signal) => {
    console.error(
      `[start] ${name} exited (code=${code ?? "null"}, signal=${signal ?? "null"}); shutting down.`,
    );
    // A child killed by our own shutdown (SIGTERM) is expected — exit clean so
    // Railway's ON_FAILURE restart policy doesn't treat a normal redeploy as a
    // crash. Only a child that dies on its own (before shutdown) is a failure.
    shutdown(shuttingDown ? 0 : (code ?? 1));
  });

  return child;
}

let shuttingDown = false;
function shutdown(code) {
  if (shuttingDown) return;
  shuttingDown = true;
  for (const child of children) {
    if (!child.killed) child.kill("SIGTERM");
  }
  // Give children a moment to exit cleanly, then force the process down.
  setTimeout(() => process.exit(code), 5000).unref();
}

process.on("SIGINT", () => shutdown(0));
process.on("SIGTERM", () => shutdown(0));

// Web server (Next.js) on the port Railway provides.
run("web", "node_modules/.bin/next", ["start", "-p", process.env.PORT ?? "3000"]);

// Background workers (report generation + delivery + stripe webhooks).
run("workers", "node_modules/.bin/tsx", ["workers/index.ts"]);
