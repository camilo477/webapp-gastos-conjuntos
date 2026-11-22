/* Pruebas DOM del prototipo, no sustituyen navegador ni pruebas del futuro motor. */
const fs = require("node:fs");
const path = require("node:path");
const assert = require("node:assert/strict");
const toolsRoot =
  process.env.DESIGN_TOOLS_DIR || "/tmp/gastos-phase1-tools/node_modules";
const { JSDOM, VirtualConsole } = require(path.join(toolsRoot, "jsdom"));
const base = path.resolve(__dirname, "../prototype");
const reportDir = process.env.DESIGN_REPORT_DIR || __dirname;
fs.mkdirSync(reportDir, { recursive: true });
const errors = [];
const consoleBridge = new VirtualConsole();
consoleBridge.on("jsdomError", (e) => errors.push(e.message));
const dom = new JSDOM(fs.readFileSync(path.join(base, "index.html"), "utf8"), {
  url: "https://prototype.invalid/index.html",
  runScripts: "outside-only",
  pretendToBeVisual: true,
  virtualConsole: consoleBridge,
});
const win = dom.window;
win.matchMedia = () => ({ matches: false, addEventListener() {} });
win.scrollTo = () => {};
win.HTMLElement.prototype.scrollIntoView = () => {};
win.HTMLDialogElement.prototype.showModal = function () {
  this.open = true;
};
win.HTMLDialogElement.prototype.close = function () {
  this.open = false;
};
Object.defineProperty(win.navigator, "clipboard", {
  value: { writeText: async () => {} },
});
win.eval(fs.readFileSync(path.join(base, "app.js"), "utf8"));
const doc = win.document;
const q = (selector) => {
  const node = doc.querySelector(selector);
  assert.ok(node, `Existe ${selector}`);
  return node;
};
const click = (selector) => q(selector).click();
const select = (selector, value) => {
  const node = q(selector);
  node.value = value;
  node.dispatchEvent(new win.Event("change", { bubbles: true }));
};
const input = (selector, value) => {
  const node = q(selector);
  node.value = String(value);
  node.dispatchEvent(new win.Event("input", { bubbles: true }));
};
const submit = (selector) =>
  q(selector).dispatchEvent(
    new win.Event("submit", { bubbles: true, cancelable: true }),
  );
const route = (value) => select("#screen-select", value);
const scenario = (value) => select("#state-select", value);
const text = () => q("#main").textContent;
const reset = () => click("#reset-demo");
const results = [];
function test(name, fn) {
  reset();
  fn();
  assert.deepEqual(errors, [], "Sin excepciones DOM");
  results.push({ name, status: "passed" });
}

test("Fixture consistente: costo, disponible y saldo personal", () => {
  assert.match(text(), /\$250\.000/);
  assert.match(text(), /\$150\.000/);
  assert.match(text(), /\$20\.000/);
  route("balance");
  assert.match(text(), /\$30\.000/);
  assert.match(text(), /\$10\.000/);
});
test("23 pantallas renderizan, tienen contenido y recursos locales existentes", () => {
  for (const option of [...q("#screen-select").options]) {
    route(option.value);
    assert.ok(text().trim().length > 40, option.value);
    for (const image of doc.querySelectorAll("#app img"))
      assert.ok(
        fs.existsSync(path.join(base, image.getAttribute("src"))),
        image.src,
      );
    for (const button of doc.querySelectorAll("#app button"))
      assert.ok(
        button.textContent.trim() || button.getAttribute("aria-label"),
        `Botón etiquetado en ${option.value}`,
      );
    for (const input of doc.querySelectorAll(
      "#app input, #app select, #app textarea",
    )) {
      assert.ok(
        input.getAttribute("aria-label") ||
          (input.id && doc.querySelector(`label[for="${input.id}"]`)) ||
          input.closest("label"),
        `Campo etiquetado en ${option.value}`,
      );
    }
  }
});
test("21 escenarios renderizan las vistas principales sin NaN", () => {
  for (const option of [...q("#state-select").options]) {
    scenario(option.value);
    for (const name of ["home", "balance", "budget", "activity", "summary"]) {
      route(name);
      assert.doesNotMatch(text(), /NaN|undefined|Infinity/);
    }
  }
});
test("Captura rápida: título, importe, reparto impar y persistencia en navegación", () => {
  route("expense");
  input("#expense-title", "Café");
  input("#expense-amount", "100");
  assert.equal(q("#my-share").textContent, "$34");
  click('[data-route="split"]');
  assert.equal(q('[data-quota="a"]').textContent, "$34");
  click('[data-action="apply-split"]');
  submit("#expense-form");
  assert.match(text(), /Café/);
  route("summary");
  assert.match(text(), /\$250\.100/);
});
test("Porcentajes: 99,99% rechazado, 100% exacto aceptado", () => {
  route("split");
  click('[data-split="percentage"]');
  for (const id of ["a", "b", "c"]) input(`[data-allocation="${id}"]`, "33,33");
  assert.equal(q("#apply-split").disabled, true);
  assert.match(text(), /99,99/);
  input('[data-allocation="c"]', "33,34");
  assert.equal(q("#apply-split").disabled, false);
  input('[data-allocation="c"]', "33,35");
  assert.equal(q("#apply-split").disabled, true);
  assert.match(text(), /100,01/);
});
test("Importes específicos: no se altera la suma ni se oculta la diferencia", () => {
  route("split");
  click('[data-split="fixed"]');
  input('[data-allocation="a"]', "35");
  assert.equal(q("#apply-split").disabled, true);
  assert.match(text(), /Sobran \$1/);
  input('[data-allocation="a"]', "34");
  assert.equal(q("#apply-split").disabled, false);
});
test("Exclusión y diez participantes mantienen asignación exacta", () => {
  route("split");
  click('[data-include="c"]');
  assert.equal(q('[data-quota="a"]').textContent, "$50");
  assert.equal(q('[data-quota="c"]').textContent, "$0");
  select("#count-select", "10");
  route("split");
  assert.equal(doc.querySelectorAll("[data-include]").length, 10);
  for (const quota of doc.querySelectorAll("[data-quota]"))
    assert.equal(quota.textContent, "$10");
});
test("Varios pagadores con aportes 60/40 suman un gasto de 100", () => {
  route("expense");
  input("#expense-title", "Compra compartida");
  input("#expense-amount", "100");
  click('[data-route="payers"]');
  click('[data-payer="b"]');
  input('[data-contribution="a"]', "60");
  input('[data-contribution="b"]', "40");
  assert.match(q("#payer-output").textContent, /Los aportes coinciden/);
  click('[data-action="apply-payers"]');
  submit("#expense-form");
  route("summary");
  assert.match(text(), /\$250\.100/);
});
test("Delete lógico conserva auditoría y restaurar devuelve el costo", () => {
  route("detail");
  click('[data-action="delete-expense"]');
  assert.equal(q("#sheet").open, true);
  click('[data-action="do-delete"]');
  assert.match(text(), /Gasto eliminado/);
  assert.match(text(), /Historial del gasto/);
  route("summary");
  assert.match(text(), /\$154\.000/);
  route("detail");
  click('[data-action="restore-expense"]');
  route("summary");
  assert.match(text(), /\$250\.000/);
});
test("Abono reduce saldo sin modificar costo y personas iguales se rechazan", () => {
  route("payment");
  input("#payment-amount", "20000");
  submit("#payment-form");
  assert.match(text(), /Tu balance está al día/);
  route("summary");
  assert.match(text(), /\$250\.000/);
  route("payment");
  select("#payment-to", "b");
  input("#payment-amount", "1");
  submit("#payment-form");
  assert.equal(q("#form-error").hidden, false);
});
test("Presupuesto 400000/4 y reserva del último día: 35000/35000/80000", () => {
  route("budget");
  assert.equal(
    [...doc.querySelectorAll(".budget-table td")].filter(
      (x) => x.textContent === "$50.000",
    ).length,
    3,
  );
  route("budget-edit");
  input("#budget-day-2026-11-24", "80000");
  submit("#budget-form");
  assert.equal(
    [...doc.querySelectorAll(".budget-table td")].filter(
      (x) => x.textContent === "$35.000",
    ).length,
    2,
  );
  assert.match(text(), /\$80\.000/);
  route("budget-edit");
  input("#budget-day-2026-11-22", "90000");
  submit("#budget-form");
  assert.equal(q("#form-error").hidden, false);
});
test("Offline admite gasto local de ejemplo y bloquea cierre", () => {
  scenario("offline");
  route("expense");
  input("#expense-title", "Sin red");
  input("#expense-amount", "100");
  submit("#expense-form");
  assert.match(text(), /Sin red/);
  route("activity");
  assert.match(text(), /cambios guardados en este dispositivo/);
  route("summary");
  assert.equal(q('[data-action="confirm-close"]').disabled, true);
});
test("Fallo de guardado no pierde formulario ni anuncia éxito", () => {
  scenario("storage-error");
  route("expense");
  input("#expense-title", "Conservar");
  input("#expense-amount", "100");
  submit("#expense-form");
  assert.match(q("#form-error").textContent, /No se pudo guardar/);
  assert.equal(q("#expense-title").value, "Conservar");
});
test("Conflicto excluye gasto hasta resolución explícita y conserva versiones", () => {
  scenario("conflict");
  route("summary");
  assert.match(text(), /\$154\.000/);
  assert.equal(q('[data-action="confirm-close"]').disabled, true);
  route("conflict");
  click('input[name="proposal"][value="100000"]');
  submit("#conflict-form");
  assert.match(text(), /Versiones conciliadas/);
  route("summary");
  assert.match(text(), /\$254\.000/);
  route("activity");
  assert.match(text(), /Ambas propuestas se conservaron/);
});
test("Duplicados cuentan por separado hasta unificar con confirmación", () => {
  scenario("duplicate");
  route("summary");
  assert.match(text(), /\$274\.000/);
  route("duplicate");
  click('[data-action="confirm-merge"]');
  click('[data-action="do-merge"]');
  route("summary");
  assert.match(text(), /\$262\.000/);
  route("activity");
  assert.match(text(), /ambos registros conservados/);
});
test("Son distintos conserva ambos cafés", () => {
  scenario("duplicate");
  route("duplicate");
  click('[data-action="distinct"]');
  route("summary");
  assert.match(text(), /\$274\.000/);
});
test("Rol participante no modifica presupuesto ni finaliza viaje", () => {
  select("#role-select", "member");
  route("budget-edit");
  assert.equal(q('#budget-form button[type="submit"]').disabled, true);
  route("summary");
  assert.equal(doc.querySelector('[data-action="confirm-close"]'), null);
});
test("Invitación revocada y grupo completo tienen CTA bloqueada", () => {
  scenario("revoked");
  route("join");
  assert.equal(q('#join-form button[type="submit"]').disabled, true);
  select("#count-select", "10");
  route("invite");
  assert.match(text(), /El grupo está completo/);
});
test("Creación usa un organizador e invitaciones posteriores", () => {
  route("create");
  input("#trip-name", "Salida de un día");
  input("#trip-start", "2026-12-01");
  input("#trip-end", "2026-12-01");
  submit("#create-form");
  assert.match(text(), /1 de 10 lugares/);
  assert.equal(doc.querySelectorAll(".member-row").length, 1);
  route("home");
  assert.match(text(), /1 día/);
  assert.match(text(), /Salida de un día/);
});
test("Cierre confirmado conserva consulta y deshabilita gastos nuevos", () => {
  route("summary");
  click('[data-action="confirm-close"]');
  click('[data-action="do-close"]');
  assert.match(text(), /El viaje queda en la memoria/);
  route("home");
  assert.equal(q(".fab").disabled, true);
});
test("Modo oscuro y nombres/importes largos conservan todo el contenido", () => {
  click("#theme-toggle");
  assert.equal(doc.documentElement.dataset.theme, "dark");
  scenario("long");
  assert.match(text(), /123\.456\.943\.012/);
  route("invite");
  assert.match(text(), /Ana María Rodríguez de los Ríos/);
});

test("Cambiar tema conserva formularios sin remontarlos", () => {
  route("create");
  input("#trip-name", "Mi borrador");
  const before = q("#trip-name");
  click("#theme-toggle");
  assert.equal(q("#trip-name"), before);
  assert.equal(q("#trip-name").value, "Mi borrador");
});
test("Un organizador esperando invitados puede recorrer escenarios sin datos huérfanos", () => {
  select("#count-select", "1");
  for (const name of [
    "home",
    "balance",
    "budget",
    "invite",
    "activity",
    "summary",
    "conflict",
    "duplicate",
  ]) {
    route(name);
    assert.doesNotMatch(text(), /NaN|undefined|Infinity/);
  }
  scenario("full");
  assert.equal(q("#count-select").value, "10");
  assert.equal(doc.querySelectorAll(".member-row").length, 10);
});
test("Texto ingresado se muestra como texto y no como HTML ejecutable", () => {
  route("expense");
  input("#expense-title", '<img src=x onerror="alert(1)">');
  input("#expense-amount", "100");
  submit("#expense-form");
  assert.match(text(), /<img src=x/);
  assert.equal(doc.querySelector("#app img[onerror]"), null);
});

const readMoney = (value) =>
  Number(String(value).replace(/[^0-9]/g, "")) *
  (String(value).includes("−") ? -1 : 1);
const dailyValue = (name) => readMoney(q(`[data-daily-${name}]`).textContent);

test("Presupuesto diario completo: 400000, 150000 disponibles, cupo100000 y exceso150000", () => {
  assert.match(q("[data-daily-context]").textContent, /Cupo \$100\.000/);
  assert.match(q("[data-daily-context]").textContent, /Exceso \$150\.000/);
  assert.equal(doc.querySelectorAll(".metric-pair .metric").length, 2);
  route("budget");
  assert.equal(readMoney(q("[data-budget-total]").textContent), 400000);
  assert.equal(readMoney(q("[data-budget-available]").textContent), 150000);
  assert.equal(dailyValue("assigned"), 100000);
  assert.equal(dailyValue("spent"), 250000);
  assert.equal(dailyValue("difference"), 150000);
  assert.match(q("[data-redistribution]").textContent, /\$50\.000 por día/);
  assert.deepEqual(
    [...doc.querySelectorAll(".budget-table tbody tr")]
      .slice(1)
      .map((row) => readMoney(row.lastElementChild.textContent)),
    [50000, 50000, 50000],
  );
});
test("Ahorro diario provisional y redistribución impar conservan dinero", () => {
  for (const id of ["e1", "e3"]) {
    route("home");
    click(`[data-expense="${id}"]`);
    click('[data-action="delete-expense"]');
    click('[data-action="do-delete"]');
  }
  route("budget");
  assert.equal(dailyValue("spent"), 84000);
  assert.equal(dailyValue("difference"), 16000);
  assert.match(text(), /Ahorro provisional/);
  const values = [...doc.querySelectorAll(".budget-table tbody tr")]
    .slice(1)
    .map((row) => readMoney(row.lastElementChild.textContent));
  assert.equal(
    values.reduce((a, b) => a + b, 0),
    316000,
  );
  assert.ok(Math.max(...values) - Math.min(...values) <= 1);
});
test("Pagos sugeridos completos liquidan los saldos para 2, 3 y 10 personas", () => {
  for (const count of ["2", "3", "10"]) {
    select("#count-select", count);
    route("balance");
    const residual = [...doc.querySelectorAll(".payment-row")].map(
      (row) =>
        readMoney(row.querySelector(".payment-amount").firstChild.textContent) *
        (row.querySelector(".payment-amount small").textContent ===
        "Por aportar"
          ? -1
          : 1),
    );
    for (const el of doc.querySelectorAll("[data-payment]")) {
      const [from, to, amount] = el.dataset.payment.split(",");
      residual[from.charCodeAt(0) - 97] += Number(amount);
      residual[to.charCodeAt(0) - 97] -= Number(amount);
    }
    assert.ok(
      residual.every((value) => value === 0),
      `Liquidación exacta para ${count}`,
    );
  }
});
test("Registrar Bruno→Ana20000 y Bruno→Carla10000 deja los tres saldos en cero", () => {
  route("balance");
  assert.deepEqual(
    [...doc.querySelectorAll("[data-payment]")].map(
      (button) => button.dataset.payment,
    ),
    ["b,a,20000", "b,c,10000"],
  );
  click('[data-payment="b,a,20000"]');
  submit("#payment-form");
  click('[data-payment="b,c,10000"]');
  submit("#payment-form");
  assert.equal(doc.querySelectorAll("[data-payment]").length, 0);
  assert.ok(
    [...doc.querySelectorAll(".payment-amount")].every(
      (node) => readMoney(node.firstChild.textContent) === 0,
    ),
  );
  route("summary");
  assert.match(text(), /\$250\.000/);
});
test("Opciones secundarias progresivas, cámara/galería/stock y fechas reales", () => {
  route("expense");
  input("#expense-title", "Con foto");
  input("#expense-amount", "100");
  assert.equal(q("#expense-options").open, false);
  assert.equal(q("#expense-date").min, "2026-11-21");
  assert.equal(q("#expense-date").max, "2026-11-24");
  click('[data-action="photo"]');
  for (const action of ["demo-camera", "demo-gallery", "openverse"])
    assert.ok(q(`#sheet [data-action="${action}"]`));
  click('[data-action="demo-gallery"]');
  assert.equal(q("#sheet").open, false);
  assert.match(q(".image-access").textContent, /seleccionada/);
  assert.equal(doc.activeElement, q(".image-access"));
  submit("#expense-form");
  assert.match(text(), /Con foto/);
});
test("Pendientes identificables en cada movimiento y en la lista de operaciones", () => {
  for (const status of ["pending", "offline", "syncing", "error"]) {
    scenario(status);
    route("home");
    assert.ok(q('[data-expense="e1"] [data-delivery]'));
    route("activity");
    assert.equal(doc.querySelectorAll("[data-local-change]").length, 2);
    assert.match(text(), /Crear «Almuerzo en la plaza»/);
    assert.match(text(), /Registrar abono Bruno → Ana/);
    assert.equal(
      q("[data-local-change]").dataset.delivery,
      status === "syncing"
        ? "syncing"
        : status === "error"
          ? "error"
          : "pending",
    );
  }
});
test("Un gasto nuevo offline se identifica individualmente y conserva el contador", () => {
  scenario("offline");
  route("expense");
  input("#expense-title", "Taxi sin red");
  input("#expense-amount", "12000");
  submit("#expense-form");
  const row = [...doc.querySelectorAll(".movement")].find((el) =>
    el.textContent.includes("Taxi sin red"),
  );
  assert.match(row.textContent, /Pendiente de envío/);
  route("activity");
  assert.equal(doc.querySelectorAll("[data-local-change]").length, 3);
  assert.match(text(), /Taxi sin red/);
});
test("Sincronizar no elimina conflictos ni declara completos los datos parciales", () => {
  for (const value of ["conflict", "partial"]) {
    scenario(value);
    route("activity");
    click('[data-action="sync"]');
    assert.equal(q("#state-select").value, value);
    route("summary");
    assert.match(text(), /provisional/);
    assert.equal(q('[data-action="confirm-close"]').disabled, true);
  }
});
test("Confirmación simulada no absorbe operaciones creadas después de iniciar el envío", () => {
  scenario("pending");
  route("activity");
  const timers = [];
  const original = win.setTimeout;
  win.setTimeout = (callback, delay) => {
    timers.push({ callback, delay });
    return 99999;
  };
  try {
    click('[data-action="sync"]');
    assert.equal(q("[data-local-change]").dataset.delivery, "syncing");
    route("expense");
    input("#expense-title", "Nuevo durante envío");
    input("#expense-amount", "300");
    submit("#expense-form");
    timers.find((timer) => timer.delay === 900).callback();
    route("activity");
    assert.equal(
      doc.querySelectorAll('[data-local-change][data-delivery="confirmed"]')
        .length,
      2,
    );
    assert.equal(
      doc.querySelectorAll('[data-local-change][data-delivery="pending"]')
        .length,
      1,
    );
    assert.equal(q("#state-select").value, "pending");
  } finally {
    win.setTimeout = original;
  }
});
test("Botón fijo alterna tamaño sin perder el contenido y desaparece al abrir formulario", () => {
  assert.ok(q(".has-add-dock .workspace"));
  assert.equal(q(".add-dock").dataset.variant, "dock");
  const main = q("#main");
  select("#add-placement", "compact");
  assert.equal(q(".add-dock").dataset.variant, "compact");
  assert.equal(q("#main"), main);
  select("#add-placement", "dock");
  click(".fab");
  assert.equal(q("#screen-select").value, "expense");
  assert.equal(doc.querySelector(".add-dock"), null);
  assert.equal(doc.querySelector(".bottom-nav"), null);
});
test("Selección de reparto y pagadores mantiene el foco de teclado", () => {
  route("split");
  click('[data-include="c"]');
  assert.equal(doc.activeElement, q("#include-c"));
  click('[data-split="fixed"]');
  assert.equal(doc.activeElement, q('[data-split="fixed"]'));
  route("payers");
  click('[data-payer="b"]');
  assert.equal(doc.activeElement, q("#payer-b"));
});
test("23 pantallas revisadas en ambos temas: etiquetas, recursos, IDs y ausencia de cifras inválidas", () => {
  const routes = [...q("#screen-select").options].map((option) => option.value);
  for (const theme of ["light", "dark"]) {
    if (doc.documentElement.dataset.theme !== theme) click("#theme-toggle");
    for (const name of routes) {
      route(name);
      assert.doesNotMatch(text(), /NaN|undefined|Infinity/);
      const ids = [...doc.querySelectorAll("[id]")].map((el) => el.id);
      assert.equal(
        new Set(ids).size,
        ids.length,
        `${name}/${theme}: IDs únicos`,
      );
      for (const image of doc.querySelectorAll("#app img"))
        assert.ok(fs.existsSync(path.join(base, image.getAttribute("src"))));
    }
  }
});

test("La gráfica de gasto superado cruza el presupuesto y mantiene su importe exacto", () => {
  scenario("exhausted");
  route("stats");
  const point = q("[data-cumulative-total]"),
    limit = q("[data-budget-y]");
  assert.equal(Number(point.dataset.cumulativeTotal), 250000);
  assert.ok(Number(point.getAttribute("cy")) < Number(limit.dataset.budgetY));
  assert.match(text(), /\$200\.000/);
  assert.match(text(), /\$250\.000/);
});
test("La evolución usa las fechas y el gasto actual, sin futuro inventado", () => {
  route("stats");
  assert.equal(
    Number(q("[data-cumulative-total]").dataset.cumulativeTotal),
    250000,
  );
  assert.match(q("#chart-desc").textContent, /21(?: de)? nov/);
  assert.match(q("#chart-desc").textContent, /No se inventan gastos futuros/);
  assert.equal(q(".line-chart").querySelectorAll("text").length, 0);
});
test("Renovar una invitación no oculta un conflicto financiero existente", () => {
  scenario("conflict");
  route("invite");
  click('[data-action="revoke-invite"]');
  click('[data-action="do-revoke-invite"]');
  click('[data-action="new-invite"]');
  assert.equal(q("#state-select").value, "conflict");
  route("summary");
  assert.match(text(), /provisional/);
  assert.equal(q('[data-action="confirm-close"]').disabled, true);
});

reset();
route("balance");
const fixture = {
  balances: [...doc.querySelectorAll(".payment-row")].map((row) => ({
    name: row
      .querySelector(".person-label strong")
      .textContent.replace(" (tú)", ""),
    amount: readMoney(
      row.querySelector(".payment-amount").firstChild.textContent,
    ),
    direction: row.querySelector(".payment-amount small").textContent,
  })),
  suggestions: [...doc.querySelectorAll("[data-payment]")].map((el) => ({
    from: el.closest(".suggestion").querySelector(".path span:first-child")
      .textContent,
    to: el.closest(".suggestion").querySelector(".path span:last-child")
      .textContent,
    amount: Number(el.dataset.payment.split(",")[2]),
  })),
};
route("budget");
fixture.budget = {
  total: readMoney(q("[data-budget-total]").textContent),
  available: readMoney(q("[data-budget-available]").textContent),
  assigned: dailyValue("assigned"),
  spent: dailyValue("spent"),
  difference: dailyValue("difference"),
  future: [...doc.querySelectorAll(".budget-table tbody tr")]
    .slice(1)
    .map((row) => readMoney(row.lastElementChild.textContent)),
};
fs.writeFileSync(
  path.join(reportDir, "verified-fixture.json"),
  JSON.stringify(fixture, null, 2) + "\n",
);

assert.deepEqual(errors, []);
console.log(
  `${results.length} comprobaciones DOM correctas. No se ha probado layout de navegador, Firebase ni offline durable.`,
);
fs.writeFileSync(
  path.join(reportDir, "dom-results.json"),
  JSON.stringify(
    {
      scope: "Prototipo UX en JSDOM",
      checks: results.length,
      results,
      limitations: [
        "Sin renderizado de navegador",
        "Sin medición de layout o teclado virtual",
        "Sin Firebase",
        "Sin persistencia ni sincronización reales",
      ],
    },
    null,
    2,
  ) + "\n",
);
dom.window.close();
