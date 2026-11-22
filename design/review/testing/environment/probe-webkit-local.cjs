/* Reintento reproducible con bibliotecas locales, sin cambiar el sandbox. */
const fs = require("node:fs");
const path = require("node:path");
const { modules, root } = require("../dom/harness.cjs");
const { webkit } = require(path.join(modules, "playwright"));
async function main() {
  let browser;
  const result = { status: "not-run" };
  try {
    browser = await webkit.launch({
      executablePath: path.join(__dirname, "webkit-local.sh"),
      headless: true,
      timeout: 15000,
    });
    const page = await browser.newPage();
    await page.goto(`file://${root}/design/prototype/index.html`);
    await page.locator("#main").waitFor();
    result.status = "launched-and-rendered";
    result.transport = "file";
    result.version = browser.version();
    await page.screenshot({
      path: path.join(__dirname, "probe-webkit-local.png"),
    });
  } catch (error) {
    result.status = "blocked";
    result.error = error.message;
    fs.writeFileSync(
      path.join(__dirname, "launch-webkit-local.log"),
      error.message + "\n",
    );
  } finally {
    if (browser) await browser.close();
    fs.writeFileSync(
      path.join(__dirname, "webkit-local-results.json"),
      JSON.stringify(result, null, 2) + "\n",
    );
    console.log(`WebKit local: ${result.status}`);
  }
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
