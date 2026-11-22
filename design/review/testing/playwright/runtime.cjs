const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");
const testing = path.resolve(__dirname, "..");
const root = path.resolve(testing, "../../..");
const toolsDir =
  process.env.DESIGN_TOOLS_DIR ||
  (fs.existsSync("/tmp/gastos-phase1-tools/node_modules/playwright")
    ? "/tmp/gastos-phase1-tools/node_modules"
    : path.join(testing, ".tools/node_modules"));
const modules = (name) => require(path.join(toolsDir, name));
function engines() {
  const pw = modules("playwright");
  const cache =
    process.env.PLAYWRIGHT_BROWSERS_PATH ||
    path.join(os.homedir(), ".cache/ms-playwright");
  return ["chromium", "firefox", "webkit"].map((name) => {
    const expected = pw[name].executablePath();
    const override = process.env[`GASTOS_${name.toUpperCase()}_EXECUTABLE`];
    let executablePath = override || expected;
    if (!override && !fs.existsSync(expected)) {
      const legacy = {
        chromium: path.join(cache, "chromium-1187/chrome-linux/chrome"),
        firefox: path.join(cache, "firefox-1490/firefox/firefox"),
        webkit: fs.existsSync(path.join(cache, "webkit-2203/pw_run.sh"))
          ? path.join(testing, "environment/webkit-local.sh")
          : expected,
      }[name];
      if (fs.existsSync(legacy)) executablePath = legacy;
    }
    return {
      name,
      expected,
      executablePath,
      bundledRevision: executablePath === expected,
      launchOptions: {
        executablePath,
        timeout: 15000,
        ...(name === "chromium" ? { chromiumSandbox: true } : {}),
      },
    };
  });
}
function context() {
  const transport = process.env.GASTOS_TEST_TRANSPORT || "http";
  if (!["http", "file"].includes(transport))
    throw Error("GASTOS_TEST_TRANSPORT debe ser http o file");
  const runDir =
    process.env.GASTOS_RUN_DIR ||
    path.join(
      testing,
      "runs",
      `direct-${new Date().toISOString().replace(/[:.]/g, "-")}`,
    );
  const manifest = path.join(runDir, "preflight.json");
  return {
    transport,
    runDir,
    screenshotDir:
      process.env.GASTOS_SCREENSHOT_DIR ||
      path.join(testing, "screenshots", path.basename(runDir)),
    preflight: fs.existsSync(manifest)
      ? JSON.parse(fs.readFileSync(manifest))
      : null,
    port: Number(process.env.GASTOS_TEST_PORT || 4173),
  };
}
module.exports = { testing, root, toolsDir, modules, engines, context };
