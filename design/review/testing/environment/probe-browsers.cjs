const fs = require("node:fs");
const path = require("node:path");
const http = require("node:http");
const { spawnSync } = require("node:child_process");
const toolsDir =
  process.env.DESIGN_TOOLS_DIR || "/tmp/gastos-phase1-tools/node_modules";
const pw = require(path.join(toolsDir, "playwright"));
const out = __dirname;
const root = path.resolve(__dirname, "../../../..");
const cache = "/home/camiska/.cache/ms-playwright";
const targets = [
  {
    name: "chromium",
    type: pw.chromium,
    executable: `${cache}/chromium-1187/chrome-linux/chrome`,
    options: { chromiumSandbox: true },
  },
  {
    name: "firefox",
    type: pw.firefox,
    executable: `${cache}/firefox-1490/firefox/firefox`,
    options: {},
  },
  {
    name: "webkit",
    type: pw.webkit,
    executable: `${cache}/webkit-2203/pw_run.sh`,
    options: {},
  },
];
const report = {
  node: process.version,
  platform: process.platform,
  playwright: require(path.join(toolsDir, "playwright/package.json")).version,
  security:
    "Sin sudo, sin flags para desactivar sandbox y sin modificar configuración global",
  http: null,
  browsers: [],
};

async function run() {
  let server;
  try {
    server = http.createServer((req, res) => {
      const requestPath = decodeURIComponent((req.url || "/").split("?")[0]);
      const file = path.resolve(
        root,
        "." +
          (requestPath === "/" ? "/design/prototype/index.html" : requestPath),
      );
      if (!file.startsWith(root + path.sep)) {
        res.writeHead(403).end();
        return;
      }
      fs.readFile(file, (err, data) => {
        if (err) {
          res.writeHead(404).end();
          return;
        }
        res.setHeader(
          "Content-Type",
          file.endsWith(".html")
            ? "text/html"
            : file.endsWith(".js")
              ? "text/javascript"
              : file.endsWith(".css")
                ? "text/css"
                : "application/octet-stream",
        );
        res.end(data);
      });
    });
    await new Promise((resolve, reject) => {
      server.once("error", reject);
      server.listen(0, "127.0.0.1", resolve);
    });
    report.http = {
      status: "running",
      url: `http://127.0.0.1:${server.address().port}/design/prototype/index.html`,
    };
  } catch (error) {
    report.http = { status: "blocked", code: error.code, error: error.message };
  }
  for (const target of targets) {
    const result = {
      name: target.name,
      executable: target.executable,
      available: fs.existsSync(target.executable),
      status: "not-run",
    };
    if (!result.available) {
      result.status = "missing";
      report.browsers.push(result);
      continue;
    }
    const checks =
      target.name === "webkit"
        ? [`${cache}/webkit-2203/minibrowser-wpe/bin/MiniBrowser`]
        : [target.executable];
    result.dependencies = checks.map((executable) => {
      const r = spawnSync("ldd", [executable], { encoding: "utf8" });
      fs.writeFileSync(
        path.join(out, `ldd-${target.name}.log`),
        (r.stdout || "") + (r.stderr || ""),
      );
      return {
        executable,
        exitCode: r.status,
        missing: (r.stdout || "")
          .split("\n")
          .filter((line) => line.includes("not found")),
      };
    });
    let browser;
    try {
      browser = await target.type.launch({
        executablePath: target.executable,
        headless: true,
        timeout: 15000,
        ...target.options,
      });
      result.version = browser.version();
      const page = await browser.newPage({
        viewport: { width: 390, height: 844 },
      });
      const url =
        report.http.status === "running"
          ? report.http.url
          : `file://${root}/design/prototype/index.html`;
      await page.goto(url, { timeout: 15000, waitUntil: "load" });
      await page.locator("#main").waitFor();
      result.status = "launched-and-rendered";
      result.transport = report.http.status === "running" ? "http" : "file";
      result.title = await page.title();
      await page.screenshot({
        path: path.join(out, `probe-${target.name}.png`),
      });
    } catch (error) {
      result.status = "blocked";
      result.error = error.message;
      fs.writeFileSync(
        path.join(out, `launch-${target.name}.log`),
        error.message + "\n",
      );
    } finally {
      if (browser) await browser.close().catch(() => {});
    }
    report.browsers.push(result);
    fs.writeFileSync(
      path.join(out, "browser-probes.json"),
      JSON.stringify(report, null, 2) + "\n",
    );
    console.log(target.name, result.status);
  }
  if (server?.listening) await new Promise((resolve) => server.close(resolve));
  fs.writeFileSync(
    path.join(out, "browser-probes.json"),
    JSON.stringify(report, null, 2) + "\n",
  );
  console.log("HTTP", report.http.status);
}
run().catch((error) => {
  fs.writeFileSync(path.join(out, "probe-error.log"), String(error.stack));
  process.exitCode = 1;
});
