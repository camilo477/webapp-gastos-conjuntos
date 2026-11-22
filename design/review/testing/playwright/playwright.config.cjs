const path = require("node:path");
const { pathToFileURL } = require("node:url");
const { modules, engines, context, root } = require("./runtime.cjs");
const { defineConfig } = modules("playwright/test");
const run = context();
process.env.GASTOS_RUN_DIR = run.runDir;
process.env.GASTOS_SCREENSHOT_DIR = run.screenshotDir;
module.exports = defineConfig({
  testDir: __dirname,
  testMatch: "prototype.spec.cjs",
  workers: 1,
  retries: 0,
  timeout: 90000,
  globalTimeout: 900000,
  outputDir: path.join(run.runDir, "artifacts"),
  reporter: [
    ["list"],
    ["json", { outputFile: path.join(run.runDir, "results.json") }],
    [
      "html",
      { outputFolder: path.join(run.runDir, "html-report"), open: "never" },
    ],
  ],
  webServer:
    run.transport === "file"
      ? undefined
      : {
          command: `"${process.execPath}" "${path.join(__dirname, "server.cjs")}"`,
          url: `http://127.0.0.1:${run.port}/index.html`,
          reuseExistingServer: false,
          timeout: 10000,
          gracefulShutdown: { signal: "SIGTERM", timeout: 5000 },
          stdout: "pipe",
          stderr: "pipe",
        },
  use: {
    baseURL:
      run.transport === "file"
        ? pathToFileURL(path.join(root, "design/prototype") + path.sep).href
        : `http://127.0.0.1:${run.port}`,
    headless: true,
    viewport: { width: 390, height: 844 },
    locale: "es-CO",
    timezoneId: "America/Bogota",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: engines().map(({ name, launchOptions }) => ({
    name,
    use: { browserName: name, launchOptions },
  })),
});
