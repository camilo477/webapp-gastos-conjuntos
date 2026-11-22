#!/usr/bin/env node
/* Un comando desde Ubuntu normal. Sin sudo, root, --no-sandbox ni DOM sintético. */
const fs = require("node:fs");
const path = require("node:path");
const http = require("node:http");
const { runCommand } = require("./playwright/run-command.cjs");
const crypto = require("node:crypto");
const {
  testing,
  root,
  toolsDir,
  modules,
  engines,
} = require("./playwright/runtime.cjs");
const install = process.argv.includes("--install-browsers");
const runId = new Date().toISOString().replace(/[:.]/g, "-");
const runDir = path.join(testing, "runs", runId);
const screenshotDir = path.join(testing, "screenshots", runId);
fs.mkdirSync(runDir, { recursive: true });
fs.mkdirSync(screenshotDir, { recursive: true });
let child,
  activeBrowser,
  interrupted = false;
const write = (name, value) =>
  fs.writeFileSync(
    path.join(runDir, name),
    JSON.stringify(value, null, 2) + "\n",
  );
function stopChild(signal = "SIGTERM") {
  if (!child?.pid) return;
  try {
    process.kill(process.platform === "linux" ? -child.pid : child.pid, signal);
  } catch (error) {
    if (error.code !== "ESRCH") throw error;
  }
}
for (const signal of ["SIGINT", "SIGTERM"])
  process.once(signal, () => {
    interrupted = true;
    activeBrowser?.close().catch(() => {});
    stopChild(signal);
  });
async function command(executable, args, logName, extraEnv = {}) {
  const result = await runCommand(executable, args, {
    cwd: root,
    env: { ...process.env, ...extraEnv },
    logFile: path.join(runDir, logName),
    onSpawn: (value) => {
      child = value;
    },
    onOutput: (data) => process.stdout.write(data),
  });
  // También se cierran hijos del grupo creado por este ejecutor si el padre salió antes.
  stopChild();
  child = null;
  return result;
}
async function httpProbe() {
  const server = http.createServer((req, res) => res.end("diagnostic"));
  return new Promise((resolve) => {
    server.once("error", (error) =>
      resolve({ status: "blocked", code: error.code, message: error.message }),
    );
    server.listen(0, "127.0.0.1", () => {
      const port = server.address().port;
      server.close(() => resolve({ status: "allowed", port }));
    });
  });
}
function pngs(directory) {
  if (!fs.existsSync(directory)) return [];
  return fs
    .readdirSync(directory, { withFileTypes: true })
    .flatMap((entry) =>
      entry.isDirectory()
        ? pngs(path.join(directory, entry.name))
        : entry.name.endsWith(".png")
          ? [path.relative(testing, path.join(directory, entry.name))]
          : [],
    );
}
async function main() {
  if (process.getuid?.() === 0)
    throw Error("No ejecutar como root. Utiliza tu usuario normal.");
  const diagnostic = {
    node: process.version,
    uid: process.getuid?.(),
    platform: process.platform,
    http: await httpProbe(),
    security: fs.existsSync("/proc/self/status")
      ? fs
          .readFileSync("/proc/self/status", "utf8")
          .split("\n")
          .filter((line) =>
            /^(NoNewPrivs|Seccomp|Seccomp_filters|CapEff):/.test(line),
          )
      : [],
  };
  write("diagnostic.json", diagnostic);
  if (
    !fs.existsSync(path.join(toolsDir, "playwright")) ||
    !fs.existsSync(path.join(toolsDir, "axe-core"))
  ) {
    const result = await command(
      "npm",
      [
        "install",
        "--prefix",
        path.dirname(toolsDir),
        "--no-audit",
        "--no-fund",
        "--save-exact",
        "playwright@1.56.1",
        "axe-core@4.10.3",
      ],
      "tools-install.log",
    );
    if (result.code !== 0)
      throw Error(
        "No se pudieron preparar las dependencias locales de pruebas. Ver tools-install.log.",
      );
  }
  const cli = path.join(toolsDir, "playwright/cli.js");
  if (install && diagnostic.http.status === "allowed") {
    const missing = engines()
      .filter((engine) => !fs.existsSync(engine.expected))
      .map((engine) => engine.name);
    if (missing.length)
      diagnostic.browserInstall = await command(
        process.execPath,
        [cli, "install", ...missing],
        "browser-install.log",
      );
  } else if (install)
    diagnostic.browserInstall = {
      status: "not-attempted",
      reason:
        "HTTP/loopback denegado: descargar otros motores no elimina esa restricción.",
    };
  const preflight = {
    createdAt: new Date().toISOString(),
    scope:
      "Arranque y renderizado de documento diagnóstico; no prueba del prototipo",
    browsers: [],
  };
  for (const engine of engines()) {
    if (interrupted) break;
    const result = {
      name: engine.name,
      executablePath: engine.executablePath,
      expectedExecutable: engine.expected,
      bundledRevision: engine.bundledRevision,
      status: "not-run",
    };
    try {
      if (!fs.existsSync(engine.executablePath)) {
        result.status = "missing";
        continue;
      }
      console.log(
        `Sonda real: ${engine.name}, sandbox del navegador conservado`,
      );
      activeBrowser = await modules("playwright")[engine.name].launch({
        ...engine.launchOptions,
        headless: true,
      });
      const page = await activeBrowser.newPage();
      await page.goto("data:text/html,<h1>Diagnostico de navegador</h1>", {
        timeout: 10000,
      });
      const rect = await page.locator("h1").boundingBox();
      if (!rect?.width || !rect?.height)
        throw Error("Sin geometría renderizada en la sonda");
      result.status = "rendered-probe";
      result.version = activeBrowser.version();
    } catch (error) {
      result.status = "blocked";
      result.error = error.message;
      fs.writeFileSync(
        path.join(runDir, `launch-${engine.name}.log`),
        error.message + "\n",
      );
    } finally {
      if (activeBrowser) await activeBrowser.close().catch(() => {});
      activeBrowser = null;
      preflight.browsers.push(result);
    }
  }
  write("preflight.json", preflight);
  write("diagnostic.json", diagnostic);
  const env = {
    GASTOS_TEST_TRANSPORT: "http",
    GASTOS_RUN_DIR: runDir,
    GASTOS_SCREENSHOT_DIR: screenshotDir,
    GASTOS_TEST_PORT: String(diagnostic.http.port || 4173),
    DESIGN_TOOLS_DIR: toolsDir,
  };
  const config = path.join(testing, "playwright/playwright.config.cjs");
  const list = await command(
    process.execPath,
    [
      cli,
      "test",
      "--config",
      config,
      "--list",
      "--reporter",
      path.join(testing, "playwright/discovery-reporter.cjs"),
    ],
    "discovery.log",
    env,
  );
  if (list.code !== 0)
    throw Error(
      "No se pudo enumerar la suite de navegador. Ver discovery.log.",
    );
  const discovery = JSON.parse(
    fs.readFileSync(path.join(runDir, "discovery.json"), "utf8"),
  );
  const planned = discovery.count;
  if (planned !== 45)
    throw Error(`Se esperaban 45 casos, se encontraron ${planned}.`);
  let execution = { code: 130 };
  if (!interrupted)
    execution = await command(
      process.execPath,
      [cli, "test", "--config", config],
      "runner.log",
      env,
    );
  const reportPath = path.join(runDir, "results.json");
  const report = fs.existsSync(reportPath)
    ? JSON.parse(fs.readFileSync(reportPath))
    : null;
  const stats = report?.stats || {};
  const accounted =
    (stats.expected || 0) +
    (stats.unexpected || 0) +
    (stats.flaky || 0) +
    (stats.skipped || 0);
  const summary = {
    createdAt: new Date().toISOString(),
    scope: "Navegador real vía HTTP, prototipo con datos simulados",
    discovered: planned,
    passed: stats.expected || 0,
    failed: stats.unexpected || 0,
    flaky: stats.flaky || 0,
    skipped: stats.skipped || 0,
    notRun: Math.max(0, planned - accounted),
    runnerExitCode: execution.code,
    interrupted,
    infrastructureErrors: report?.errors || [],
    http: diagnostic.http,
    browsers: preflight.browsers.map(({ error, ...entry }) => ({
      ...entry,
      errorLog: error ? `launch-${entry.name}.log` : undefined,
    })),
    screenshots: pngs(screenshotDir),
    limitations: [
      "No dispositivos físicos, Firebase o sincronización real",
      "Texto 200% por CSS controlada; no zoom nativo del navegador/OS",
      "Safe areas se miden con env() del navegador emulado; no iPhone físico",
    ],
  };
  summary.status =
    execution.code === 0 &&
    summary.passed === planned &&
    !summary.skipped &&
    !summary.notRun
      ? "passed"
      : summary.passed > 0
        ? "partial"
        : "blocked-or-failed";
  write("summary.json", summary);
  const sourceFiles = [
    "design/prototype/app.js",
    "design/prototype/index.html",
    "design/prototype/styles.css",
    "design/review/testing/playwright/prototype.spec.cjs",
    "design/review/testing/playwright/playwright.config.cjs",
    "design/review/testing/playwright/server.cjs",
    "design/review/testing/playwright/runtime.cjs",
    "design/review/testing/playwright/discovery-reporter.cjs",
    "design/review/testing/playwright/run-command.cjs",
    "design/review/testing/run-browser-tests.cjs",
  ];
  write(
    "source-hashes.json",
    Object.fromEntries(
      sourceFiles.map((name) => [
        name,
        crypto
          .createHash("sha256")
          .update(fs.readFileSync(path.join(root, name)))
          .digest("hex"),
      ]),
    ),
  );
  const markdown = `# Ejecución real de navegador\n\nFecha UTC: ${summary.createdAt}. Estado: **${summary.status}**.\n\n- Casos descubiertos: ${planned}.\n- Aprobados: ${summary.passed}; fallidos: ${summary.failed}; inestables: ${summary.flaky}.\n- Omitidos: ${summary.skipped}; no iniciados: ${summary.notRun}.\n- HTTP: ${diagnostic.http.status}${diagnostic.http.code ? " (" + diagnostic.http.code + ")" : ""}.\n- Capturas reales de esta ejecución: ${summary.screenshots.length}.\n\nLos errores de arranque no se consideran defectos demostrados del prototipo. Ver diagnostic.json, preflight.json, launch-*.log, runner.log, results.json y html-report/index.html (cuando Playwright los genera).\n\nLos casos que no iniciaron no están aprobados. No se ejecutan pruebas DOM en este comando. Las capturas, si existen, están en ../../screenshots/${runId}/. Se conservaron los sandboxes.\n`;
  fs.writeFileSync(path.join(runDir, "RUN_REPORT.md"), markdown);
  fs.writeFileSync(
    path.join(testing, "latest-browser-run.json"),
    JSON.stringify(
      { runId, runDir: path.relative(root, runDir), summary: summary.status },
      null,
      2,
    ) + "\n",
  );
  console.log(markdown);
  console.log(`Reporte: ${path.join(runDir, "RUN_REPORT.md")}`);
  process.exitCode =
    summary.status === "passed"
      ? 0
      : summary.passed > 0 &&
          !summary.failed &&
          !summary.flaky &&
          !summary.notRun
        ? 3
        : 2;
}
main().catch((error) => {
  stopChild();
  write("fatal.json", { message: error.message, interrupted });
  write("summary.json", {
    status: "executor-failed",
    countsUnavailable: true,
    error: error.message,
  });
  fs.writeFileSync(
    path.join(runDir, "RUN_REPORT.md"),
    `# Ejecución interrumpida\n\nEl ejecutor falló antes de consolidar conteos: ${error.message}\n\nNo se declara ninguna prueba aprobada. Ver fatal.json y los logs conservados.\n`,
  );
  console.error(error.message);
  process.exitCode = 2;
});
