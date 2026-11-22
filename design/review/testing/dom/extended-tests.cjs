const fs = require("node:fs");
const path = require("node:path");
const assert = require("node:assert/strict");
const { createHarness, root } = require("./harness.cjs");
const run = process.env.DESIGN_RUN_LABEL || "final";
const results = [];
function test(name, fn) {
  const h = createHarness();
  try {
    fn(h);
    assert.deepEqual(h.errors, []);
    results.push({ name, status: "passed" });
  } catch (error) {
    results.push({
      name,
      status: "failed",
      error: error.message,
      stack: error.stack,
    });
  } finally {
    h.close();
  }
}
const amount = (value) => Number(String(value).replace(/[^0-9]/g, ""));
function expense(h, title = "Cena", value = "100") {
  h.route("expense");
  h.input("#expense-title", title);
  h.input("#expense-amount", value);
}

for (const value of [
  "",
  "0",
  "-1",
  "1000000000001",
  "100.50",
  "NaN",
  "Infinity",
])
  test(`Importe inválido ${JSON.stringify(value)} conserva formulario`, (h) => {
    expense(h, "No guardar", value);
    h.submit("#expense-form");
    assert.equal(h.q("#screen-select").value, "expense");
    assert.equal(h.q("#form-error").hidden, false);
    assert.equal(h.q("#expense-title").value, "No guardar");
    assert.equal(h.q("#form-error").getAttribute("role"), "alert");
    assert.equal(h.doc.activeElement, h.q("#form-error"));
    assert.equal(h.q("#expense-amount").getAttribute("aria-invalid"), "true");
    assert.equal(
      h.q("#expense-amount").getAttribute("aria-describedby"),
      "form-error",
    );
  });
test("Gasto de importe máximo y concepto de 100 caracteres", (h) => {
  expense(h, "X".repeat(100), "1000000000000");
  h.submit("#expense-form");
  assert.equal(h.q("#screen-select").value, "home");
  assert.ok(h.text().includes("X".repeat(100)));
});
test("Concepto vacío se rechaza", (h) => {
  expense(h, "   ", "100");
  h.submit("#expense-form");
  assert.equal(h.q("#form-error").hidden, false);
});
test("Todas las personas excluidas bloquean reparto", (h) => {
  h.route("split");
  for (const id of ["a", "b", "c"]) h.click(`[data-include="${id}"]`);
  assert.equal(h.q("#apply-split").disabled, true);
  assert.match(h.text(), /al menos una persona/);
});
for (const count of [2, 3, 10])
  test(`Conservación con ${count} personas e importes impares`, (h) => {
    h.select("#count-select", String(count));
    h.route("split");
    for (const total of [1, 2, 7, 11, 100, 101, 999, 1000000000000]) {
      h.route("expense");
      h.input("#expense-amount", total);
      h.click('[data-route="split"]');
      const shares = [...h.doc.querySelectorAll("[data-quota]")].map((el) =>
        amount(el.textContent),
      );
      assert.equal(shares.length, count);
      assert.equal(
        shares.reduce((a, b) => a + b, 0),
        total,
      );
      assert.ok(Math.max(...shares) - Math.min(...shares) <= 1);
    }
  });
for (const count of [2, 3, 10])
  test(`Porcentajes exactos conservan pesos con ${count} personas`, (h) => {
    h.select("#count-select", String(count));
    expense(h, "Proporciones", "101");
    h.click('[data-route="split"]');
    h.click('[data-split="percentage"]');
    const unit = Math.floor(10000 / count),
      extra = 10000 % count;
    for (let i = 0; i < count; i++)
      h.input(
        `[data-allocation="${String.fromCharCode(97 + i)}"]`,
        ((unit + (i < extra ? 1 : 0)) / 100).toFixed(2),
      );
    assert.equal(h.q("#apply-split").disabled, false);
    h.click('[data-action="apply-split"]');
    h.submit("#expense-form");
    const row = [...h.doc.querySelectorAll("[data-expense]")].find((el) =>
      el.textContent.includes("Proporciones"),
    );
    row.click();
    const section = [...h.doc.querySelectorAll("section")].find((el) =>
      el.textContent.includes("Cómo se reparte"),
    );
    assert.equal(
      [...section.querySelectorAll(".summary-line strong")].reduce(
        (sum, el) => sum + amount(el.textContent),
        0,
      ),
      101,
    );
  });
test("Importes específicos validan suma exacta al editar total", (h) => {
  expense(h, "Exacto", "100");
  h.click('[data-route="split"]');
  h.click('[data-split="fixed"]');
  h.input('[data-allocation="a"]', "50");
  h.input('[data-allocation="b"]', "25");
  h.input('[data-allocation="c"]', "25");
  h.click('[data-action="apply-split"]');
  h.input("#expense-amount", "101");
  h.submit("#expense-form");
  assert.equal(h.q("#form-error").hidden, false);
  assert.equal(h.q("#expense-amount").value, "101");
});
test("Aportes de varios pagadores incorrectos no se aplican", (h) => {
  expense(h, "Varias personas", "100");
  h.click('[data-route="payers"]');
  h.click('[data-payer="b"]');
  h.input('[data-contribution="a"]', "50");
  h.input('[data-contribution="b"]', "49");
  h.click('[data-action="apply-payers"]');
  assert.equal(h.q("#screen-select").value, "payers");
  assert.match(h.text(), /Faltan \$1/);
});
test("Presupuesto cero se distingue de no definido", (h) => {
  h.route("budget-edit");
  h.input("#budget-total", "0");
  h.submit("#budget-form");
  assert.ok(h.q("[data-budget-total]"));
  assert.match(h.text(), /250\.000/);
});
test("Presupuesto sin total no inventa cupo", (h) => {
  h.scenario("no-budget");
  h.route("home");
  assert.match(h.q("[data-daily-context]").textContent, /Sin cupo/);
  h.route("budget");
  assert.equal(h.doc.querySelector("[data-budget-total]"), null);
});
test("Abonos sugeridos, presupuesto y costo son coherentes después de liquidar", (h) => {
  h.route("balance");
  for (const payment of ["b,a,20000", "b,c,10000"]) {
    h.click(`[data-payment="${payment}"]`);
    h.submit("#payment-form");
  }
  assert.match(h.text(), /No hay transferencias pendientes/);
  h.route("budget");
  assert.equal(amount(h.q("[data-budget-available]").textContent), 150000);
  assert.equal(amount(h.q("[data-daily-spent]").textContent), 250000);
});
for (const scenario of [
  "synced",
  "offline",
  "pending",
  "syncing",
  "error",
  "conflict",
  "expired",
  "revoked",
])
  test(`Estado simulado ${scenario} conserva información y restricciones`, (h) => {
    h.scenario(scenario);
    h.route(["expired", "revoked"].includes(scenario) ? "join" : "activity");
    if (["expired", "revoked"].includes(scenario))
      assert.equal(h.q('#join-form button[type="submit"]').disabled, true);
    if (["pending", "syncing", "error", "offline"].includes(scenario)) {
      assert.equal(h.doc.querySelectorAll("[data-local-change]").length, 2);
      assert.ok(h.text().includes("Almuerzo"));
      assert.ok(h.text().includes("Bruno"));
    }
    assert.doesNotMatch(h.text(), /undefined|NaN|Infinity/);
  });
for (const action of ["demo-camera", "demo-gallery", "openverse"])
  test(`Acceso simulado ${action} no invoca servicios reales`, (h) => {
    let calls = 0;
    h.win.fetch = () => {
      calls++;
      throw Error("No debe consultar API");
    };
    h.win.navigator.mediaDevices = {
      getUserMedia() {
        calls++;
        throw Error("No debe abrir cámara");
      },
    };
    expense(h);
    h.click('[data-action="photo"]');
    h.click(`[data-action="${action}"]`);
    assert.equal(calls, 0);
    if (action === "openverse") {
      assert.equal(h.q("#sheet").open, true);
      assert.match(h.q("#sheet").textContent, /no consulta la API/);
      h.click('[data-action="openverse-error"]');
    } else assert.match(h.q(".image-access").textContent, /seleccionada/);
  });
test("Recuperar acceso usa mensaje neutro y devuelve al login", (h) => {
  h.route("reset");
  h.input("#auth-email", "test@example.invalid");
  h.submit("#auth-form");
  assert.equal(h.q("#sheet").open, true);
  assert.match(h.q("#sheet").textContent, /si la cuenta existe/);
  h.click('#sheet [data-route="login"]');
  assert.equal(h.q("#screen-select").value, "login");
  assert.equal(h.q("#sheet").open, false);
});
test("Crear cuenta, verificar y consultar viajes funciona como simulación", (h) => {
  h.route("signup");
  h.input("#auth-name", "Persona ficticia");
  h.input("#auth-email", "test@example.invalid");
  h.input("#auth-password", "ficticia123");
  h.submit("#auth-form");
  assert.equal(h.q("#screen-select").value, "verify");
  h.click('[data-action="verified"]');
  assert.equal(h.q("#screen-select").value, "trips");
});
test("Entrada anónima de ejemplo requiere aceptación y no correo", (h) => {
  h.route("join");
  assert.equal(h.doc.querySelector('input[type="email"]'), null);
  h.input("#invite-code", "CODIGO-FICTICIO");
  h.input("#guest-name", "Invitada");
  h.submit("#join-form");
  assert.equal(h.q("#form-error").hidden, false);
  h.click("#guest-warning");
  h.submit("#join-form");
  assert.equal(h.q("#screen-select").value, "home");
  assert.equal(h.q("#role-select").value, "member");
});
test("Volver de un borrador abre confirmación también con popstate", (h) => {
  expense(h, "Borrador", "100");
  h.win.history.replaceState(null, "", "#home");
  h.win.dispatchEvent(new h.win.PopStateEvent("popstate"));
  assert.equal(h.q("#sheet").open, true);
  assert.equal(h.q("#screen-select").value, "expense");
  h.click('[data-action="dismiss"]');
  assert.equal(h.win.location.hash, "#expense");
  h.win.history.replaceState(null, "", "#trips");
  h.win.dispatchEvent(new h.win.PopStateEvent("popstate"));
  h.click('[data-action="leave-draft"]');
  assert.equal(h.q("#screen-select").value, "trips");
  assert.equal(h.win.location.hash, "#trips");
  h.route("expense");
  assert.equal(h.q("#expense-title").value, "Borrador");
});
test("Volver al URL inicial sin hash abre Inicio", (h) => {
  h.route("trips");
  h.win.history.replaceState(null, "", "/index.html");
  h.win.dispatchEvent(new h.win.PopStateEvent("popstate"));
  assert.equal(h.q("#screen-select").value, "home");
});
test("Selección de escenarios no hereda una fecha de viaje incompatible", (h) => {
  h.route("create");
  h.input("#trip-name", "Diciembre");
  h.input("#trip-start", "2026-12-01");
  h.input("#trip-end", "2026-12-04");
  h.submit("#create-form");
  h.select("#count-select", "3");
  h.scenario("synced");
  h.route("detail");
  h.click('[data-action="edit-expense"]');
  assert.equal(h.q("#expense-date").value, "2026-12-01");
  h.submit("#expense-form");
  assert.equal(h.q("#screen-select").value, "home");
});
test("Un timer antiguo no confirma operaciones de un escenario nuevo", (h) => {
  const timers = [];
  h.win.setTimeout = (callback, delay) => {
    timers.push({ callback, delay });
    return timers.length;
  };
  h.scenario("pending");
  h.route("activity");
  h.click('[data-action="sync"]');
  const old = timers.find((timer) => timer.delay === 900);
  h.scenario("pending");
  h.route("activity");
  h.click('[data-action="sync"]');
  old.callback();
  assert.equal(h.q("#state-select").value, "syncing");
  assert.ok(
    [...h.doc.querySelectorAll("[data-local-change]")].every(
      (el) => el.dataset.delivery === "syncing",
    ),
  );
});
test("Abrir detalle vacío mantiene un encabezado principal accesible", (h) => {
  h.scenario("empty");
  h.route("detail");
  assert.equal(h.doc.querySelectorAll("#main h1").length, 1);
});
test("23 rutas conservan jerarquía de encabezados en ambos temas", (h) => {
  const routes = [...h.q("#screen-select").options].map(
    (option) => option.value,
  );
  for (const theme of ["light", "dark"]) {
    if (h.doc.documentElement.dataset.theme !== theme) h.click("#theme-toggle");
    for (const route of routes) {
      h.route(route);
      const headings = [...h.q("#main").querySelectorAll("h1,h2,h3,h4,h5,h6")];
      assert.equal(
        headings.filter((el) => el.tagName === "H1").length,
        1,
        route,
      );
      assert.equal(headings[0].tagName, "H1", route);
      let previous = 0;
      for (const heading of headings) {
        assert.ok(
          heading.textContent.trim(),
          `${route}: encabezado con nombre`,
        );
        const level = Number(heading.tagName.slice(1));
        assert.ok(
          level <= previous + 1,
          `${route}: salto de nivel ${previous}→${level}`,
        );
        previous = level;
      }
    }
  }
});
test("Cerrar con deuda conserva consulta, bloquea gastos y presupuesto", (h) => {
  h.route("summary");
  h.click('[data-action="confirm-close"]');
  h.click('[data-action="do-close"]');
  h.route("expense");
  assert.equal(h.q('#expense-form button[type="submit"]').disabled, true);
  h.route("budget-edit");
  assert.equal(h.q('#budget-form button[type="submit"]').disabled, true);
});

const report = {
  scope: "DOM y comportamiento simulado en JSDOM; sin layout ni navegador real",
  run,
  executed: results.length,
  passed: results.filter((r) => r.status === "passed").length,
  failed: results.filter((r) => r.status === "failed").length,
  results,
};
fs.writeFileSync(
  path.join(__dirname, `extended-${run}.json`),
  JSON.stringify(report, null, 2) + "\n",
);
console.log(
  JSON.stringify({
    executed: report.executed,
    passed: report.passed,
    failed: report.failed,
  }),
);
for (const result of results.filter((r) => r.status === "failed"))
  console.log(result.name + "\n" + result.error);
process.exitCode = report.failed ? 1 : 0;
