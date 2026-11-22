const fs = require("node:fs");
const path = require("node:path");
const assert = require("node:assert/strict");
const modules =
  process.env.DESIGN_TOOLS_DIR || "/tmp/gastos-phase1-tools/node_modules";
const { JSDOM, VirtualConsole } = require(path.join(modules, "jsdom"));
const root = path.resolve(__dirname, "../../../..");
const prototype = path.join(root, "design/prototype");
function createHarness(options = {}) {
  const errors = [];
  const vc = new VirtualConsole();
  vc.on("jsdomError", (error) => errors.push(error.message));
  const dom = new JSDOM(
    fs.readFileSync(path.join(prototype, "index.html"), "utf8"),
    {
      url: "https://prototype.invalid/index.html",
      runScripts: "outside-only",
      pretendToBeVisual: true,
      virtualConsole: vc,
    },
  );
  const win = dom.window,
    doc = win.document;
  win.matchMedia = () => ({ matches: false, addEventListener() {} });
  win.scrollTo = () => {};
  win.HTMLElement.prototype.scrollIntoView = () => {};
  win.HTMLDialogElement.prototype.showModal = function () {
    this.open = true;
  };
  win.HTMLDialogElement.prototype.close = function () {
    this.open = false;
  };
  const copied = [];
  Object.defineProperty(win.navigator, "clipboard", {
    value: { writeText: async (value) => copied.push(value) },
  });
  let source = fs.readFileSync(path.join(prototype, "app.js"), "utf8");
  if (options.calculationHooks) {
    const instrumented = source.replace(
      /\}\)\(\);\s*$/,
      "window.__calculationTestHooks = {equal, splitData, draft, setCount(value){ state.count=value; seed(); }};})();",
    );
    assert.notEqual(
      instrumented,
      source,
      "Instrumentación de pruebas aislada, sin cambiar el prototipo",
    );
    source = instrumented;
  }
  win.eval(source);
  const q = (selector) => {
    const el = doc.querySelector(selector);
    assert.ok(el, `Existe ${selector}`);
    return el;
  };
  const select = (selector, value) => {
    const el = q(selector);
    el.value = value;
    el.dispatchEvent(new win.Event("change", { bubbles: true }));
  };
  const input = (selector, value) => {
    const el = q(selector);
    el.value = String(value);
    el.dispatchEvent(new win.Event("input", { bubbles: true }));
  };
  const click = (selector) => q(selector).click();
  const submit = (selector) =>
    q(selector).dispatchEvent(
      new win.Event("submit", { bubbles: true, cancelable: true }),
    );
  return {
    dom,
    win,
    doc,
    q,
    select,
    input,
    click,
    submit,
    route: (value) => select("#screen-select", value),
    scenario: (value) => select("#state-select", value),
    text: () => q("#main").textContent,
    errors,
    copied,
    close: () => dom.window.close(),
  };
}
module.exports = { createHarness, root, prototype, modules };
