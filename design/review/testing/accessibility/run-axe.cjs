const fs = require("node:fs");
const path = require("node:path");
const { createHarness, modules } = require("../dom/harness.cjs");
const run = process.env.DESIGN_RUN_LABEL || "final";
const source = fs.readFileSync(
  path.join(modules, "axe-core/axe.min.js"),
  "utf8",
);
async function main() {
  const h = createHarness();
  h.win.eval(source);
  const routes = [...h.q("#screen-select").options].map(
    (option) => option.value,
  );
  const results = [];
  const cases = [
    ...routes.map((route) => ({ route, scenario: "synced" })),
    { route: "detail", scenario: "empty" },
    { route: "activity", scenario: "pending" },
    { route: "activity", scenario: "error" },
    { route: "join", scenario: "expired" },
    { route: "join", scenario: "revoked" },
    { route: "home", scenario: "long" },
    { route: "expense", scenario: "synced", dialog: "photo" },
    { route: "expense", scenario: "synced", dialog: "stock" },
    { route: "expense", scenario: "synced", dialog: "draft" },
    { route: "detail", scenario: "synced", dialog: "delete-expense" },
    { route: "summary", scenario: "synced", dialog: "confirm-close" },
  ];
  for (const theme of ["light", "dark"]) {
    if (h.doc.documentElement.dataset.theme !== theme) h.click("#theme-toggle");
    for (const item of cases) {
      h.click("#reset-demo");
      h.scenario(item.scenario);
      h.route(item.route);
      if (item.dialog === "stock") {
        h.click('[data-action="photo"]');
        h.click('[data-action="openverse"]');
      } else if (item.dialog === "draft") {
        h.input("#expense-title", "Borrador accesible");
        h.input("#expense-amount", "100");
        h.click('#main [data-route="home"]');
      } else if (item.dialog) h.click(`[data-action="${item.dialog}"]`);
      const result = await h.win.axe.run(h.doc, {
        runOnly: {
          type: "tag",
          values: ["wcag2a", "wcag2aa", "wcag21aa", "best-practice"],
        },
        rules: {
          "color-contrast": { enabled: false },
          "target-size": { enabled: false },
        },
      });
      results.push({
        theme,
        ...item,
        effectiveScenario: h.q("#state-select").value,
        status: result.violations.length ? "failed" : "passed-supported-rules",
        violations: result.violations.map((v) => ({
          id: v.id,
          impact: v.impact,
          description: v.description,
          help: v.help,
          helpUrl: v.helpUrl,
          nodes: v.nodes.map((node) => ({
            target: node.target,
            summary: node.failureSummary,
          })),
        })),
        incomplete: result.incomplete.map((v) => ({
          id: v.id,
          description: v.description,
          message: v.message,
          nodes: v.nodes.map((node) => ({
            target: node.target,
            summary: node.failureSummary,
          })),
        })),
        passedRuleCount: result.passes.length,
      });
    }
  }
  const report = {
    engine: "axe-core 4.10.3 en JSDOM (sin navegador)",
    run,
    executed: results.length,
    passed: results.filter((r) => !r.violations.length).length,
    failed: results.filter((r) => r.violations.length).length,
    excluded: [
      "color-contrast: requiere renderizado/canvas",
      "target-size: requiere geometría renderizada",
      "Tab nativo, zoom, safe areas y foco visible real no ejecutados",
    ],
    results,
    jsdomWarnings: h.errors,
  };
  fs.writeFileSync(
    path.join(__dirname, `axe-${run}.json`),
    JSON.stringify(report, null, 2) + "\n",
  );
  console.log(
    JSON.stringify({
      executed: report.executed,
      passed: report.passed,
      failed: report.failed,
    }),
  );
  for (const result of results.filter((r) => r.violations.length))
    console.log(
      result.route + "/" + result.scenario + "/" + result.theme,
      JSON.stringify(
        result.violations.map((v) => ({
          id: v.id,
          target: v.nodes.map((n) => n.target),
        })),
      ),
    );
  h.close();
  process.exitCode = report.failed ? 1 : 0;
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
