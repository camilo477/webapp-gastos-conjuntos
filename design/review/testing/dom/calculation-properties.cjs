/* Ejecuta las funciones privadas existentes mediante hooks solo del harness JSDOM. */
const fs = require("node:fs");
const path = require("node:path");
const assert = require("node:assert/strict");
const { createHarness } = require("./harness.cjs");
let seed = 20261121;
const random = () => {
  seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
  return seed / 4294967296;
};
const results = [];
let validVectors = 0,
  invalidVectors = 0;
for (let count = 2; count <= 10; count++) {
  const h = createHarness({ calculationHooks: true }),
    qa = h.win.__calculationTestHooks;
  qa.setCount(count);
  const ids = Array.from({ length: count }, (_, i) =>
    String.fromCharCode(97 + i),
  );
  for (const mode of ["equal", "percentage", "fixed"]) {
    let failure;
    try {
      for (let trial = 0; trial < 250; trial++) {
        const total =
          trial === 0
            ? 1
            : trial === 1
              ? 1000000000000
              : Math.max(1, Math.floor(random() * 1000000000000));
        const d = qa.draft();
        Object.assign(d, {
          amount: String(total),
          included: [...ids].reverse(),
          split: mode,
          weights: {},
          fixed: {},
        });
        if (mode === "percentage") {
          const cuts = [
            0,
            10000,
            ...Array.from({ length: count - 1 }, () =>
              Math.floor(random() * 10001),
            ),
          ].sort((a, b) => a - b);
          for (let i = 0; i < count; i++)
            d.weights[ids[i]] = ((cuts[i + 1] - cuts[i]) / 100).toFixed(2);
        }
        if (mode === "fixed") {
          const cuts = [
            0,
            total,
            ...Array.from({ length: count - 1 }, () =>
              Math.floor(random() * (total + 1)),
            ),
          ].sort((a, b) => a - b);
          for (let i = 0; i < count; i++)
            d.fixed[ids[i]] = String(cuts[i + 1] - cuts[i]);
        }
        const value = qa.splitData();
        assert.equal(value.valid, true);
        const amounts = Object.values(value.shares);
        assert.ok(amounts.every((n) => Number.isSafeInteger(n) && n >= 0));
        assert.equal(
          amounts.reduce((a, b) => a + b, 0),
          total,
        );
        validVectors++;
        if (mode === "equal") {
          assert.ok(Math.max(...amounts) - Math.min(...amounts) <= 1);
          d.included = [...ids];
          assert.deepEqual(
            JSON.parse(JSON.stringify(qa.splitData().shares)),
            JSON.parse(JSON.stringify(value.shares)),
          );
        }
        if (mode === "fixed")
          for (const id of ids)
            assert.equal(value.shares[id], Number(d.fixed[id]));
        if (mode === "percentage") {
          // Oráculo aritmético independiente: producto seguro <= 10^16 vía BigInt.
          const products = ids.map((id) => ({
            id,
            product:
              BigInt(total) * BigInt(Math.round(Number(d.weights[id]) * 100)),
          }));
          const floors = products.reduce(
            (sum, item) => sum + item.product / 10000n,
            0n,
          );
          const order = [...products].sort((a, b) => {
            const ar = a.product % 10000n,
              br = b.product % 10000n;
            return ar === br ? a.id.localeCompare(b.id) : ar > br ? -1 : 1;
          });
          const winners = new Set(
            order
              .slice(0, Number(BigInt(total) - floors))
              .map((item) => item.id),
          );
          for (const item of products)
            assert.equal(
              value.shares[item.id],
              Number(item.product / 10000n) + Number(winners.has(item.id)),
              "Cuota proporcional y desempate por ID exactos",
            );
          const first = ids[0];
          d.weights[first] = (Number(d.weights[first]) + 0.01).toFixed(2);
          assert.equal(
            qa.splitData().valid,
            false,
            "100,01% no se redondea a 100%",
          );
          invalidVectors++;
        }
      }
    } catch (error) {
      failure = error.message;
    }
    results.push({
      count,
      mode,
      status: failure ? "failed" : "passed",
      trials: 250,
      error: failure,
    });
  }
  h.close();
}
const report = {
  scope:
    "Funciones reales del prototipo dentro de JSDOM, no motor productivo ni navegación real",
  seed: 20261121,
  executed: results.length,
  passed: results.filter((r) => r.status === "passed").length,
  failed: results.filter((r) => r.status === "failed").length,
  validVectors,
  invalidVectors,
  results,
};
fs.writeFileSync(
  path.join(__dirname, "calculation-properties.json"),
  JSON.stringify(report, null, 2) + "\n",
);
console.log(
  JSON.stringify({
    executed: report.executed,
    passed: report.passed,
    failed: report.failed,
    validVectors,
    invalidVectors,
  }),
);
process.exitCode = report.failed ? 1 : 0;
