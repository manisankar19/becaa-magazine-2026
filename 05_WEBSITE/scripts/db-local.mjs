import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { siteRoot } from "./lib.mjs";

// Sprint v3 Task 18 — a user-owned PostgreSQL 16 cluster for local development and tests.
//   npm run db:local:start   initdb (first time) + start on 127.0.0.1:5433, create becaa_dev/becaa_test
//   npm run db:local:stop    stop
//   npm run db:local:status  status
// Trust auth is restricted to local loopback connections only (pg_hba below); the cluster
// never listens on a non-loopback address. Data lives in 05_WEBSITE/.pgdata (git-ignored).
export const PGDATA = path.join(siteRoot, ".pgdata");
export const PORT = 5433;
export const HOST = "127.0.0.1";
export const DATABASES = ["becaa_dev", "becaa_test"];
const LOG = path.join(PGDATA, "postgres.log");

function run(cmd, args, opts = {}) {
  const r = spawnSync(cmd, args, { encoding: "utf8", ...opts });
  if (r.status !== 0 && !opts.allowFail) {
    console.error((r.stderr || r.stdout || "").trim());
    throw new Error(`${cmd} ${args.join(" ")} failed (${r.status})`);
  }
  return r;
}

export function isRunning() {
  return spawnSync("pg_ctl", ["-D", PGDATA, "status"], { encoding: "utf8" }).status === 0;
}

export function start() {
  if (!fs.existsSync(path.join(PGDATA, "PG_VERSION"))) {
    fs.mkdirSync(PGDATA, { recursive: true });
    run("initdb", ["-D", PGDATA, "--auth=trust", "--encoding=UTF8", "--locale=C.UTF-8", "--username=becaa"]);
    fs.writeFileSync(path.join(PGDATA, "pg_hba.conf"), [
      "# Local development cluster only: trust on loopback, nothing else.",
      "local   all   all                 trust",
      "host    all   all   127.0.0.1/32  trust",
      "host    all   all   ::1/128       trust",
      "",
    ].join("\n"));
    fs.appendFileSync(path.join(PGDATA, "postgresql.conf"), `\nlisten_addresses = '${HOST}'\nport = ${PORT}\nunix_socket_directories = '${PGDATA}'\n`);
  }
  if (!isRunning()) run("pg_ctl", ["-D", PGDATA, "-l", LOG, "-w", "start"]);
  for (const db of DATABASES) {
    const exists = run("psql", ["-h", HOST, "-p", String(PORT), "-U", "becaa", "-d", "postgres", "-tAc", `SELECT 1 FROM pg_database WHERE datname='${db}'`]).stdout.trim() === "1";
    if (!exists) run("createdb", ["-h", HOST, "-p", String(PORT), "-U", "becaa", db]);
  }
  console.log(`PostgreSQL running on ${HOST}:${PORT}; databases: ${DATABASES.join(", ")}`);
  console.log(`DATABASE_URL=postgres://becaa@${HOST}:${PORT}/becaa_dev`);
  console.log(`DATABASE_URL_TEST=postgres://becaa@${HOST}:${PORT}/becaa_test`);
}

export function stop() {
  if (isRunning()) run("pg_ctl", ["-D", PGDATA, "-w", "-m", "fast", "stop"]);
  console.log("PostgreSQL stopped.");
}

const cmd = process.argv[2];
if (import.meta.url === `file://${process.argv[1]}`) {
  if (cmd === "start") start();
  else if (cmd === "stop") stop();
  else if (cmd === "status") console.log(isRunning() ? `running on ${HOST}:${PORT}` : "stopped");
  else { console.error("usage: db-local.mjs start|stop|status"); process.exit(2); }
}
