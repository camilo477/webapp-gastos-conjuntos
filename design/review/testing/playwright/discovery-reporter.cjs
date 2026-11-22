const fs = require("node:fs");
const path = require("node:path");
// Descubrimiento a fichero, sin depender de los pipes de stdout del proceso hijo.
module.exports = class DiscoveryReporter {
  printsToStdio() {
    return true;
  }
  onBegin(config, suite) {
    const tests = suite
      .allTests()
      .map((test) => ({ title: test.titlePath(), location: test.location }));
    const file = path.join(process.env.GASTOS_RUN_DIR, "discovery.json");
    fs.writeFileSync(
      file,
      JSON.stringify({ count: tests.length, tests }, null, 2) + "\n",
    );
    console.log(`Casos descubiertos por Playwright: ${tests.length}`);
  }
};
