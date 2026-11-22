/* Prototipo UX de Fase 1. Solo datos ficticios en memoria; no reutilizar como motor productivo. */
(() => {
  "use strict";
  const screens = [
    ["home", "D · Inicio del viaje"],
    ["welcome", "A · Bienvenida"],
    ["signup", "A · Crear cuenta"],
    ["login", "A · Iniciar sesión"],
    ["reset", "A · Recuperar acceso"],
    ["verify", "A · Verificar correo"],
    ["join", "A · Unirse como invitado"],
    ["trips", "B · Mis viajes"],
    ["create", "C · Crear viaje"],
    ["expense", "E · Registrar gasto"],
    ["split", "F · División del gasto"],
    ["payers", "F · Varios pagadores"],
    ["detail", "Detalle y auditoría"],
    ["balance", "G · Balance"],
    ["payment", "G · Registrar abono"],
    ["budget", "H · Presupuesto"],
    ["budget-edit", "H · Asignación manual"],
    ["stats", "I · Estadísticas"],
    ["invite", "J · Personas e invitación"],
    ["activity", "K · Actividad y sincronización"],
    ["conflict", "K · Ediciones simultáneas"],
    ["duplicate", "K · Posibles duplicados"],
    ["summary", "L · Resumen y cierre"],
  ];
  const peopleNames = [
    "Ana",
    "Bruno",
    "Carla",
    "Daniel",
    "Elena",
    "Felipe",
    "Gabriela",
    "Hugo",
    "Inés",
    "Julián",
  ];
  const cats = {
    food: ["Comida", "utensils"],
    transport: ["Transporte", "car"],
    lodging: ["Alojamiento", "bed-double"],
    activities: ["Actividades", "mountain"],
    shopping: ["Compras", "wallet"],
    other: ["Otro", "receipt"],
  };
  const $ = (s) => document.querySelector(s);
  const esc = (x) =>
    String(x ?? "").replace(
      /[&<>"']/g,
      (c) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[c],
    );
  const icon = (name) =>
    `<img class="icon" src="assets/${name}.svg" alt="" aria-hidden="true" width="21" height="21">`;
  const money = (n) =>
    `${n < 0 ? "−" : ""}$${Math.abs(n).toLocaleString("es-CO")}`;
  const parseMoney = (raw) =>
    /^\d+$/.test(String(raw).trim()) &&
    Number.isSafeInteger(Number(raw)) &&
    Number(raw) <= 1e12
      ? Number(raw)
      : NaN;
  const parsePercent = (raw) => {
    const value = String(raw).trim().replace(",", ".");
    if (!/^\d+(\.\d{1,2})?$/.test(value)) return NaN;
    const [whole, fraction = ""] = value.split(".");
    return Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
  };
  const state = {
    route: "home",
    scenario: "synced",
    role: "owner",
    count: 3,
    theme: matchMedia("(prefers-color-scheme:dark)").matches ? "dark" : "light",
    previous: "home",
    selected: "e1",
    closed: false,
    tripTitle: "Villa de Leyva",
    tripStart: "2026-11-21",
    tripEnd: "2026-11-24",
    tripZone: "America/Bogota",
    budget: 400000,
    locked: 0,
    locks: {},
    inviteRevoked: false,
    inviteGeneration: 1,
    newTrip: false,
    conflictResolved: false,
    duplicateResolved: false,
    pending: 0,
    localChanges: [],
    fixtureHistory: [],
    addButton: "dock",
    history: [],
    draft: null,
    paymentFrom: "b",
    paymentTo: "a",
  };
  let expenses = [],
    payments = [],
    toastTimer;
  let syncGeneration = 0;
  const people = () =>
    Array.from({ length: state.count }, (_, i) => ({
      id: String.fromCharCode(97 + i),
      name:
        state.scenario === "long" && i === 0
          ? "Ana María Rodríguez de los Ríos"
          : peopleNames[i],
    }));
  const person = (id) => people().find((p) => p.id === id)?.name || id;
  const initials = (name) =>
    name
      .split(" ")
      .slice(0, 2)
      .map((w) => w[0])
      .join("");
  const avatar = (p) =>
    `<span class="avatar" aria-hidden="true">${esc(initials(p.name))}</span>`;
  const isOffline = () => state.scenario === "offline";
  const isClosed = () =>
    state.closed || ["closed", "late-conflict"].includes(state.scenario);
  const isConflict = () =>
    ["conflict", "late-conflict"].includes(state.scenario) &&
    !state.conflictResolved &&
    expenses.some((expense) => expense.id === "e1");
  const isProvisional = () =>
    isOffline() ||
    ["partial", "pending", "syncing", "error"].includes(state.scenario) ||
    isConflict() ||
    state.pending > 0;
  const owner = () => state.role === "owner";
  function equal(total, ids) {
    const ordered = [...ids].sort();
    const base = Math.floor(total / ids.length),
      extra = total % ids.length;
    return Object.fromEntries(
      ordered.map((id, i) => [id, base + (i < extra ? 1 : 0)]),
    );
  }
  function seed() {
    syncGeneration++;
    state.localChanges = [];
    state.fixtureHistory = [];
    if (state.count === 1) {
      expenses = [];
      payments = [];
      state.draft = null;
      state.history = [];
      state.pending = 0;
      state.conflictResolved = false;
      state.duplicateResolved = false;
      return;
    }
    const ids = people().map((p) => p.id),
      third = ids[2] || "b";
    expenses = [
      {
        id: "e1",
        title: "Almuerzo en la plaza",
        total: 96000,
        category: "food",
        payers: { a: 96000 },
        shares: equal(96000, ids),
        time: "13:10",
        note: "Menú para compartir",
        day: today(),
      },
      {
        id: "e2",
        title: "Mercado para la casa",
        total: 84000,
        category: "food",
        payers: { a: 34000, b: 50000 },
        shares: equal(84000, ids),
        time: "11:45",
        note: "Desayunos y algo para el camino",
        day: today(),
      },
      {
        id: "e3",
        title: "Gasolina",
        total: 70000,
        category: "transport",
        payers: { [third]: 70000 },
        shares: equal(70000, ["a", "b"]),
        time: "09:20",
        note: "Ana y Bruno comparten este trayecto",
        day: today(),
      },
    ];
    payments = [{ id: "p1", from: "b", to: "a", amount: 15000, time: "14:25" }];
    if (state.scenario === "duplicate") {
      for (let i = 0; i < 2; i++)
        expenses.push({
          id: `c${i}`,
          title: "Café en la plaza",
          total: 12000,
          category: "food",
          payers: { a: 12000 },
          shares: equal(12000, ids),
          time: `15:0${i}`,
          note: "",
          day: today(),
        });
    }
    if (state.scenario === "exhausted") state.budget = 200000;
    if (state.scenario === "long")
      expenses[0] = {
        ...expenses[0],
        title:
          "Almuerzo de bienvenida para todo el grupo en la plaza principal",
        total: 123456789012,
        payers: { a: 123456789012 },
        shares: equal(123456789012, ids),
      };
    if (["empty"].includes(state.scenario) || state.newTrip) {
      expenses = [];
      payments = [];
    }
    state.draft = null;
    state.history = [];
    state.pending = 0;
    state.conflictResolved = false;
    state.duplicateResolved = false;
    state.fixtureHistory = [
      ...expenses.map((expense) => ({
        label: `Se añadió «${expense.title}» por ${money(expense.total)}.`,
        sub: `${dayLabel(expense.day)} · ${expense.time} · registro de ejemplo`,
        icon: "receipt",
      })),
      ...payments.map((payment) => ({
        label: `${person(payment.from)} registró un abono a ${person(payment.to)} por ${money(payment.amount)}.`,
        sub: `${dayLabel(payment.day || today())} · ${payment.time}`,
        icon: "arrow-left-right",
      })),
    ];
    if (
      ["offline", "pending", "syncing", "error"].includes(state.scenario) &&
      expenses.length
    ) {
      const status =
        state.scenario === "syncing"
          ? "syncing"
          : state.scenario === "error"
            ? "error"
            : "pending";
      state.localChanges = [
        {
          id: "sample-expense",
          entity: "e1",
          label: "Crear «Almuerzo en la plaza» · $96.000",
          status,
        },
        {
          id: "sample-payment",
          entity: "p1",
          label: "Registrar abono Bruno → Ana · $15.000",
          status,
        },
      ];
      state.pending = state.localChanges.length;
    }
  }
  const effective = () =>
    expenses.filter(
      (e) => !e.deleted && !e.merged && !(isConflict() && e.id === "e1"),
    );
  const cost = () => effective().reduce((sum, e) => sum + e.total, 0);
  const noBudget = () =>
    state.scenario === "no-budget" || state.budget === null;
  const available = () => (noBudget() ? null : state.budget - cost());
  const tripDays = () => {
    const result = [];
    for (
      let t = Date.parse(state.tripStart), end = Date.parse(state.tripEnd);
      t <= end && result.length < 366;
      t += 86400000
    )
      result.push(new Date(t).toISOString().slice(0, 10));
    return result;
  };
  const today = () =>
    "2026-11-21" < state.tripStart
      ? state.tripStart
      : "2026-11-21" > state.tripEnd
        ? state.tripEnd
        : "2026-11-21";
  const dayLabel = (day) =>
    new Date(day + "T12:00:00Z").toLocaleDateString("es-CO", {
      day: "numeric",
      month: "short",
      timeZone: "UTC",
    });
  const todayCost = () =>
    effective()
      .filter((e) => e.day === today())
      .reduce((sum, e) => sum + e.total, 0);
  const tripDescription = () =>
    `${dayLabel(state.tripStart)}–${dayLabel(state.tripEnd)} · ${tripDays().length} ${tripDays().length === 1 ? "día" : "días"} · COP`;
  function budgetSchedule() {
    const days = tripDays(),
      locks = state.locks || {},
      future = days.filter((d) => d > today()),
      pastSpent = effective()
        .filter((e) => e.day < today())
        .reduce((s, e) => s + e.total, 0);
    const reserved = future.reduce((sum, d) => sum + (locks[d] || 0), 0);
    const autoDays = future.filter((d) => !(d in locks));
    const remaining = Math.max(0, (available() || 0) - reserved);
    const futureValues = autoDays.length ? equal(remaining, autoDays) : {};
    const openDays = days.filter((day) => day >= today());
    const unlocked = openDays.filter((d) => !(d in locks));
    const currentPool = Math.max(
      0,
      (state.budget || 0) -
        pastSpent -
        openDays.reduce((sum, day) => sum + (locks[day] || 0), 0),
    );
    const currentValues = unlocked.length ? equal(currentPool, unlocked) : {};
    const initial = !noBudget() ? equal(state.budget, days) : {};
    return {
      days,
      locks,
      reserved,
      deficit: Math.max(0, reserved - Math.max(0, available() || 0)),
      initial,
      current: locks[today()] ?? currentValues[today()] ?? 0,
      rows: days.map((day) => ({
        day,
        initial: initial[day] || 0,
        spent: effective()
          .filter((e) => e.day === day)
          .reduce((s, e) => s + e.total, 0),
        future: day > today() ? (locks[day] ?? futureValues[day] ?? 0) : null,
        fixed: day in locks,
      })),
    };
  }
  function balances() {
    const rows = Object.fromEntries(
      people().map((p) => [p.id, { ...p, paid: 0, share: 0, balance: 0 }]),
    );
    for (const e of effective()) {
      for (const [id, value] of Object.entries(e.payers))
        rows[id].paid += value;
      for (const [id, value] of Object.entries(e.shares))
        rows[id].share += value;
    }
    for (const p of payments) {
      rows[p.from].balance += p.amount;
      rows[p.to].balance -= p.amount;
    }
    return Object.values(rows).map((p) => ({
      ...p,
      balance: p.balance + p.paid - p.share,
    }));
  }
  function dailyBudgetContext() {
    if (noBudget()) return "Sin cupo diario definido";
    const assigned = budgetSchedule().current;
    const difference = assigned - todayCost();
    return `Cupo ${money(assigned)} · ${difference < 0 ? `Exceso ${money(-difference)}` : difference > 0 ? `${money(difference)} bajo el cupo` : "En el cupo"}`;
  }
  const pendingChanges = () =>
    state.localChanges.filter((change) => change.status !== "confirmed");
  const deliveryText = (status) =>
    ({
      pending: "Pendiente de envío",
      syncing: "Enviando",
      error: "Envío sin confirmar",
      confirmed: "Confirmado",
    })[status];
  function deliveryBadge(entity) {
    const change = [...pendingChanges()]
      .reverse()
      .find((entry) => entry.entity === entity);
    return change
      ? `<span class="delivery-label" data-delivery="${change.status}">${icon(change.status === "error" ? "circle-alert" : change.status === "syncing" ? "refresh-cw" : "cloud-upload")}${deliveryText(change.status)}</span>`
      : "";
  }
  const myBalance = () => balances().find((p) => p.id === "a")?.balance || 0;
  function suggestions() {
    const rows = balances();
    const debt = rows
      .filter((p) => p.balance < 0)
      .map((p) => ({ ...p, left: -p.balance }))
      .sort((a, b) => b.left - a.left || a.id.localeCompare(b.id));
    const credit = rows
      .filter((p) => p.balance > 0)
      .map((p) => ({ ...p, left: p.balance }))
      .sort((a, b) => b.left - a.left || a.id.localeCompare(b.id));
    const result = [];
    let i = 0,
      j = 0;
    while (i < debt.length && j < credit.length) {
      const amount = Math.min(debt[i].left, credit[j].left);
      result.push({ from: debt[i].id, to: credit[j].id, amount });
      debt[i].left -= amount;
      credit[j].left -= amount;
      if (!debt[i].left) i++;
      if (!credit[j].left) j++;
    }
    return result;
  }
  function draft() {
    if (!state.draft)
      state.draft = {
        title: "",
        amount: "",
        category: "other",
        note: "",
        date: today(),
        time: "15:00",
        split: "equal",
        included: people().map((p) => p.id),
        weights: {},
        fixed: {},
        payers: { a: "" },
        payerIds: ["a"],
        photo: false,
      };
    return state.draft;
  }
  function splitData() {
    const d = draft(),
      total = parseMoney(d.amount),
      ids = d.included;
    if (!Number.isFinite(total) || total < 1)
      return {
        valid: false,
        error: "Escribe un importe positivo en pesos enteros.",
        shares: {},
        assigned: 0,
      };
    if (!ids.length)
      return {
        valid: false,
        error: "Incluye al menos una persona.",
        shares: {},
        assigned: 0,
      };
    if (d.split === "equal")
      return { valid: true, shares: equal(total, ids), assigned: total };
    if (d.split === "fixed") {
      const shares = Object.fromEntries(
        ids.map((id) => [id, parseMoney(d.fixed[id] ?? "0")]),
      );
      const assigned = Object.values(shares).reduce((a, b) => a + b, 0);
      return {
        valid: Number.isFinite(assigned) && assigned === total,
        shares,
        assigned: Number.isFinite(assigned) ? assigned : 0,
        error: Number.isFinite(assigned)
          ? `La suma debe ser ${money(total)}. ${assigned < total ? "Faltan" : "Sobran"} ${money(Math.abs(total - assigned))}.`
          : "Usa importes enteros y positivos o cero.",
      };
    }
    const weights = ids.map((id) => ({
      id,
      value: parsePercent(d.weights[id] ?? "0"),
    }));
    const sum = weights.reduce((a, w) => a + w.value, 0);
    if (
      !Number.isFinite(sum) ||
      weights.some((w) => w.value > 10000) ||
      sum !== 10000
    )
      return {
        valid: false,
        shares: {},
        assigned: 0,
        percent: Number.isFinite(sum) ? sum : 0,
        error: `Los porcentajes deben sumar 100%. Ahora suman ${Number.isFinite(sum) ? (sum / 100).toLocaleString("es-CO", { minimumFractionDigits: 2 }) : "un valor inválido"}%.`,
      };
    const big = BigInt(total);
    let assigned = 0;
    const q = weights
      .map((w) => {
        const value = Number((big * BigInt(w.value)) / 10000n);
        assigned += value;
        return {
          ...w,
          amount: value,
          remainder: (big * BigInt(w.value)) % 10000n,
        };
      })
      .sort((a, b) =>
        a.remainder === b.remainder
          ? a.id.localeCompare(b.id)
          : a.remainder > b.remainder
            ? -1
            : 1,
      );
    for (let i = 0; i < total - assigned; i++) q[i].amount++;
    return {
      valid: true,
      shares: Object.fromEntries(q.map((w) => [w.id, w.amount])),
      assigned: total,
      percent: sum,
    };
  }
  const button = (label, action, kind = "primary", extra = "") =>
    `<button type="button" class="button ${kind}" data-action="${action}" ${extra}>${label}</button>`;
  const linkButton = (label, route, kind = "quiet") =>
    `<button type="button" class="button ${kind}" data-route="${route}">${label}</button>`;
  function note(title, text, tone = "", action = "") {
    return `<div class="note ${tone}">${icon(tone === "error" ? "circle-alert" : tone === "warning" ? "triangle-alert" : "circle-help")}<div>${title ? `<strong>${title}</strong>` : ""}<p>${text}</p>${action}</div></div>`;
  }
  function heading(title, sub = "", action = "", eyebrow = "") {
    return `<div class="page-heading"><div>${eyebrow ? `<div class="eyebrow">${eyebrow}</div>` : ""}<h1>${title}</h1>${sub ? `<p>${sub}</p>` : ""}</div>${action ? `<div class="heading-actions">${action}</div>` : ""}</div>`;
  }
  const routeBack = (label = "Volver", route = "home") =>
    `<button type="button" class="route-back" data-route="${route}">${icon("arrow-left")}${label}</button>`;
  function inputField(id, label, value = "", opts = {}) {
    return `<div class="field"><label for="${id}">${label}</label><input id="${id}" name="${id}" type="${opts.type || "text"}" value="${esc(value)}" ${opts.help ? `aria-describedby="${id}-help"` : ""} ${opts.attrs || ""}>${opts.help ? `<span class="field-help" id="${id}-help">${opts.help}</span>` : ""}</div>`;
  }
  function statusInfo() {
    if (state.scenario === "loading") return ["clock", "Cargando datos", ""];
    if (isConflict()) return ["circle-alert", "Conflicto pendiente", "bad"];
    if (isOffline()) return ["wifi-off", "Sin conexión", "warn"];
    if (state.scenario === "partial")
      return ["circle-alert", "Datos incompletos", "warn"];
    if (state.scenario === "error")
      return ["circle-alert", "Error de sincronización", "bad"];
    if (state.scenario === "syncing")
      return ["refresh-cw", "Sincronizando", ""];
    if (state.pending || state.scenario === "pending")
      return [
        "cloud-upload",
        `${pendingChanges().length} cambios pendientes`,
        "warn",
      ];
    return ["check-check", "Sincronizado", ""];
  }
  function notice() {
    if (isConflict())
      return note(
        "Saldo provisional",
        "Hay dos versiones de un gasto. Este gasto está fuera del subtotal hasta revisarlo.",
        "warning",
        linkButton("Revisar versiones", "conflict"),
      );
    if (state.scenario === "partial")
      return note(
        "Solo una parte del viaje",
        "El saldo y el presupuesto están incompletos. Conéctate para descargar el resto.",
        "warning",
      );
    if (isOffline())
      return note(
        "Puedes seguir registrando",
        "Vista local provisional. Los cambios se enviarán cuando vuelvas a abrir la app con conexión.",
        "",
        linkButton("Ver cambios locales", "activity"),
      );
    if (state.scenario === "error")
      return note(
        "Tus cambios siguen aquí",
        "No se pudo confirmar el envío. Revisa el error antes de volver a intentarlo.",
        "error",
        linkButton("Ver actividad", "activity"),
      );
    if (state.pending || state.scenario === "pending")
      return note(
        "Cambios pendientes",
        "El saldo incluye cambios que aún no confirmó el servidor.",
        "warning",
        linkButton("Ver pendientes", "activity"),
      );
    return "";
  }
  function navItem(route, label, img) {
    const current =
      state.route === route ||
      (route === "balance" && state.route === "payment") ||
      (route === "activity" && ["conflict", "duplicate"].includes(state.route));
    return `<button class="nav-link" type="button" data-route="${route}" ${current ? 'aria-current="page"' : ""}>${icon(img)}${label}</button>`;
  }
  function layout(content, options = {}) {
    const auth = [
      "welcome",
      "signup",
      "login",
      "reset",
      "verify",
      "join",
    ].includes(state.route);
    const noBottom =
      auth ||
      [
        "expense",
        "split",
        "payers",
        "payment",
        "create",
        "budget-edit",
        "conflict",
        "duplicate",
      ].includes(state.route);
    const st = statusInfo();
    const brand = `<button class="brand" type="button" data-route="trips"><span class="brand-symbol">${icon("mountain")}</span><span>Gastos<br>compartidos</span></button>`;
    const sidebar = auth
      ? ""
      : `<aside class="sidebar">${brand}<nav aria-label="Navegación principal">${navItem("home", "Inicio", "house")}${navItem("balance", "Balance", "scale")}${navItem("activity", "Actividad", "activity")}<div class="nav-divider"></div>${navItem("budget", "Presupuesto", "wallet")}${navItem("stats", "Estadísticas", "chart-no-axes-combined")}${navItem("invite", "Personas", "users")}${navItem("summary", "Resumen", "file-text")}</nav><div class="sidebar-bottom">${navItem("trips", "Mis viajes", "map-pin")}<div class="identity">${avatar(people()[0])}<div><strong>${esc(person("a"))}</strong><small>${owner() ? "Organizadora" : "Participante"}</small></div></div></div></aside>`;
    const top = auth
      ? ""
      : `<header class="topbar"><div class="breadcrumb"><button type="button" data-route="trips">Mis viajes</button>${icon("chevron-right")}<span>${esc(state.tripTitle)}</span></div><div class="top-actions"><button type="button" data-route="activity" class="status ${st[2]}">${icon(st[0])}${st[1]}</button><button type="button" data-action="more" class="icon-button" aria-label="Más opciones del viaje">${icon("ellipsis")}</button></div></header>`;
    const bottom = noBottom
      ? ""
      : `<nav class="bottom-nav" aria-label="Navegación principal móvil">${[
          ["home", "Inicio", "house"],
          ["balance", "Balance", "scale"],
          ["activity", "Actividad", "activity"],
        ]
          .map(
            ([r, l, i]) =>
              `<button type="button" data-route="${r}" ${state.route === r || (r === "balance" && state.route === "payment") || (r === "activity" && ["conflict", "duplicate"].includes(state.route)) ? 'aria-current="page"' : ""}>${icon(i)}${l}</button>`,
          )
          .join("")}</nav>`;
    const showAdd =
      state.route === "home" &&
      !["loading", "access-revoked"].includes(state.scenario);
    const fab = showAdd
      ? `<div class="add-dock" data-variant="${state.addButton}"><button type="button" class="fab" data-action="new-expense" ${isClosed() ? 'disabled aria-label="El viaje está finalizado"' : ""}>${icon("plus")}Agregar gasto</button></div>`
      : "";
    return `<div class="app-shell ${auth ? "auth-shell" : ""} ${noBottom ? "no-bottom" : ""} ${showAdd ? "has-add-dock" : ""}" ${auth ? 'style="grid-template-columns:1fr"' : ""}>${sidebar}<div class="workspace">${top}<main id="main" tabindex="-1" class="${auth ? "auth-main " : ""}${options.form ? "form-main" : ""}">${content}</main></div>${bottom}${fab}</div>`;
  }
  function movement(e) {
    return `<button type="button" class="movement" data-expense="${e.id}"><span class="movement-icon">${icon(cats[e.category]?.[1] || "receipt")}</span><span class="movement-body"><span class="movement-title">${esc(e.title)}</span><span class="movement-sub">${Object.keys(
      e.payers,
    )
      .map((id) => esc(person(id)))
      .join(
        " + ",
      )} pagó · ${e.time}</span>${deliveryBadge(e.id)}</span><span class="movement-end money">${money(e.total)}<small>${e.deleted ? "Eliminado" : e.merged ? "Unificado" : isConflict() && e.id === "e1" ? "En revisión" : state.scenario === "photo-error" && e.id === "e1" ? "Imagen pendiente" : `${Object.keys(e.shares).length} personas`}</small></span></button>`;
  }
  function movementTimeline(rows) {
    const entries = [
      ...rows.map((expense) => ({ ...expense, kind: "expense" })),
      ...payments.map((payment) => ({
        ...payment,
        day: payment.day || today(),
        kind: "payment",
      })),
    ].sort(
      (a, b) => b.day.localeCompare(a.day) || b.time.localeCompare(a.time),
    );
    let previousDay = null;
    return entries
      .map((entry) => {
        const group =
          entry.day !== previousDay
            ? `<p class="day-label">${entry.day === today() ? "Hoy" : dayLabel(entry.day)}</p>`
            : "";
        previousDay = entry.day;
        const row =
          entry.kind === "expense"
            ? movement(entry)
            : `<button type="button" class="movement" data-route="balance"><span class="movement-icon">${icon("arrow-left-right")}</span><span class="movement-body"><span class="movement-title">${esc(person(entry.from))} → ${esc(person(entry.to))}</span><span class="movement-sub">Abono registrado · ${entry.time}</span>${deliveryBadge(entry.id)}</span><span class="movement-end money">${money(entry.amount)}<small>No suma al gasto</small></span></button>`;
        return group + row;
      })
      .join("");
  }
  function home() {
    if (state.scenario === "access-revoked") return accessRevoked();
    const my = myBalance(),
      budget = available();
    const top = heading(
      esc(state.tripTitle),
      tripDescription(),
      `<button type="button" class="button primary desktop-add" data-action="new-expense" ${isClosed() ? "disabled" : ""}>${icon("plus")}Agregar gasto</button>`,
      "El viaje, en orden",
    );
    if (state.scenario === "loading")
      return layout(
        top +
          `<div aria-busy="true" aria-label="Cargando el viaje"><p class="small muted">Buscando la última información…</p><div class="skeleton large"></div><div class="skeleton medium"></div><div class="skeleton short"></div><div class="skeleton medium"></div></div>`,
      );
    const rows = expenses
      .filter((e) => !e.deleted && !e.merged)
      .slice()
      .reverse();
    return layout(
      top +
        notice() +
        (state.count === 1
          ? note(
              "El viaje empieza contigo",
              "Invita a otra persona para compartir las cuentas. Tienes 9 lugares disponibles.",
              "",
              linkButton("Invitar personas", "invite"),
            )
          : "") +
        (isClosed()
          ? note(
              "Viaje finalizado",
              "Puedes consultar los movimientos y el historial. No se admiten gastos nuevos.",
            )
          : "") +
        `<div class="home-grid"><div class="home-main"><section class="hero-balance" aria-label="Tu balance"><p class="balance-label">${isProvisional() ? "Tu saldo provisional" : my === 0 ? "Tu balance está al día" : my > 0 ? "Te deben" : "Debes"}</p><div class="big-money accent">${money(Math.abs(my))}</div><p class="context">${my === 0 ? "No tienes pagos pendientes." : my > 0 ? "Has aportado más de lo que te corresponde." : "Tu parte pendiente del viaje."}</p><button type="button" class="text-button" data-route="balance">Ver balance ${icon("arrow-up-right")}</button></section><div class="metric-pair"><div class="metric"><p>Disponible del viaje</p><strong class="money">${budget === null ? "Sin presupuesto" : money(budget)}</strong><small>${budget === null ? "Puedes definirlo después" : `de ${money(state.budget)}${isProvisional() ? " · provisional" : ""}`}</small></div><div class="metric"><p>Gastado hoy</p><strong class="money">${money(todayCost())}</strong><small class="daily-context" data-daily-context>${dailyBudgetContext()}${isProvisional() ? " · provisional" : ""}</small></div></div><section class="section"><div class="section-heading"><h2>Movimientos</h2><span class="small muted">${rows.length + payments.length} en total</span></div>${
          !rows.length && !payments.length
            ? empty(
                "El primer gasto va aquí",
                "Registra lo que alguien pagó y nosotros repartimos las cuentas.",
                "receipt",
                "",
              )
            : movementTimeline(rows)
        }</section></div><aside class="home-aside" aria-label="Presupuesto y personas"><section class="aside-section"><div class="section-heading"><h2>Un poco de perspectiva</h2>${icon("wallet")}</div><p>${budget === null ? "No hay presupuesto definido." : `Llevan ${money(cost())} de ${money(state.budget)}.`}</p>${budget !== null ? `<div class="progress-track" role="progressbar" aria-label="Presupuesto usado" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.min(100, Math.round((cost() / Math.max(1, state.budget)) * 100))}"><div class="progress-fill" style="width:${Math.min(100, (cost() / Math.max(1, state.budget)) * 100)}%"></div></div><div class="budget-labels"><span>${Math.round((cost() / Math.max(1, state.budget)) * 100)}% utilizado</span><span>${cost() > state.budget ? "Presupuesto superado" : `${money(Math.max(0, budget))} disponibles`}</span></div>` : ""}<button type="button" class="text-button" data-route="budget">Ver presupuesto ${icon("chevron-right")}</button></section><section class="aside-section"><h2>Viajar en buena compañía</h2><div class="avatars">${people().slice(0, 5).map(avatar).join("")}${state.count > 5 ? `<span class="avatar">+${state.count - 5}</span>` : ""}</div><p>${state.count} personas · ${10 - state.count} lugares disponibles</p><button type="button" class="text-button" data-route="invite">Ver personas ${icon("chevron-right")}</button></section><section class="aside-section"><p>Las cuentas claras, el resto del viaje por delante.</p></section></aside></div>`,
    );
  }
  const empty = (title, text, img, action = "") =>
    `<div class="empty-state"><span class="empty-symbol">${icon(img)}</span><h2>${title}</h2><p>${text}</p>${action}</div>`;
  function accessRevoked() {
    return layout(
      heading("Acceso al viaje") +
        empty(
          "Tu acceso fue retirado",
          "El organizador retiró tu acceso a este viaje. Las propuestas que no pudiste enviar siguen disponibles para copiar.",
          "lock-keyhole",
          button("Ver propuesta local", "copy-proposal", "secondary"),
        ) +
        linkButton("Volver a mis viajes", "trips"),
    );
  }
  function welcome() {
    return layout(
      `<div class="welcome"><div class="auth-symbol">${icon("mountain")}</div><div class="eyebrow">Gastos compartidos</div><h1>Disfruta el viaje.<br>Las cuentas, claras.</h1><p class="lead">Un lugar para los gastos de todos. Reparte, registra y sigue el viaje, incluso sin conexión.</p><div class="auth-actions">${linkButton("Crear mi cuenta", "signup", "primary full")}${linkButton(`${icon("qr-code")}Unirme a un viaje`, "join", "secondary full")}</div><p class="auth-link">¿Ya tienes cuenta? <a href="#login" data-route="login">Iniciar sesión</a></p><div class="auth-footer">${icon("users")}De 2 a 10 personas. Como invitado, no necesitas correo.</div></div>`,
    );
  }
  function auth(kind) {
    const signup = kind === "signup",
      reset = kind === "reset";
    return layout(
      routeBack("Volver", "welcome") +
        heading(
          reset
            ? "Recupera tu acceso"
            : signup
              ? "Tu próxima salida empieza aquí"
              : "Qué bueno verte",
          reset
            ? "Te enviaremos un enlace para cambiar tu contraseña."
            : signup
              ? "Tu cuenta permite recuperar el acceso a tus viajes."
              : "Entra con tu cuenta de organizador.",
        ) +
        `<form id="auth-form" data-kind="${kind}" novalidate><div id="form-error" class="form-error" role="alert" hidden></div>${signup ? inputField("auth-name", "Tu nombre", "", { attrs: 'autocomplete="given-name" maxlength="60"' }) : ""}${inputField("auth-email", "Correo electrónico", "", { type: "email", attrs: 'autocomplete="email" inputmode="email"' })}${!reset ? inputField("auth-password", "Contraseña", "", { type: "password", attrs: `autocomplete="${signup ? "new-password" : "current-password"}" minlength="8"`, help: signup ? "Usa al menos 8 caracteres. Solo datos ficticios en este prototipo." : "" }) : ""}<button class="button primary full" type="submit">${reset ? "Enviar enlace de recuperación" : signup ? "Crear cuenta" : "Iniciar sesión"}</button></form>${kind === "login" ? `<p class="auth-link"><a href="#reset" data-route="reset">Olvidé mi contraseña</a></p>` : ""}<p class="auth-footer">Propuesta de acceso por correo. Este recorrido no crea cuentas ni envía correos reales.</p>`,
    );
  }
  function verify() {
    return layout(
      routeBack("Volver", "signup") +
        heading("Verifica tu correo") +
        empty(
          "Revisa tu correo",
          "Para organizar un viaje, primero verifica tu correo. Si no lo encuentras, revisa la carpeta de spam.",
          "mail",
          button("Simular correo verificado", "verified"),
        ) +
        button("Reenviar correo de ejemplo", "resend", "quiet full"),
    );
  }
  function join() {
    let error = "";
    if (["expired", "revoked", "full", "offline"].includes(state.scenario))
      error = note(
        state.scenario === "full"
          ? "El grupo ya tiene 10 personas"
          : state.scenario === "offline"
            ? "Necesitas conexión para entrar"
            : state.scenario === "expired"
              ? "Esta invitación caducó"
              : "Esta invitación fue revocada",
        state.scenario === "offline"
          ? "Cuando tengas internet, vuelve a usar el código."
          : "Pide al organizador una invitación vigente o un lugar disponible.",
        "warning",
      );
    return layout(
      routeBack("Volver", "welcome") +
        heading(
          "Únete al viaje",
          "Sin correo ni contraseña. Solo tu nombre y la invitación.",
        ) +
        error +
        `<form id="join-form" novalidate><div id="form-error" class="form-error" role="alert" hidden></div>${inputField("invite-code", "Enlace o código completo", "", { attrs: 'autocomplete="off" spellcheck="false"', help: "Pega la invitación del organizador. No mostramos datos del viaje antes de entrar." })}${button(`${icon("scan-line")}Escanear QR de ejemplo`, "scan", "secondary full")}${inputField("guest-name", "¿Cómo te llamas?", "", { attrs: 'autocomplete="given-name" maxlength="60"' })}<label class="inline-check"><input id="guest-warning" type="checkbox"><span>Entiendo que al borrar los datos del navegador o cambiar de dispositivo puedo perder el acceso.</span></label><button type="submit" class="button primary full" ${["expired", "revoked", "full", "offline"].includes(state.scenario) ? "disabled" : ""}>Unirme al viaje</button></form><p class="auth-footer">Podrás volver a pedir una invitación. Tu nombre por sí solo no recupera el acceso anterior.</p>`,
    );
  }
  function trips() {
    return layout(
      heading(
        "Tus viajes",
        "Un lugar para cada salida.",
        linkButton(`${icon("plus")}Crear viaje`, "create", "primary"),
        "Gastos compartidos",
      ) +
        `<section><h2>En curso</h2><div class="trip-list-item"><div class="trip-art">${icon("mountain")}</div><div><span class="badge">${isClosed() ? "Finalizado" : "Viaje actual"}</span><h2>${esc(state.tripTitle)}</h2><p>${tripDescription()} · ${state.count} personas</p></div><button class="icon-button" type="button" data-route="home" aria-label="Abrir viaje ${esc(state.tripTitle)}">${icon("chevron-right")}</button></div></section><section class="section"><h2>Viajes finalizados</h2><div class="trip-list-item"><div class="trip-art">${icon("map-pin")}</div><div><h2>Una salida a Guatavita</h2><p>8 nov · 2 personas · Ejemplo de historial</p></div><button class="icon-button" type="button" data-action="past-trip" aria-label="Ver resumen de Guatavita">${icon("chevron-right")}</button></div></section>`,
    );
  }
  function create() {
    return layout(
      routeBack("Mis viajes", "trips") +
        heading(
          "Un nuevo viaje",
          "Lo esencial ahora. Invita a las personas al terminar.",
        ) +
        (isOffline()
          ? note(
              "Crear un viaje requiere conexión",
              "Podrás registrar gastos offline una vez creado y descargado el viaje.",
              "warning",
            )
          : "") +
        `<form id="create-form" novalidate><div id="form-error" class="form-error" role="alert" hidden></div>${inputField("trip-name", "Nombre del viaje", "", { attrs: 'maxlength="100" placeholder="Por ejemplo, fin de semana en la montaña"' })}${inputField("trip-destination", 'Destino <span class="optional">· opcional</span>', "", { attrs: 'maxlength="120" placeholder="¿A dónde van?"' })}<div class="field-grid">${inputField("trip-start", "Inicio", "2026-11-21", { type: "date" })}${inputField("trip-end", "Fin", "2026-11-24", { type: "date" })}</div><div class="field-grid"><div class="field"><label for="trip-currency">Moneda del viaje</label><select id="trip-currency" class="select"><option>COP · pesos colombianos</option></select><span class="field-help">Una sola moneda, sin conversiones.</span></div><div class="field"><label for="trip-timezone">Zona horaria</label><select id="trip-timezone" class="select"><option value="America/Bogota">Bogotá · America/Bogota</option><option value="America/New_York">Nueva York</option><option value="Europe/Madrid">Madrid</option></select></div></div>${inputField("trip-budget", 'Presupuesto <span class="optional">· opcional</span>', "", { attrs: 'inputmode="numeric" placeholder="400000"', help: "Se reparte entre las fechas del viaje. Puedes ajustarlo después." })}<section class="form-block"><h2>Personas</h2><div class="member-row">${avatar(people()[0])}<div class="person-label"><strong>Tú, ${esc(person("a"))}</strong><small>Organizadora · 1 de 10 lugares</small></div></div><p class="field-help" style="margin-top:12px">El viaje empieza contigo. Después podrás compartir una invitación con hasta 9 personas.</p></section><details class="disclosure form-block"><summary>Imagen de portada · opcional</summary><p class="field-help">Puedes dejar el icono de montaña o añadir una miniatura más adelante.</p>${button(`${icon("image")}Ver opciones de imagen`, "photo", "secondary")}</details><div class="form-footer"><p>Las fechas, la zona horaria y la moneda quedan fijas al crear.</p><button class="button primary" type="submit" ${isOffline() || !owner() ? "disabled" : ""}>Crear viaje</button></div></form>`,
      { form: true },
    );
  }
  function expense() {
    const d = draft(),
      spl = splitData();
    return layout(
      routeBack("Volver al viaje", "home") +
        heading(
          d.editId ? "Editar gasto" : "Un gasto más, bien repartido",
          "Lo habitual, en unos segundos.",
        ) +
        (isClosed()
          ? note(
              "Este viaje está finalizado",
              "El formulario se muestra para revisar el diseño; no puedes guardar cambios.",
              "warning",
            )
          : "") +
        `<form id="expense-form" novalidate><div id="form-error" class="form-error" role="alert" hidden></div>${inputField("expense-title", "Concepto", d.title, { attrs: 'data-draft="title" maxlength="100" placeholder="¿Qué pagaron?" autocomplete="off"' })}<div class="amount-field"><label for="expense-amount">Importe</label><div class="amount-input-wrap"><span class="amount-prefix" aria-hidden="true">$</span><input id="expense-amount" data-draft="amount" value="${esc(d.amount)}" inputmode="numeric" autocomplete="off" aria-describedby="amount-help" placeholder="0"></div><small id="amount-help">COP · pesos enteros, sin decimales</small></div><button type="button" class="setting-row" data-route="payers"><span class="start">${icon("wallet")}<span><strong>¿Quién pagó?</strong><small id="payer-summary">${d.payerIds.map((id) => (id === "a" ? "Tú" : esc(person(id)))).join(" + ")}</small></span></span>${icon("chevron-right")}</button><button type="button" class="setting-row" data-route="split"><span class="start">${icon("users")}<span><strong>¿Cómo lo dividimos?</strong><small id="split-summary">${d.split === "equal" ? "Partes iguales" : d.split === "percentage" ? "Porcentajes personalizados" : "Importes específicos"} · ${d.included.length} personas</small></span></span>${icon("chevron-right")}</button><details class="disclosure form-block" id="expense-options" ${d.category !== "other" || d.note ? "open" : ""}><summary>Categoría, fecha y nota <span class="optional">· opcionales</span></summary><div class="field"><label for="expense-category">Categoría</label><select id="expense-category" data-draft="category" class="select">${Object.entries(
          cats,
        )
          .map(
            ([key, [label]]) =>
              `<option value="${key}" ${d.category === key ? "selected" : ""}>${label}</option>`,
          )
          .join(
            "",
          )}</select></div><div class="field-grid">${inputField("expense-date", "Fecha", d.date, { type: "date", attrs: `data-draft="date" min="${state.tripStart}" max="${state.tripEnd}"` })}${inputField("expense-time", "Hora del viaje", d.time, { type: "time", attrs: 'data-draft="time"' })}</div><div class="field"><label for="expense-note">Nota</label><textarea id="expense-note" data-draft="note" maxlength="2000" placeholder="Algo que convenga recordar">${esc(d.note)}</textarea></div></details><button type="button" class="setting-row image-access" data-action="photo"><span class="start">${icon("image")}<span><strong>${d.photo ? "Imagen de ejemplo seleccionada" : "Añadir imagen · opcional"}</strong><small>Cámara, galería o imágenes de stock</small></span></span>${icon("chevron-right")}</button><div class="allocation-output"><div><span>Tu parte</span><strong id="my-share" class="money">${spl.valid ? money(spl.shares.a || 0) : "Por definir"}</strong></div><div><span>Pagador y reparto independientes</span><span id="share-count">${d.included.length} personas</span></div></div><div class="form-footer"><p>${isOffline() ? "Se guardará en este dispositivo y quedará pendiente de envío." : "Los cambios quedarán en el historial del viaje."}</p><button type="submit" class="button primary" ${isClosed() ? "disabled" : ""}>${d.editId ? "Guardar cambios" : "Guardar gasto"}</button></div></form>`,
      { form: true },
    );
  }
  function split() {
    const d = draft();
    const data = splitData();
    return layout(
      routeBack("Volver al gasto", "expense") +
        heading(
          "Cada quien, su parte",
          `Repartimos ${money(parseMoney(d.amount) || 0)} entre quienes participan.`,
        ) +
        `<div class="segmented" role="group" aria-label="Forma de dividir el gasto">${[
          ["equal", "Igual"],
          ["percentage", "Porcentajes"],
          ["fixed", "Importes"],
        ]
          .map(
            ([key, label]) =>
              `<button type="button" data-split="${key}" aria-pressed="${d.split === key}">${label}</button>`,
          )
          .join(
            "",
          )}</div><p class="section-note">${d.split === "equal" ? "Todos los incluidos comparten por igual. El sobrante se reparte sin perder pesos." : d.split === "percentage" ? "Los porcentajes deben sumar exactamente 100%. Puedes usar dos decimales." : "Escribe cuánto corresponde a cada persona, en pesos enteros."}</p>${people()
          .map(
            (p) =>
              `<div class="allocation"><input type="checkbox" id="include-${p.id}" data-include="${p.id}" ${d.included.includes(p.id) ? "checked" : ""} aria-label="Incluir a ${esc(p.name)}">${avatar(p)}<label class="person-label" for="include-${p.id}">${esc(p.name)}${p.id === "a" ? ' <span class="muted">(tú)</span>' : ""}<small>${d.included.includes(p.id) ? "Participa" : "No participa · 0%"}</small></label>${d.split === "equal" ? `<strong class="allocated-money money" data-quota="${p.id}">${money(data.shares[p.id] || 0)}</strong>` : `<input aria-label="${d.split === "fixed" ? "Importe" : "Porcentaje"} de ${esc(p.name)}" data-allocation="${p.id}" inputmode="${d.split === "fixed" ? "numeric" : "decimal"}" value="${esc(d.split === "fixed" ? (d.fixed[p.id] ?? "0") : (d.weights[p.id] ?? "0"))}" ${!d.included.includes(p.id) ? "disabled" : ""}>${d.split === "percentage" ? '<span aria-hidden="true">%</span>' : ""}`}</div>`,
          )
          .join(
            "",
          )}<div id="allocation-output">${allocationOutput()}</div><div class="form-footer"><p>Excluir una persona no cambia quién pagó.</p><button class="button primary" type="button" data-action="apply-split" id="apply-split" ${!data.valid ? "disabled" : ""}>Aplicar reparto</button></div>`,
      { form: true },
    );
  }
  function allocationOutput() {
    const d = draft(),
      s = splitData(),
      total = parseMoney(d.amount) || 0;
    return `<div class="allocation-output" aria-live="polite"><div><span>${d.split === "percentage" ? "Porcentaje asignado" : "Total asignado"}</span><strong>${d.split === "percentage" ? `${((s.percent || 0) / 100).toLocaleString("es-CO", { minimumFractionDigits: 2 })}%` : money(s.assigned)}</strong></div><div><span>Total del gasto</span><strong class="money">${money(total)}</strong></div>${!s.valid ? `<p class="field-error" role="status">${esc(s.error)}</p>` : `<div><span>${icon("check")}Todo cuadra</span><span>Sin diferencias</span></div>`}</div>`;
  }
  function payers() {
    const d = draft();
    return layout(
      routeBack("Volver al gasto", "expense") +
        heading(
          "¿Quién puso el dinero?",
          `Los aportes deben sumar ${money(parseMoney(d.amount) || 0)}.`,
        ) +
        people()
          .map(
            (p) =>
              `<div class="allocation"><input type="checkbox" id="payer-${p.id}" data-payer="${p.id}" ${d.payerIds.includes(p.id) ? "checked" : ""} aria-label="${esc(p.name)} pagó">${avatar(p)}<label for="payer-${p.id}" class="person-label">${esc(p.name)}${p.id === "a" ? " (tú)" : ""}</label><input aria-label="Aporte de ${esc(p.name)}" data-contribution="${p.id}" inputmode="numeric" value="${esc(d.payerIds.length === 1 && d.payerIds[0] === p.id ? d.amount : (d.payers[p.id] ?? "0"))}" ${d.payerIds.length === 1 ? "readonly" : ""} ${!d.payerIds.includes(p.id) ? "disabled" : ""}></div>`,
          )
          .join("") +
        `<div id="payer-output">${payerOutput()}</div><div class="form-footer"><p>Los aportes no modifican las cuotas de consumo.</p>${button("Aplicar pagadores", "apply-payers")}</div>`,
      { form: true },
    );
  }
  function payerData() {
    const d = draft(),
      total = parseMoney(d.amount) || 0;
    const payers = Object.fromEntries(
      d.payerIds.map((id) => [
        id,
        d.payerIds.length === 1 ? total : parseMoney(d.payers[id] ?? "0"),
      ]),
    );
    const sum = Object.values(payers).reduce((a, b) => a + b, 0);
    return {
      payers,
      sum,
      valid:
        d.payerIds.length > 0 &&
        Object.values(payers).every((n) => Number.isFinite(n) && n > 0) &&
        sum === total &&
        total > 0,
    };
  }
  function payerOutput() {
    const p = payerData(),
      total = parseMoney(draft().amount) || 0;
    return `<div class="allocation-output" aria-live="polite"><div><span>Total aportado</span><strong class="money">${money(Number.isFinite(p.sum) ? p.sum : 0)}</strong></div><div><span>Total del gasto</span><span class="money">${money(total)}</span></div>${p.valid ? '<p class="small accent">Los aportes coinciden con el gasto.</p>' : `<p class="field-error">${Number.isFinite(p.sum) ? `${p.sum < total ? "Faltan" : "Sobran"} ${money(Math.abs(total - p.sum))}.` : "Revisa los importes."} Cada pagador debe aportar al menos $1.</p>`}</div>`;
  }
  function detail() {
    const e = expenses.find((e) => e.id === state.selected) || expenses[0];
    if (!e)
      return layout(
        routeBack() +
          heading("Detalle del gasto") +
          empty(
            "Todavía no hay gastos",
            "Registra el primero para ver el desglose y su historial.",
            "receipt",
            button("Agregar gasto", "new-expense"),
          ),
      );
    return layout(
      routeBack() +
        `<div class="detail-title"><div class="trip-art">${icon(cats[e.category][1])}</div><div><p class="eyebrow">${cats[e.category][0]}</p><h1>${esc(e.title)}</h1></div></div><div class="detail-amount money">${money(e.total)}</div><p class="small muted">${esc(e.day)} · ${e.time} · COP</p>${deliveryBadge(e.id)}${e.deleted ? note("Gasto eliminado", "Este gasto no cuenta en el costo ni en los saldos. Su historial se conserva.", "warning") : e.merged ? note("Gasto unificado", "El importe cuenta en el gasto superviviente. Esta entrada conserva la auditoría.") : isConflict() && e.id === "e1" ? notice() : ""}${e.note ? `<p class="section-note" style="margin-top:24px">${esc(e.note)}</p>` : ""}<section class="section"><h2>Quién pagó</h2>${Object.entries(
          e.payers,
        )
          .map(
            ([id, amount]) =>
              `<div class="summary-line"><span>${esc(person(id))}</span><strong class="money">${money(amount)}</strong></div>`,
          )
          .join(
            "",
          )}</section><section class="section"><h2>Cómo se reparte</h2>${Object.entries(
          e.shares,
        )
          .map(
            ([id, amount]) =>
              `<div class="summary-line"><span>${esc(person(id))}</span><strong class="money">${money(amount)}</strong></div>`,
          )
          .join(
            "",
          )}</section>${state.scenario === "photo-error" ? note("La imagen sigue pendiente", "El gasto monetario ya está registrado. Puedes volver a intentar el envío de la miniatura.", "warning", button("Reintentar imagen de ejemplo", "retry-photo", "quiet")) : ""}<section class="section"><h2>Historial del gasto</h2><div class="timeline"><div><p>Gasto creado por ${esc(person(Object.keys(e.payers)[0]))}</p><small>21 nov · ${e.time} · Revisión original</small></div>${state.history
          .filter((h) => h.entity === e.id)
          .map(
            (h) =>
              `<div><p>${esc(h.text)}</p><small>Autor: ${esc(person("a"))} · cambio de ejemplo</small></div>`,
          )
          .join(
            "",
          )}${isConflict() && e.id === "e1" ? `<div><p>Dos ediciones se hicieron sin conexión</p><small>Ana: $96.000 · Bruno: $100.000 · Ambas conservadas</small><button class="text-button" type="button" data-route="conflict">Comparar versiones</button></div>` : ""}</div></section>${!isClosed() && !e.merged ? `<div class="form-footer">${button(e.deleted ? "Restaurar gasto" : `${icon("pencil")}Editar gasto`, e.deleted ? "restore-expense" : "edit-expense", "secondary")}${!e.deleted ? button(`${icon("trash-2")}Eliminar`, "delete-expense", "danger") : ""}</div>` : ""}`,
      { form: true },
    );
  }
  function balance() {
    const rows = balances(),
      my = myBalance(),
      s = suggestions();
    return layout(
      heading(
        "Balance",
        "Las compras se reparten. Los abonos acercan las cuentas a cero.",
        button(
          `${icon("plus")}Registrar abono`,
          "new-payment",
          "primary",
          isClosed() ? "disabled" : "",
        ),
      ) +
        notice() +
        `<section class="hero-balance"><p class="balance-label">${isProvisional() ? "Tu saldo provisional" : my === 0 ? "Tu balance está al día" : my > 0 ? "Te deben" : "Debes"}</p><div class="big-money accent">${money(Math.abs(my))}</div><p class="context">${isProvisional() ? "Todavía no es una liquidación definitiva." : "Pagado menos tu parte, con los abonos registrados."}</p></section><section><h2>Las cuentas de cada persona</h2><div class="payment-list">${rows.map((p) => `<div class="payment-row">${avatar(p)}<div class="person-label"><strong>${esc(p.name)}${p.id === "a" ? " (tú)" : ""}</strong><small>Pagó ${money(p.paid)} · Le corresponde ${money(p.share)}</small></div><div class="payment-amount money">${money(Math.abs(p.balance))}<small>${p.balance > 0 ? "Por recibir" : p.balance < 0 ? "Por aportar" : "Al día"}</small></div></div>`).join("")}</div></section><section class="section"><div class="section-heading"><h2>Pagos sugeridos</h2>${icon("arrow-left-right")}</div><p class="section-note">${isProvisional() ? "Orientativos, basados en el subtotal disponible. Revisa los pendientes antes de pagar." : "Una forma de dejar las cuentas al día. Registrar un abono no mueve dinero por ti."}</p>${s.length ? s.map((p) => `<div class="suggestion"><div class="path"><span>${esc(person(p.from))}</span>${icon("arrow-right")}<span>${esc(person(p.to))}</span></div><strong class="money">${money(p.amount)}</strong><button type="button" class="text-button" data-payment="${p.from},${p.to},${p.amount}" ${isClosed() ? "disabled" : ""}>Registrar</button></div>`).join("") : '<p class="small accent">No hay transferencias pendientes.</p>'}</section><section class="section"><h2>Abonos registrados</h2>${payments.length ? payments.map((p) => `<div class="summary-line"><span>${esc(person(p.from))} → ${esc(person(p.to))}<br><small>${dayLabel(p.day || today())} · ${p.time}</small>${deliveryBadge(p.id)}</span><strong class="money">${money(p.amount)}</strong></div>`).join("") : '<p class="section-note">Cuando registres el primero, aparecerá aquí.</p>'}</section>`,
    );
  }
  function payment() {
    return layout(
      routeBack("Volver al balance", "balance") +
        heading(
          "Registrar un abono",
          "Anota un pago que ya ocurrió. No cambia el costo del viaje.",
        ) +
        `<form id="payment-form" novalidate><div id="form-error" class="form-error" role="alert" hidden></div><div class="field"><label for="payment-from">¿Quién pagó?</label><select id="payment-from" class="select">${people()
          .map(
            (p) =>
              `<option value="${p.id}" ${state.paymentFrom === p.id ? "selected" : ""}>${esc(p.name)}</option>`,
          )
          .join(
            "",
          )}</select></div><div class="field"><label for="payment-to">¿A quién?</label><select id="payment-to" class="select">${people()
          .map(
            (p) =>
              `<option value="${p.id}" ${state.paymentTo === p.id ? "selected" : ""}>${esc(p.name)}</option>`,
          )
          .join(
            "",
          )}</select></div>${inputField("payment-amount", "Importe del abono", state.paymentAmount || "", { attrs: 'inputmode="numeric" placeholder="20000"', help: "COP · pesos enteros" })}${inputField("payment-note", 'Nota <span class="optional">· opcional</span>', "", { attrs: 'maxlength="2000" placeholder="Por ejemplo, transferencia recibida"' })}<div class="form-footer"><p>Quedará registrado quién lo anotó y cuándo.</p><button type="submit" class="button primary" ${isClosed() ? "disabled" : ""}>Registrar abono</button></div></form>`,
      { form: true },
    );
  }
  function budget() {
    const spent = cost(),
      remaining = available(),
      schedule = budgetSchedule();
    const difference = schedule.current - todayCost();
    const future = schedule.rows.filter((row) => row.day > today());
    const automatic = future.filter((row) => !row.fixed);
    const sameAmount =
      automatic.length &&
      automatic.every((row) => row.future === automatic[0].future);
    const redistribution = !future.length
      ? "No quedan días futuros para redistribuir. El disponible conserva el sobrante o el exceso final."
      : `${money(Math.max(0, remaining || 0))} disponibles para ${future.length} días restantes. ${sameAmount ? `Sugerencia: ${money(automatic[0].future)} por día${future.some((row) => row.fixed) ? " automático, respetando los cupos fijos" : ""}.` : "La tabla conserva las reservas y reparte el resto sin perder pesos."}`;
    return layout(
      heading(
        "Un plan para gastar tranquilos",
        "Presupuesto del viaje · COP",
        owner()
          ? linkButton("Ajustar presupuesto", "budget-edit", "secondary")
          : "",
      ) +
        notice() +
        (noBudget()
          ? empty(
              "Aún no hay presupuesto",
              "Las cuentas funcionan igual. Añadir un presupuesto te ayuda a distribuir el dinero entre los días.",
              "wallet",
              owner()
                ? linkButton("Definir presupuesto", "budget-edit", "primary")
                : "",
            )
          : `
        <section class="budget-total" aria-label="Presupuesto del viaje">
          <p class="balance-label">Disponible ${isProvisional() ? "provisional" : ""}</p><div class="big-money ${remaining < 0 ? "danger-text" : "accent"}" data-budget-available>${money(remaining)}</div>
          <p class="section-note">Presupuesto total <strong class="money" data-budget-total>${money(state.budget)}</strong> · Gastado ${money(spent)}.</p>
          <div class="progress-track" role="progressbar" aria-label="Presupuesto utilizado" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.min(100, Math.round((spent / Math.max(1, state.budget)) * 100))}"><div class="progress-fill" style="width:${Math.min(100, (spent / Math.max(1, state.budget)) * 100)}%"></div></div>
        </section>
        <section class="daily-budget" aria-labelledby="daily-title"><h2 id="daily-title">Hoy, ${dayLabel(today())}</h2>
          <dl class="daily-budget-values"><div><dt>Cupo asignado</dt><dd class="money" data-daily-assigned>${money(schedule.current)}</dd></div><div><dt>Gastado hoy</dt><dd class="money" data-daily-spent>${money(todayCost())}</dd></div><div><dt>${difference < 0 ? "Exceso de hoy" : difference > 0 ? "Bajo el cupo" : "Diferencia"}</dt><dd class="money ${difference < 0 ? "warning-text" : ""}" data-daily-difference>${money(Math.abs(difference))}</dd></div></dl>
          <p class="section-note">${difference < 0 ? "El exceso reduce la propuesta para los días futuros. Puedes seguir registrando gastos." : difference > 0 ? "Ahorro provisional: el día aún puede tener más gastos." : "El gasto de hoy coincide con el cupo asignado."}${isProvisional() ? " Estas cifras son provisionales." : ""}</p>
        </section>
        <section class="redistribution" aria-labelledby="redistribution-title"><h2 id="redistribution-title">Para los próximos días</h2><p data-redistribution>${redistribution}</p></section>
        <section class="section"><h2>Día a día</h2><p class="section-note">Inicial: reparto igual de referencia. Asignado hoy: cupo actual. Propuesta: dinero restante para días futuros; «Fijo» conserva la reserva manual.</p>
          <table class="budget-table"><caption class="sr-only">Presupuesto inicial, gasto y propuesta restante por día, en COP</caption><thead><tr><th scope="col">Día</th><th scope="col">Inicial</th><th scope="col">Gastado</th><th scope="col">Propuesta</th></tr></thead><tbody>${schedule.rows.map((row) => `<tr class="${row.day === today() ? "today" : ""}"><th scope="row">${row.day === today() ? "Hoy" : dayLabel(row.day)}<small>${row.fixed ? "Fijo" : "Automático"}</small></th><td>${money(row.initial)}</td><td>${money(row.spent)}</td><td>${row.future === null ? "—" : money(row.future)}</td></tr>`).join("")}</tbody></table>
        </section>
        ${schedule.deficit ? note("Las reservas necesitan ajuste", `Los cupos fijos se conservan, pero faltan ${money(schedule.deficit)} para financiarlos. Los cupos automáticos quedan en $0.`, "warning") : ""}
      `) +
        (!owner()
          ? note(
              "Puedes consultar el presupuesto",
              "Solo la organizadora puede cambiar el total o fijar cupos diarios.",
            )
          : ""),
    );
  }
  function budgetEdit() {
    return layout(
      routeBack("Volver al presupuesto", "budget") +
        heading(
          "Dale un lugar a cada peso",
          "Los cupos manuales se reservan; el resto se distribuye automáticamente.",
        ) +
        (!owner()
          ? note(
              "Solo consulta",
              "Solo la organizadora puede cambiar estas asignaciones.",
              "warning",
            )
          : "") +
        `<form id="budget-form" novalidate><div id="form-error" class="form-error" role="alert" hidden></div>${inputField("budget-total", "Presupuesto total", state.budget ?? "", { attrs: 'inputmode="numeric"', help: "Déjalo vacío para conservar el viaje sin presupuesto." })}<div class="form-block"><h2>Cupos diarios</h2><p class="section-note">Vacío significa automático. Escribe un importe para fijar un día sin cambiar los demás cupos manuales.</p>${tripDays()
          .filter((day) => day >= today())
          .map((day) =>
            inputField(
              `budget-day-${day}`,
              `${day === today() ? "Hoy · " : ""}${dayLabel(day)} · cupo fijo`,
              state.locks[day] ?? "",
              {
                attrs: `inputmode="numeric" data-budget-day="${day}" placeholder="Automático"`,
                help:
                  day > today()
                    ? "Esta reserva se conserva al redistribuir el resto."
                    : "El gasto real de hoy determinará la propuesta de mañana.",
              },
            ),
          )
          .join(
            "",
          )}</div><div class="form-footer"><p>No se moverán tus gastos ni tus abonos.</p><button type="submit" class="button primary" ${!owner() || isClosed() ? "disabled" : ""}>Guardar presupuesto</button></div></form>`,
      { form: true },
    );
  }
  function budgetEvolution() {
    if (noBudget())
      return '<p class="small muted">Define un presupuesto para comparar el gasto acumulado.</p>';
    const days = tripDays();
    const lastKnown = [today(), ...effective().map((expense) => expense.day)]
      .sort()
      .at(-1);
    const known = days.filter((day) => day <= lastKnown);
    const values = known.map((day) => ({
      day,
      total: effective()
        .filter((expense) => expense.day <= day)
        .reduce((sum, expense) => sum + expense.total, 0),
    }));
    const maximum =
      Math.max(1, state.budget, ...values.map((row) => row.total)) * 1.12;
    const y = (value) => 110 - (value / maximum) * 90;
    const x = (day) =>
      days.length === 1
        ? 280
        : 32 + (days.indexOf(day) / (days.length - 1)) * 496;
    const latest = values.at(-1) || { day: today(), total: 0 };
    return `<p class="chart-caption">Acumulado conocido hasta ${dayLabel(lastKnown)} · <span class="money">${money(latest.total)}</span>. Presupuesto <span class="money">${money(state.budget)}</span>.</p>
      <svg class="line-chart" viewBox="0 0 560 130" role="img" aria-labelledby="chart-title chart-desc"><title id="chart-title">Gasto acumulado y presupuesto, COP</title><desc id="chart-desc">${values.map((row) => `${dayLabel(row.day)}: ${money(row.total)}`).join(". ")}. Presupuesto ${money(state.budget)}. No se inventan gastos futuros.</desc><path class="grid" d="M32 110 H528"/><path class="limit" data-budget-y="${y(state.budget)}" d="M32 ${y(state.budget)} H528"/><polyline class="spent" points="${values.map((row) => `${x(row.day)},${y(row.total)}`).join(" ")}"/><circle data-cumulative-total="${latest.total}" cx="${x(latest.day)}" cy="${y(latest.total)}" r="4" fill="var(--accent)"/></svg>
      <div class="chart-axis-labels"><span>${dayLabel(state.tripStart)}</span><span>${dayLabel(state.tripEnd)}</span></div>
      <p class="chart-caption">Línea continua: gasto. Línea discontinua: presupuesto. Los días futuros no tienen proyección de consumo.</p>
      <details class="chart-table"><summary>Ver datos de la evolución</summary><table><thead><tr><th>Fecha</th><th>Acumulado · COP</th></tr></thead><tbody>${values.map((row) => `<tr><td>${dayLabel(row.day)}</td><td>${money(row.total)}</td></tr>`).join("")}</tbody></table></details>`;
  }
  function stats() {
    const total = cost(),
      byCategory = Object.entries(cats)
        .map(([id, [label]]) => ({
          label,
          total: effective()
            .filter((e) => e.category === id)
            .reduce((sum, e) => sum + e.total, 0),
        }))
        .filter((x) => x.total > 0),
      rows = balances();
    return layout(
      heading(
        "El viaje, en perspectiva",
        "Información útil, sin perderte entre números.",
      ) +
        notice() +
        `<div class="hero-balance"><p class="balance-label">${isProvisional() ? "Subtotal provisional" : "Costo del viaje"}</p><div class="big-money">${money(total)}</div><p class="context">Los abonos no se suman al gasto.</p></div><section class="chart-section"><h2>En qué se fue</h2><div role="img" aria-label="${esc(byCategory.map((c) => `${c.label}: ${money(c.total)}, ${Math.round((c.total / Math.max(1, total)) * 100)} por ciento`).join(". "))}">${byCategory.length ? byCategory.map((c) => `<div class="chart-row"><span>${c.label}</span><div class="progress-track"><div class="progress-fill" style="width:${(c.total / Math.max(1, total)) * 100}%"></div></div><span class="money">${money(c.total)}</span></div>`).join("") : '<p class="small muted">Todavía no hay gastos para comparar.</p>'}</div><details class="chart-table"><summary>Ver importes y porcentajes</summary><table><thead><tr><th>Categoría</th><th>Importe · COP</th></tr></thead><tbody>${byCategory.map((c) => `<tr><td>${c.label} · ${Math.round((c.total / Math.max(1, total)) * 100)}%</td><td>${money(c.total)}</td></tr>`).join("")}</tbody></table></details></section><section class="chart-section"><h2>Gastos por día</h2>${tripDays()
          .map((day) => {
            const n = effective()
              .filter((e) => e.day === day)
              .reduce((sum, e) => sum + e.total, 0);
            return `<div class="chart-row"><span>${dayLabel(day)}</span><div class="progress-track"><div class="progress-fill" style="width:${(n / Math.max(1, total)) * 100}%"></div></div><span class="money">${money(n)}</span></div>`;
          })
          .join(
            "",
          )}<p class="chart-caption">Valores en COP. El día se determina con la zona horaria del viaje.</p></section><section class="chart-section"><h2>Aportaciones de cada persona</h2>${rows.map((p) => `<div class="chart-row"><span class="wide-words">${esc(p.name)}</span><div class="progress-track"><div class="progress-fill" style="width:${(p.paid / Math.max(1, ...rows.map((r) => r.paid))) * 100}%"></div></div><span class="money">${money(p.paid)}</span></div>`).join("")}<p class="chart-caption">Dinero puesto en compras; no es la cuota que le corresponde consumir.</p></section><section class="chart-section"><h2>Evolución del presupuesto</h2>${budgetEvolution()}</section>`,
    );
  }
  function invite() {
    const blocked =
      isOffline() ||
      state.scenario === "full" ||
      state.count === 10 ||
      ["expired", "revoked"].includes(state.scenario) ||
      state.inviteRevoked ||
      isClosed();
    let message = "";
    if (state.scenario === "full" || state.count === 10)
      message = note(
        "El grupo está completo",
        "Hay 10 personas, contando a la organizadora. No se pueden incorporar más.",
        "warning",
      );
    else if (
      ["expired", "revoked"].includes(state.scenario) ||
      state.inviteRevoked
    )
      message = note(
        state.scenario === "expired"
          ? "La invitación caducó"
          : "La invitación fue revocada",
        "El código anterior ya no permite entrar. Genera una invitación nueva si quieres compartirla.",
        "warning",
      );
    else if (isOffline())
      message = note(
        "Invitaciones disponibles con conexión",
        "Puedes consultar las personas descargadas. Crear o revocar accesos requiere internet.",
        "warning",
      );
    return layout(
      heading(
        "El viaje es de todos",
        `${state.count} de 10 lugares ocupados · La organizadora cuenta como una persona.`,
      ) +
        message +
        `<section><div class="section-heading"><h2>Personas del viaje</h2>${icon("users")}</div>${people()
          .map(
            (p, i) =>
              `<div class="member-row">${avatar(p)}<div class="person-label"><strong>${esc(p.name)}${i === 0 ? " (tú)" : ""}</strong><small>${i === 0 ? "Organizadora" : "Invitado · acceso en su dispositivo"}</small></div><span class="badge neutral">${i === 0 ? "Cuenta" : "Activo"}</span>${owner() && i > 0 ? `<button type="button" class="icon-button" data-revoke-person="${p.id}" aria-label="Gestionar acceso de ${esc(p.name)}">${icon("ellipsis")}</button>` : ""}</div>`,
          )
          .join(
            "",
          )}</section>${owner() ? `<section class="section"><h2>Invita a alguien más</h2><p class="section-note">Comparte el enlace o el código completo. La primera entrada necesita internet.</p>${!blocked ? `<div class="qr-area"><div class="qr-wrap"><img src="assets/demo-invite-qr.png" width="184" height="184" alt="QR de demostración que apunta a un dominio de ejemplo no operativo"></div><div><span class="badge neutral">QR de demostración</span><p class="small muted" style="margin-top:12px">No permite entrar a un viaje real.<br>Invitación de ejemplo vigente 7 días.</p></div></div><p class="field-label">Código completo de ejemplo</p><div class="code" style="margin-top:10px">DEMO-VIAJE.${`MUESTRA-${state.inviteGeneration}-`}INVITACION-NO-VALIDA</div><p class="code-hint">El código real tendrá alta entropía. Se puede copiar completo.</p><div class="form-footer">${button(`${icon("copy")}Copiar código de ejemplo`, "copy-invite", "secondary")}${button("Revocar invitación", "revoke-invite", "quiet")}</div>` : `<div class="form-footer">${button("Generar nueva invitación", "new-invite", "primary", isOffline() || state.count === 10 || isClosed() ? "disabled" : "")}</div>`}</section>` : note("La invitación la gestiona la organizadora", "Pídele un enlace si quieres invitar a otra persona.")}<p class="section-note" style="margin-top:28px">Retirar un acceso conserva sus gastos y deudas. No borra copias ya descargadas en otro dispositivo.</p>`,
    );
  }
  function activity() {
    const st = statusInfo(),
      pending = pendingChanges();
    const rows = [...state.history].reverse().map((entry) => ({
      label: entry.text,
      sub: `${person("a")} · cambio de ejemplo`,
      icon: "activity",
    }));
    return layout(
      heading(
        "Todo queda anotado",
        "Cambios, pendientes y decisiones del viaje.",
      ) +
        `
      <section><div class="section-heading"><h2>${icon(st[0])} ${st[1]}</h2></div><p class="section-note">${isOffline() ? "Puedes continuar en este dispositivo. El envío espera conexión; no se garantiza con la app cerrada." : pending.length ? `${pending.length} movimientos esperan confirmación. Las imágenes se envían por separado.` : "No hay movimientos locales pendientes de envío."}</p>${button(`${icon("refresh-cw")}Sincronizar ahora`, "sync", "secondary", isOffline() || state.scenario === "syncing" ? "disabled" : "")}</section>
      ${state.localChanges.length ? `<section class="section" aria-labelledby="local-title"><h2 id="local-title">${pending.length ? "Cambios en este dispositivo" : "Últimos envíos de ejemplo"}</h2><p class="section-note">${pending.length} cambios guardados en este dispositivo pendientes de confirmar.</p><ul class="local-changes">${state.localChanges.map((change) => `<li data-local-change="${change.id}" data-delivery="${change.status}"><div><strong>${esc(change.label)}</strong><span class="delivery-label">${icon(change.status === "error" ? "circle-alert" : change.status === "syncing" ? "refresh-cw" : change.status === "confirmed" ? "check-check" : "cloud-upload")}${deliveryText(change.status)}</span></div>${change.entity?.startsWith("e") || change.entity?.startsWith("demo-") ? `<button type="button" class="text-button" data-expense="${esc(change.entity)}">Ver gasto</button>` : linkButton("Ver balance", "balance")}</li>`).join("")}</ul></section>` : ""}
      ${state.scenario === "error" ? note("No pudimos confirmar el envío", "Las operaciones de la lista siguen conservadas como propuestas locales. Puedes volver a intentar o copiar la propuesta.", "error", button("Copiar propuesta local", "copy-proposal", "quiet")) : ""}
      ${isConflict() ? `<div class="activity-row"><span class="activity-symbol">${icon("circle-alert")}</span><div><p><strong>Dos versiones de un gasto</strong></p><small>Almuerzo en la plaza · saldo provisional</small>${linkButton("Comparar y resolver", "conflict")}</div></div>` : ""}
      ${state.scenario === "duplicate" && !state.duplicateResolved ? `<div class="activity-row"><span class="activity-symbol">${icon("copy")}</span><div><p><strong>¿Registraron el mismo café dos veces?</strong></p><small>Dos registros de $12.000; ambos cuentan hasta revisarlos.</small>${linkButton("Revisar posible duplicado", "duplicate")}</div></div>` : ""}
      ${state.scenario === "photo-error" ? note("Miniatura pendiente: Almuerzo en la plaza", "El gasto de $96.000 está registrado. Solo falta el adjunto.", "warning", button("Reintentar imagen de ejemplo", "retry-photo", "quiet")) : ""}
      <section class="section"><h2>Historial del viaje</h2>${[...rows, ...state.fixtureHistory].map((entry) => `<div class="activity-row"><span class="activity-symbol">${icon(entry.icon)}</span><div><p>${esc(entry.label)}</p><small>${esc(entry.sub)}</small></div></div>`).join("") || '<p class="section-note">Todavía no hay movimientos registrados.</p>'}</section>
    `,
    );
  }
  function conflict() {
    if (!expenses.some((expense) => expense.id === "e1")) {
      return layout(
        heading("Sin versiones pendientes") +
          empty(
            "Aquí no hay un conflicto",
            "Este viaje todavía no tiene gastos que comparar.",
            "check",
            linkButton("Volver al viaje", "home", "primary"),
          ),
      );
    }
    if (state.conflictResolved)
      return layout(
        routeBack("Volver a actividad", "activity") +
          heading("Resolución registrada") +
          empty(
            "Versiones conciliadas",
            "Ambas propuestas permanecen en el historial. El importe elegido ya cuenta una sola vez.",
            "circle-check",
            linkButton("Ver balance", "balance", "primary"),
          ),
        { form: true },
      );
    return layout(
      routeBack("Volver a actividad", "activity") +
        heading(
          "Dos versiones. Una decisión.",
          "Ambas personas editaron el mismo gasto sin conexión.",
        ) +
        note(
          "Saldo provisional",
          "«Almuerzo en la plaza» no está incluido en el subtotal mientras se revisa.",
          "warning",
        ) +
        `<form id="conflict-form"><fieldset style="border:0;margin:0;padding:0"><legend class="field-label">¿Qué versión corresponde al gasto real?</legend><div class="compare-grid">${[
          ["ana", "Ana", "96000", "Menú para compartir", "13:12"],
          ["bruno", "Bruno", "100000", "Incluye la propina", "13:14"],
        ]
          .map(
            ([id, name, total, note, time]) =>
              `<label class="proposal"><span class="proposal-header"><input type="radio" name="proposal" value="${total}" required>Versión de ${name}</span><strong class="money">${money(Number(total))}</strong><span class="compare-field"><span>Concepto</span><strong>Almuerzo en la plaza</strong></span><span class="compare-field"><span>Pagó</span><strong>Ana</strong></span><span class="compare-field"><span>Reparto</span><strong>Igual entre ${state.count}</strong></span><p>${note}</p><small>Editado 21 nov, ${time}. La hora no decide qué versión conservar.</small></label>`,
          )
          .join(
            "",
          )}</div></fieldset><div id="form-error" class="form-error" role="alert" hidden></div><p class="section-note">Se añadirá una resolución al historial. Ninguna de las dos propuestas se borrará. Si llega otra versión desconocida, se volverá a revisar.</p><div class="form-footer">${button("Crear una versión corregida", "custom-conflict", "secondary")}<button type="submit" class="button primary" ${isClosed() ? "disabled" : ""}>Confirmar versión</button></div></form>${isClosed() ? note("Incidencia en viaje finalizado", "La política para resolver incidencias tardías sigue pendiente. Este diseño conserva el resumen provisional y no habilita escrituras.", "warning") : ""}`,
      { form: true },
    );
  }
  function duplicate() {
    if (!expenses.some((expense) => expense.id === "c0")) {
      return layout(
        heading("Sin candidatos pendientes") +
          empty(
            "No hay duplicados para revisar",
            "Los gastos con el mismo nombre no se unifican automáticamente.",
            "check",
            linkButton("Volver al viaje", "home", "primary"),
          ),
      );
    }
    return layout(
      routeBack("Volver a actividad", "activity") +
        heading(
          "¿Un café o dos cafés?",
          "Se parecen, pero podrían ser compras distintas.",
        ) +
        (state.duplicateResolved
          ? empty(
              "Revisión registrada",
              "La decisión está en el historial. No se borró ningún registro.",
              "circle-check",
              linkButton("Ver movimientos", "home", "primary"),
            )
          : `<div class="compare-grid">${["15:00", "15:01"].map((time, i) => `<div class="proposal"><div class="proposal-header">${icon("coffee")}Registro ${i + 1}</div><h2>Café en la plaza</h2><strong class="money">$12.000</strong><p>Pagó Ana · Igual entre ${state.count}</p><small>21 nov · ${time}</small></div>`).join("")}</div>${note("Ambos cuentan por ahora", "Solo se unifican si confirmas que representan una misma compra.")}<p class="section-note">Unificar conserva el primer registro por $12.000 y vincula el segundo en su historial. No sumamos los dos importes.</p><div class="form-footer">${button("Son distintos", "distinct", "secondary")}${button("Unificar en un gasto", "confirm-merge", "primary", isClosed() ? "disabled" : "")}</div>`),
      { form: true },
    );
  }
  function summary() {
    const blocked =
      isOffline() ||
      state.pending > 0 ||
      isConflict() ||
      ["pending", "syncing", "error", "partial", "late-conflict"].includes(
        state.scenario,
      );
    const debt = suggestions().reduce((sum, p) => sum + p.amount, 0);
    return layout(
      heading(
        isClosed()
          ? "El viaje queda en la memoria"
          : "Antes de cerrar el viaje",
        isClosed()
          ? "Las cuentas y su historia siguen aquí."
          : "Un último vistazo, sin borrar nada.",
      ) +
        notice() +
        `<div class="hero-balance"><p class="balance-label">${isProvisional() ? "Subtotal provisional" : "Gasto total"}</p><div class="big-money">${money(cost())}</div><p class="context">${esc(state.tripTitle)} · ${state.count} personas · COP</p></div><div class="summary-line"><span>Presupuesto</span><strong>${noBudget() ? "No definido" : money(state.budget)}</strong></div><div class="summary-line"><span>Disponible</span><strong>${available() === null ? "Sin presupuesto" : money(available())}</strong></div><div class="summary-line"><span>Gastos efectivos</span><strong>${effective().length}</strong></div><div class="summary-line"><span>Deudas pendientes</span><strong class="money">${money(debt)}</strong></div><section class="section"><h2>Balance final${isProvisional() ? " · provisional" : ""}</h2>${balances()
          .map(
            (p) =>
              `<div class="summary-line"><span>${esc(p.name)}</span><strong>${money(Math.abs(p.balance))}<br><small>${p.balance > 0 ? "Por recibir" : p.balance < 0 ? "Por aportar" : "Al día"}</small></strong></div>`,
          )
          .join(
            "",
          )}</section>${!isClosed() ? `${note("Cerrar no significa saldar", "Las deudas pendientes seguirán visibles. Nadie podrá añadir gastos nuevos después del cierre.")}<p class="section-note">No podemos comprobar cambios que otros dispositivos aún tengan sin conexión. Pide al grupo que sincronice antes.</p>${blocked ? note("Revisa los pendientes antes de cerrar", "Necesitas conexión, datos completos y ningún conflicto ni cambio local pendiente.", "warning", linkButton("Revisar actividad", "activity")) : ""}<div class="form-footer">${owner() ? button("Finalizar viaje", "confirm-close", "primary", blocked ? "disabled" : "") : "<p>Solo la organizadora puede finalizar el viaje.</p>"}${linkButton("Seguir con el viaje", "home", "quiet")}</div>` : `<div class="form-footer">${linkButton("Consultar movimientos", "home", "secondary")}${linkButton("Volver a mis viajes", "trips", "quiet")}</div>`}`,
    );
  }
  const renderers = {
    home,
    welcome,
    signup: () => auth("signup"),
    login: () => auth("login"),
    reset: () => auth("reset"),
    verify,
    join,
    trips,
    create,
    expense,
    split,
    payers,
    detail,
    balance,
    payment,
    budget,
    "budget-edit": budgetEdit,
    stats,
    invite,
    activity,
    conflict,
    duplicate,
    summary,
  };
  function render(focus = false) {
    $("#app").innerHTML = (renderers[state.route] || home)();
    $("#screen-select").value = state.route;
    document.documentElement.dataset.theme = state.theme;
    $("#theme-toggle").textContent =
      state.theme === "light" ? "Oscuro" : "Claro";
    $("#theme-toggle").setAttribute(
      "aria-label",
      `Cambiar a modo ${state.theme === "light" ? "oscuro" : "claro"}`,
    );
    document.title = `${
      screens
        .find(([key]) => key === state.route)?.[1]
        .split(" · ")
        .pop() || "Viaje"
    } · Gastos compartidos · Prototipo`;
    measureFixedChrome();
    if (chromeObserver) {
      chromeObserver.disconnect();
      [$(".review-bar"), $(".bottom-nav"), $(".add-dock")]
        .filter(Boolean)
        .forEach((element) => chromeObserver.observe(element));
    }
    if (focus) {
      $("#main").focus({ preventScroll: true });
      window.scrollTo({ top: 0, behavior: "auto" });
    }
  }
  function go(route, skipDraft = false) {
    if (!renderers[route]) route = "home";
    if (
      ["split", "payers"].includes(route) &&
      state.route === "expense" &&
      !(parseMoney(draft().amount) > 0)
    ) {
      showError("Introduce primero el importe del gasto.", "expense-amount");
      return;
    }
    if (
      state.route === "expense" &&
      draft().dirty &&
      !["split", "payers"].includes(route) &&
      !skipDraft
    ) {
      state.exitRoute = route;
      openSheet(
        "Tu gasto sigue en borrador",
        '<p>Puedes salir y seguir editándolo al volver. En este prototipo, el borrador se pierde al recargar.</p><div class="sheet-actions">' +
          button("Salir y conservar borrador", "leave-draft", "secondary") +
          button("Continuar editando", "dismiss", "primary") +
          "</div>",
      );
      return;
    }
    state.previous = state.route;
    state.route = route;
    if (location.hash !== `#${route}`) history.pushState(null, "", `#${route}`);
    render(true);
  }
  function toast(message) {
    clearTimeout(toastTimer);
    $("#toast").textContent = message;
    $("#toast").hidden = false;
    toastTimer = setTimeout(() => {
      $("#toast").hidden = true;
    }, 4200);
  }
  function showError(message, fieldId) {
    const target = $("#form-error");
    if (target) {
      target.textContent = message;
      target.hidden = false;
      target.setAttribute("tabindex", "-1");
      target.focus({ preventScroll: true });
      target.scrollIntoView({ block: "center", behavior: "auto" });
    } else toast(message);
    if (fieldId) {
      const field = document.getElementById(fieldId);
      if (field) {
        field.setAttribute("aria-invalid", "true");
        field.setAttribute("aria-describedby", "form-error");
      }
    }
  }
  let sheetOpener;
  function openSheet(title, body) {
    const sheet = $("#sheet");
    if (sheet.open) sheet.close();
    sheetOpener = document.activeElement;
    sheet.innerHTML = `<div class="sheet-header"><h2 id="sheet-title">${title}</h2><button type="button" class="icon-button" data-action="dismiss" aria-label="Cerrar">${icon("x")}</button></div>${body}`;
    sheet.showModal();
  }
  function closeSheet() {
    const sheet = $("#sheet");
    if (sheet.open) sheet.close();
    if (sheetOpener?.isConnected) sheetOpener.focus();
  }
  function log(text, entity) {
    state.history.push({ text, entity });
    if (
      isOffline() ||
      ["pending", "error", "syncing"].includes(state.scenario)
    ) {
      state.localChanges.push({
        id: `local-${state.history.length}`,
        entity,
        label: text,
        status: state.scenario === "error" ? "error" : "pending",
      });
      state.pending = pendingChanges().length;
    }
  }
  function setScenario(value) {
    state.scenario = value;
    state.closed = false;
    state.newTrip = false;
    state.budget = 400000;
    state.locked = 0;
    state.locks = {};
    state.inviteRevoked = false;
    if (value === "full") {
      state.count = 10;
      $("#count-select").value = "10";
    }
    seed();
    if (["expired", "revoked", "full"].includes(value)) state.route = "invite";
    if (value === "access-revoked") state.route = "home";
    if (value === "late-conflict") state.route = "summary";
    $("#review-options").open = false;
    render(true);
  }
  function newExpense() {
    if (isClosed()) {
      toast("El viaje está finalizado. No admite gastos nuevos.");
      return;
    }
    go("expense", true);
  }
  function saveExpense() {
    const d = draft(),
      total = parseMoney(d.amount),
      distribution = splitData(),
      p = payerData();
    if (isClosed()) {
      showError("Este viaje está finalizado.");
      return;
    }
    if (!d.title.trim()) {
      showError(
        "Escribe un concepto para reconocer el gasto.",
        "expense-title",
      );
      return;
    }
    if (!Number.isFinite(total) || total <= 0) {
      showError(
        "Escribe un importe entre $1 y $1.000.000.000.000, sin puntos ni decimales.",
        "expense-amount",
      );
      return;
    }
    if (!distribution.valid) {
      showError(distribution.error);
      return;
    }
    if (!p.valid) {
      showError(
        "La suma de los aportes debe coincidir con el total del gasto.",
      );
      return;
    }
    if (
      !d.date ||
      d.date < state.tripStart ||
      d.date > state.tripEnd ||
      !/^\d{2}:\d{2}$/.test(d.time)
    ) {
      showError(
        "La fecha debe estar dentro del viaje y la hora debe ser válida.",
      );
      return;
    }
    if (state.scenario === "storage-error") {
      showError(
        "No se pudo guardar en este dispositivo. Conserva el formulario o copia sus datos; no cierres esta pestaña.",
      );
      return;
    }
    const entry = {
      id: d.editId || `demo-${expenses.length + 1}`,
      title: d.title.trim(),
      total,
      category: d.category,
      payers: p.payers,
      shares: distribution.shares,
      note: d.note,
      time: d.time,
      day: d.date,
      splitMode: d.split,
      weights: { ...d.weights },
      fixed: { ...d.fixed },
    };
    if (d.editId) {
      const i = expenses.findIndex((e) => e.id === d.editId);
      expenses[i] = entry;
      log(
        `Se editó «${entry.title}». Antes ${money(d.beforeTotal)}, después ${money(total)}.`,
        entry.id,
      );
    } else {
      expenses.push(entry);
      log(`Se añadió «${entry.title}» por ${money(total)}.`, entry.id);
    }
    if (d.resolvingConflict) {
      state.conflictResolved = true;
      log(
        "Se conservaron ambas propuestas y se registró una versión corregida.",
        "e1",
      );
    }
    state.draft = null;
    go("home", true);
    toast(
      isOffline()
        ? "Gasto de ejemplo añadido · envío pendiente simulado"
        : "Gasto añadido al ejemplo de esta pestaña",
    );
  }
  const actions = {
    "new-expense": newExpense,
    more() {
      openSheet(
        "Tu viaje",
        `<p class="sheet-eyebrow">${esc(state.tripTitle)}</p>${[
          ["invite", "Personas e invitación", "users"],
          ["budget", "Presupuesto", "wallet"],
          ["stats", "Estadísticas", "chart-no-axes-combined"],
          ["summary", "Resumen y finalización", "file-text"],
          ["trips", "Cambiar de viaje", "map-pin"],
        ]
          .map(
            ([route, label, img]) =>
              `<button class="setting-row" type="button" data-sheet-route="${route}"><span class="start">${icon(img)}<strong>${label}</strong></span>${icon("chevron-right")}</button>`,
          )
          .join("")}`,
      );
    },
    dismiss: closeSheet,
    "leave-draft"() {
      closeSheet();
      go(state.exitRoute || "home", true);
    },
    verified() {
      go("trips");
      toast("Verificación simulada. No se creó una cuenta real.");
    },
    resend() {
      toast("Reenvío simulado. No se envió ningún correo.");
    },
    scan() {
      openSheet(
        "Escanear una invitación",
        '<p>La app real pedirá permiso de cámara. Puedes pegar el código si no autorizas el acceso.</p><div class="sheet-actions">' +
          button("Usar código de ejemplo", "demo-code", "primary") +
          button("Permiso denegado: pegar código", "dismiss", "secondary") +
          "</div>",
      );
    },
    "demo-code"() {
      closeSheet();
      $("#invite-code").value = "DEMO-VIAJE.MUESTRA-INVITACION-NO-VALIDA";
      $("#guest-name").focus();
    },
    photo() {
      openSheet(
        "Una imagen para reconocerlo",
        '<p>Guardarás una miniatura comprimida, no el original. El gasto se puede guardar aunque falle la imagen.</p><div class="sheet-actions">' +
          button(
            `${icon("camera")}Cámara de ejemplo`,
            "demo-camera",
            "secondary",
          ) +
          button(
            `${icon("image")}Galería de ejemplo`,
            "demo-gallery",
            "secondary",
          ) +
          button(
            `${icon("search")}Imágenes de stock · Openverse`,
            "openverse",
            "secondary",
          ) +
          button("Seguir sin imagen", "dismiss", "quiet") +
          "</div>",
      );
    },
    "demo-photo"() {
      if (state.route === "expense") {
        draft().photo = true;
        draft().dirty = true;
      }
      closeSheet();
      render();
      $('#main [data-action="photo"]')?.focus({ preventScroll: true });
      toast("Miniatura de ejemplo seleccionada. No se accedió a la cámara.");
    },
    "demo-camera"() {
      actions["demo-photo"]();
      toast("Cámara simulada. No se solicitaron permisos reales.");
    },
    "demo-gallery"() {
      actions["demo-photo"]();
      toast("Galería simulada. No se leyó ningún archivo del dispositivo.");
    },
    openverse() {
      closeSheet();
      openSheet(
        "Imágenes abiertas",
        '<p>La búsqueda de stock necesita conexión. Una selección conservará creador, fuente y licencia. Este prototipo no consulta la API.</p><div class="photo-placeholder">' +
          icon("image") +
          '<div><p>Resultado de demostración · paisaje</p><small>Ficha ficticia para revisar la atribución; sin imagen remota.</small></div></div><div class="sheet-actions">' +
          button(
            "Probar error y continuar sin imagen",
            "openverse-error",
            "secondary",
          ) +
          button("Volver al gasto", "dismiss", "primary") +
          "</div>",
      );
    },
    "openverse-error"() {
      closeSheet();
      toast(
        "La búsqueda no está disponible. Puedes guardar el gasto sin imagen.",
      );
    },
    "retry-photo"() {
      toast(
        "Reintento de imagen simulado. El importe monetario sigue intacto.",
      );
    },
    "apply-split"() {
      const s = splitData();
      if (!s.valid) {
        toast(s.error);
        return;
      }
      draft().dirty = true;
      go("expense");
    },
    "apply-payers"() {
      if (!payerData().valid) {
        toast("Los aportes deben ser positivos y sumar el total.");
        return;
      }
      draft().dirty = true;
      go("expense");
    },
    "edit-expense"() {
      const e = expenses.find((e) => e.id === state.selected) || expenses[0];
      if (!e) return;
      state.draft = {
        ...draft(),
        title: e.title,
        amount: String(e.total),
        category: e.category,
        note: e.note,
        date: e.day,
        time: e.time,
        payerIds: Object.keys(e.payers),
        payers: Object.fromEntries(
          Object.entries(e.payers).map(([id, n]) => [id, String(n)]),
        ),
        included: Object.keys(e.shares),
        split: e.splitMode || "fixed",
        fixed: Object.fromEntries(
          Object.entries(e.shares).map(([id, n]) => [id, String(n)]),
        ),
        weights: e.weights || {},
        editId: e.id,
        beforeTotal: e.total,
        dirty: false,
      };
      go("expense", true);
    },
    "delete-expense"() {
      openSheet(
        "¿Eliminar este gasto?",
        '<p>Dejará de contar en saldos y presupuesto. El importe y todos los cambios seguirán en el historial.</p><div class="sheet-actions">' +
          button("Eliminar y conservar historial", "do-delete", "danger") +
          button("Conservar gasto", "dismiss", "secondary") +
          "</div>",
      );
    },
    "do-delete"() {
      const e = expenses.find((e) => e.id === state.selected);
      if (e && !isClosed()) {
        e.deleted = true;
        log(`Se eliminó lógicamente «${e.title}» por ${money(e.total)}.`, e.id);
      }
      closeSheet();
      render();
      toast("Gasto eliminado del ejemplo. Historial conservado.");
    },
    "restore-expense"() {
      const e = expenses.find((e) => e.id === state.selected);
      if (e && !isClosed()) {
        e.deleted = false;
        log(`Se restauró «${e.title}» por ${money(e.total)}.`, e.id);
        render();
      }
    },
    "new-payment"() {
      state.paymentAmount = "";
      go("payment");
    },
    "confirm-payment"() {
      closeSheet();
      commitPayment();
    },
    "copy-invite"() {
      const text = `DEMO-VIAJE.MUESTRA-${state.inviteGeneration}-INVITACION-NO-VALIDA`;
      copyText(text, "Código de ejemplo copiado. No es una invitación real.");
    },
    "revoke-invite"() {
      if (isOffline() || !owner()) return;
      openSheet(
        "¿Revocar esta invitación?",
        '<p>El enlace anterior dejará de permitir nuevas entradas. Las personas que ya entraron conservan su acceso.</p><div class="sheet-actions">' +
          button("Revocar invitación", "do-revoke-invite", "danger") +
          button("Conservar invitación", "dismiss", "secondary") +
          "</div>",
      );
    },
    "do-revoke-invite"() {
      state.inviteRevoked = true;
      log("Se revocó la invitación de ejemplo.");
      closeSheet();
      render();
    },
    "new-invite"() {
      if (isOffline() || !owner() || isClosed() || state.count === 10) return;
      state.inviteRevoked = false;
      if (["expired", "revoked"].includes(state.scenario))
        state.scenario = "synced";
      $("#state-select").value = state.scenario;
      state.inviteGeneration++;
      render();
      toast("Nueva invitación simulada. No se creó un token real.");
    },
    "copy-proposal"() {
      const labels = pendingChanges().map((change) => change.label);
      copyText(
        labels.length
          ? "Propuestas locales de ejemplo:\n" + labels.join("\n")
          : "No hay propuestas pendientes en este escenario de ejemplo.",
        "Texto de las propuestas de este escenario copiado.",
      );
    },
    sync() {
      if (isOffline()) return;
      if (isConflict() || state.scenario === "partial") {
        toast(
          "Sincronizar no resuelve versiones ni valida datos incompletos. Revisa la incidencia.",
        );
        return;
      }
      const returnScenario = ["pending", "error", "syncing"].includes(
        state.scenario,
      )
        ? "synced"
        : state.scenario;
      const sendingIds = new Set(pendingChanges().map((change) => change.id));
      const generation = ++syncGeneration;
      if (isClosed()) state.closed = true;
      if (noBudget()) state.budget = null;
      pendingChanges().forEach((change) => {
        change.status = "syncing";
      });
      state.scenario = "syncing";
      $("#state-select").value = "syncing";
      render();
      toast("Simulando la espera de confirmación…");
      setTimeout(() => {
        if (generation !== syncGeneration || state.scenario !== "syncing")
          return;
        state.localChanges.forEach((change) => {
          if (sendingIds.has(change.id)) change.status = "confirmed";
        });
        state.pending = pendingChanges().length;
        state.scenario = state.pending ? "pending" : returnScenario;
        $("#state-select").value = state.scenario;
        render();
        toast("Simulación terminada. No hubo conexión a un servidor.");
      }, 900);
    },
    "custom-conflict"() {
      state.selected = "e1";
      actions["edit-expense"]();
      draft().resolvingConflict = true;
      draft().dirty = true;
    },
    distinct() {
      if (isClosed()) return;
      state.duplicateResolved = true;
      log(
        "Se confirmó que los dos cafés son compras distintas. Se conservan ambos importes.",
      );
      render();
      toast("Decisión registrada en el ejemplo.");
    },
    "confirm-merge"() {
      if (isClosed()) return;
      openSheet(
        "¿Unificar los dos registros?",
        '<p>Quedará un único gasto efectivo de $12.000. Ambos registros y esta decisión se conservarán en el historial.</p><div class="sheet-actions">' +
          button("Confirmar unificación", "do-merge", "primary") +
          button("Volver a comparar", "dismiss", "secondary") +
          "</div>",
      );
    },
    "do-merge"() {
      const loser = expenses.find((e) => e.id === "c1");
      if (loser) loser.merged = true;
      state.duplicateResolved = true;
      log(
        "Se unificaron los cafés: $12.000 efectivos; ambos registros conservados.",
        "c0",
      );
      closeSheet();
      render();
      toast("Unificación simulada. El importe cuenta una sola vez.");
    },
    "confirm-close"() {
      if (!owner() || isOffline() || isConflict() || isProvisional()) return;
      openSheet(
        "¿Finalizar el viaje?",
        `<p>Se conservarán los ${money(cost())} de gastos y las deudas pendientes. El grupo ya no podrá añadir movimientos.</p><p>Antes, confirma que las demás personas enviaron sus cambios. No podemos comprobar sus dispositivos sin conexión.</p><div class="sheet-actions">${button("Sí, finalizar viaje", "do-close", "primary")}${button("Seguir revisando", "dismiss", "secondary")}</div>`,
      );
    },
    "do-close"() {
      if (!owner() || isOffline() || isConflict() || isProvisional()) return;
      state.closed = true;
      log("La organizadora finalizó el viaje.");
      closeSheet();
      render();
      toast("Viaje finalizado en el ejemplo. Historial conservado.");
    },
    "past-trip"() {
      openSheet(
        "Ejemplo de viaje finalizado",
        '<p>El viaje de Guatavita ilustra un elemento del historial. Para revisar el resumen completo, usa el escenario «Viaje finalizado» sobre el conjunto de datos del prototipo.</p><div class="sheet-actions">' +
          button("Ver ejemplo finalizado", "demo-closed", "primary") +
          "</div>",
      );
    },
    "demo-closed"() {
      closeSheet();
      state.scenario = "closed";
      state.closed = true;
      $("#state-select").value = "closed";
      go("summary");
    },
    "member-access-info"() {
      closeSheet();
      openSheet(
        "Acceso e identidad contable",
        '<p>En la aplicación, la organizadora podrá retirar un acceso sin borrar gastos ni deudas. Reasignar el acceso perdido de una persona requiere identificarla y confirmar la sustitución; su nombre no recupera el acceso.</p><div class="sheet-actions">' +
          button("Entendido", "dismiss", "primary") +
          "</div>",
      );
    },
  };
  async function copyText(text, message) {
    try {
      await navigator.clipboard.writeText(text);
      toast(message);
    } catch {
      openSheet(
        "Copia el texto de ejemplo",
        `<div class="code">${esc(text)}</div><p class="small muted" style="margin-top:12px">Tu navegador no permitió copiar automáticamente. Selecciona el texto.</p><div class="sheet-actions">${button("Cerrar", "dismiss", "primary")}</div>`,
      );
    }
  }
  function updateSplitOutput() {
    const s = splitData();
    const out = $("#allocation-output");
    if (out) out.innerHTML = allocationOutput();
    const apply = $("#apply-split");
    if (apply) apply.disabled = !s.valid;
    document
      .querySelectorAll("[data-quota]")
      .forEach(
        (el) => (el.textContent = money(s.shares[el.dataset.quota] || 0)),
      );
  }
  function updateDraftSummary() {
    const s = splitData();
    if ($("#my-share"))
      $("#my-share").textContent = s.valid
        ? money(s.shares.a || 0)
        : "Por definir";
  }
  function commitPayment() {
    const p = state.pendingPayment;
    if (!p || isClosed()) return;
    payments.push({
      ...p,
      day: today(),
      id: `p${payments.length + 1}`,
      time: "15:30",
    });
    log(
      `Se registró un abono de ${person(p.from)} a ${person(p.to)} por ${money(p.amount)}.`,
      payments[payments.length - 1].id,
    );
    state.pendingPayment = null;
    go("balance", true);
    toast("Abono de ejemplo registrado. El costo del viaje no cambió.");
  }
  document.addEventListener("click", (event) => {
    const el = event.target.closest("button,a");
    if (!el || el.disabled) return;
    if (el.dataset.route) {
      event.preventDefault();
      if ($("#sheet").open) closeSheet();
      go(el.dataset.route);
    } else if (el.dataset.sheetRoute) {
      closeSheet();
      go(el.dataset.sheetRoute);
    } else if (el.dataset.action) {
      event.preventDefault();
      actions[el.dataset.action]?.();
    } else if (el.dataset.expense) {
      state.selected = el.dataset.expense;
      go("detail");
    } else if (el.dataset.payment) {
      [state.paymentFrom, state.paymentTo, state.paymentAmount] =
        el.dataset.payment.split(",");
      go("payment");
    } else if (el.dataset.split) {
      const d = draft();
      d.split = el.dataset.split;
      d.dirty = true;
      if (d.split === "percentage" && !Object.keys(d.weights).length) {
        const w = equal(10000, d.included);
        d.weights = Object.fromEntries(
          Object.entries(w).map(([id, n]) => [
            id,
            (n / 100).toFixed(2).replace(".", ","),
          ]),
        );
      }
      if (d.split === "fixed" && !Object.keys(d.fixed).length)
        d.fixed = Object.fromEntries(
          Object.entries(equal(parseMoney(d.amount) || 0, d.included)).map(
            ([id, n]) => [id, String(n)],
          ),
        );
      render();
      $(`[data-split="${d.split}"]`)?.focus({ preventScroll: true });
    } else if (el.dataset.revokePerson) {
      openSheet(
        `Acceso de ${esc(person(el.dataset.revokePerson))}`,
        '<p>Gestionar un acceso requiere conexión y no elimina su identidad contable ni sus deudas.</p><div class="sheet-actions">' +
          button(
            "Ver política de acceso perdido",
            "member-access-info",
            "secondary",
          ) +
          button("Conservar acceso", "dismiss", "primary") +
          "</div>",
      );
    }
  });
  document.addEventListener("input", (event) => {
    const el = event.target;
    if (el.dataset.draft) {
      draft()[el.dataset.draft] = el.value;
      draft().dirty = true;
      if (el.dataset.draft === "amount" && draft().payerIds.length === 1)
        draft().payers[draft().payerIds[0]] = el.value;
      updateDraftSummary();
      el.removeAttribute("aria-invalid");
    }
    if (el.dataset.allocation) {
      const d = draft();
      (d.split === "fixed" ? d.fixed : d.weights)[el.dataset.allocation] =
        el.value;
      d.dirty = true;
      updateSplitOutput();
    }
    if (el.dataset.contribution) {
      draft().payers[el.dataset.contribution] = el.value;
      draft().dirty = true;
      if ($("#payer-output")) $("#payer-output").innerHTML = payerOutput();
    }
  });
  document.addEventListener("change", (event) => {
    const el = event.target;
    if (el.id === "screen-select") {
      state.route = el.value;
      if (["split", "payers"].includes(el.value) && !draft().amount)
        draft().amount = "100";
      if (el.value === "conflict" && !isConflict()) {
        state.scenario = "conflict";
        $("#state-select").value = "conflict";
        state.conflictResolved = false;
      }
      if (el.value === "duplicate" && state.scenario !== "duplicate") {
        state.scenario = "duplicate";
        $("#state-select").value = "duplicate";
        seed();
      }
      history.replaceState(null, "", `#${state.route}`);
      render(true);
    } else if (el.id === "state-select") setScenario(el.value);
    else if (el.id === "add-placement") {
      state.addButton = el.value;
      const dock = $(".add-dock");
      if (dock) dock.dataset.variant = state.addButton;
      measureFixedChrome();
    } else if (el.id === "role-select") {
      state.role = el.value;
      render();
    } else if (el.id === "count-select") {
      state.count = Number(el.value);
      seed();
      render();
    } else if (el.dataset.include) {
      const d = draft();
      d.included = el.checked
        ? [...d.included, el.dataset.include]
        : d.included.filter((id) => id !== el.dataset.include);
      d.dirty = true;
      render();
      document.getElementById(el.id)?.focus({ preventScroll: true });
    } else if (el.dataset.payer) {
      const d = draft();
      document
        .querySelectorAll("[data-contribution]:not(:disabled)")
        .forEach(
          (input) => (d.payers[input.dataset.contribution] = input.value),
        );
      d.payerIds = el.checked
        ? [...d.payerIds, el.dataset.payer]
        : d.payerIds.filter((id) => id !== el.dataset.payer);
      d.dirty = true;
      render();
      document.getElementById(el.id)?.focus({ preventScroll: true });
    }
  });
  document.addEventListener("submit", (event) => {
    const form = event.target;
    if (
      ![
        "auth-form",
        "join-form",
        "create-form",
        "expense-form",
        "payment-form",
        "budget-form",
        "conflict-form",
      ].includes(form.id)
    )
      return;
    event.preventDefault();
    if (form.id === "expense-form") {
      saveExpense();
      return;
    }
    if (form.id === "auth-form") {
      if (isOffline()) {
        showError(
          "Necesitas conexión para acceder, crear o recuperar una cuenta.",
        );
        return;
      }
      if (!$("#auth-email").value.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
        showError(
          "Escribe un correo electrónico de ejemplo válido.",
          "auth-email",
        );
        return;
      }
      if (form.dataset.kind === "signup" && !$("#auth-name").value.trim()) {
        showError("Escribe tu nombre.", "auth-name");
        return;
      }
      if (
        form.dataset.kind !== "reset" &&
        $("#auth-password").value.length < 8
      ) {
        showError(
          "Usa una contraseña ficticia de al menos 8 caracteres.",
          "auth-password",
        );
        return;
      }
      if (form.dataset.kind === "reset") {
        openSheet(
          "Revisa tu correo",
          '<p>En la aplicación, recibirías el enlace de recuperación si la cuenta existe. Este prototipo no envió ningún correo.</p><div class="sheet-actions">' +
            linkButton("Volver a iniciar sesión", "login", "primary") +
            "</div>",
        );
        return;
      }
      go(form.dataset.kind === "signup" ? "verify" : "trips");
    } else if (form.id === "join-form") {
      if (["offline", "expired", "revoked", "full"].includes(state.scenario))
        return;
      if (
        !$("#invite-code").value.trim() ||
        !$("#guest-name").value.trim() ||
        !$("#guest-warning").checked
      ) {
        showError(
          "Completa el código, tu nombre y confirma que entiendes cómo se conserva el acceso.",
        );
        return;
      }
      state.role = "member";
      $("#role-select").value = "member";
      go("home");
      toast("Entrada de invitado simulada. No se creó una identidad real.");
    } else if (form.id === "create-form") {
      if (isOffline() || !owner()) return;
      const name = $("#trip-name").value.trim(),
        start = $("#trip-start").value,
        end = $("#trip-end").value;
      if (!name) {
        showError("Dale un nombre al viaje.", "trip-name");
        return;
      }
      if (
        !start ||
        !end ||
        end < start ||
        (Date.parse(end) - Date.parse(start)) / 86400000 > 365
      ) {
        showError(
          "Comprueba las fechas: el viaje puede durar entre 1 y 366 días.",
        );
        return;
      }
      const raw = $("#trip-budget").value.trim(),
        b = raw === "" ? null : parseMoney(raw);
      if (raw !== "" && !Number.isFinite(b)) {
        showError(
          "El presupuesto debe ser un importe entero o quedar vacío.",
          "trip-budget",
        );
        return;
      }
      state.tripTitle = name;
      state.tripStart = start;
      state.tripEnd = end;
      state.tripZone = $("#trip-timezone").value;
      state.budget = b;
      state.newTrip = true;
      state.count = 1;
      state.closed = false;
      state.locked = 0;
      state.locks = {};
      $("#count-select").value = "1";
      state.scenario = "empty";
      $("#state-select").value = "empty";
      seed();
      go("invite");
      toast("Viaje creado en la simulación. Invita al resto para empezar.");
    } else if (form.id === "payment-form") {
      if (isClosed()) return;
      const amount = parseMoney($("#payment-amount").value),
        from = $("#payment-from").value,
        to = $("#payment-to").value;
      if (!Number.isFinite(amount) || amount <= 0 || from === to) {
        showError(
          "Elige dos personas distintas e indica un abono positivo en pesos enteros.",
        );
        return;
      }
      state.pendingPayment = { from, to, amount };
      const debt =
        suggestions().find((p) => p.from === from && p.to === to)?.amount || 0;
      if (amount > debt) {
        openSheet(
          "Este abono supera la sugerencia",
          `<p>Vas a registrar ${money(amount)}. Puede representar un adelanto y cambiar quién debe a quién. Confirma que el pago ocurrió.</p><div class="sheet-actions">${button("Registrar de todos modos", "confirm-payment", "primary")}${button("Revisar importe", "dismiss", "secondary")}</div>`,
        );
        return;
      }
      commitPayment();
    } else if (form.id === "budget-form") {
      if (!owner() || isClosed()) return;
      const raw = $("#budget-total").value.trim(),
        b = raw === "" ? null : parseMoney(raw),
        locks = {};
      let invalid = false;
      document.querySelectorAll("[data-budget-day]").forEach((input) => {
        if (input.value.trim() !== "") {
          const n = parseMoney(input.value);
          if (!Number.isFinite(n)) invalid = true;
          locks[input.dataset.budgetDay] = n;
        }
      });
      const reserved = Object.entries(locks)
        .filter(([day]) => day > today())
        .reduce((sum, [, amount]) => sum + amount, 0);
      if (
        invalid ||
        (b !== null && !Number.isFinite(b)) ||
        (b === null && Object.keys(locks).length) ||
        (b !== null && reserved > Math.max(0, b - cost()))
      ) {
        showError(
          "Revisa los importes: las reservas futuras no pueden superar el dinero disponible.",
        );
        return;
      }
      state.budget = b;
      state.locks = locks;
      if (state.scenario === "no-budget") {
        state.scenario = "synced";
        $("#state-select").value = "synced";
      }
      log("Se ajustó el presupuesto y se conservaron las reservas manuales.");
      go("budget");
      toast("Presupuesto de ejemplo actualizado.");
    } else if (form.id === "conflict-form") {
      if (isClosed()) return;
      const selected = form.querySelector("input[name=proposal]:checked");
      if (!selected) {
        showError("Selecciona la versión que corresponde al gasto real.");
        return;
      }
      const e = expenses.find((e) => e.id === "e1");
      const total = Number(selected.value);
      e.total = total;
      e.payers = { a: total };
      e.shares = equal(
        total,
        people().map((p) => p.id),
      );
      state.conflictResolved = true;
      log(
        `Se conciliaron las versiones de ${money(96000)} y ${money(100000)}; se eligió ${money(total)}. Ambas propuestas se conservaron.`,
        "e1",
      );
      render();
      toast("Resolución de ejemplo registrada.");
    }
  });
  $("#theme-toggle").addEventListener("click", () => {
    state.theme = state.theme === "light" ? "dark" : "light";
    document.documentElement.dataset.theme = state.theme;
    $("#theme-toggle").textContent =
      state.theme === "light" ? "Oscuro" : "Claro";
    $("#theme-toggle").setAttribute(
      "aria-label",
      `Cambiar a modo ${state.theme === "light" ? "oscuro" : "claro"}`,
    );
  });
  function measureFixedChrome() {
    for (const [selector, property] of [
      [".review-bar", "--review-height"],
      [".bottom-nav", "--nav-height"],
      [".add-dock", "--add-height"],
    ]) {
      const height = $(selector)?.getBoundingClientRect().height;
      if (height > 0)
        document.documentElement.style.setProperty(property, `${height}px`);
    }
  }
  const chromeObserver =
    typeof ResizeObserver === "function"
      ? new ResizeObserver(measureFixedChrome)
      : null;
  window.addEventListener("resize", measureFixedChrome);
  $("#reset-demo").addEventListener("click", () => {
    Object.assign(state, {
      scenario: "synced",
      role: "owner",
      count: 3,
      route: "home",
      tripTitle: "Villa de Leyva",
      tripStart: "2026-11-21",
      tripEnd: "2026-11-24",
      tripZone: "America/Bogota",
      budget: 400000,
      locked: 0,
      locks: {},
      closed: false,
      newTrip: false,
      inviteRevoked: false,
    });
    $("#state-select").value = "synced";
    $("#count-select").value = "3";
    $("#role-select").value = "owner";
    $("#review-options").open = false;
    seed();
    history.replaceState(null, "", "#home");
    render(true);
    toast("Ejemplo restablecido.");
  });
  $("#sheet").addEventListener("click", (event) => {
    if (event.target === $("#sheet")) {
      const rect = $("#sheet").getBoundingClientRect();
      if (
        event.clientY < rect.top ||
        event.clientY > rect.bottom ||
        event.clientX < rect.left ||
        event.clientX > rect.right
      )
        closeSheet();
    }
  });
  window.addEventListener("popstate", () => {
    const route = location.hash.slice(1) || "home";
    if (renderers[route]) {
      if (
        state.route === "expense" &&
        draft().dirty &&
        !["split", "payers"].includes(route)
      ) {
        history.pushState(null, "", "#expense");
        go(route);
        return;
      }
      state.route = route;
      render(true);
    }
  });
  $("#screen-select").innerHTML = screens
    .map(([key, title]) => `<option value="${key}">${title}</option>`)
    .join("");
  seed();
  const query = new URLSearchParams(location.search);
  if (query.get("theme") === "dark" || query.get("theme") === "light")
    state.theme = query.get("theme");
  if (query.get("view") === "wireframe")
    document.body.classList.add("wireframe-mode");
  if (["1", "2", "3", "10"].includes(query.get("count"))) {
    state.count = Number(query.get("count"));
    seed();
  }
  if (
    [...$("#state-select").options].some(
      (o) => o.value === query.get("scenario"),
    )
  ) {
    state.scenario = query.get("scenario");
    seed();
  }
  const initialRoute = location.hash.slice(1);
  if (renderers[initialRoute]) state.route = initialRoute;
  if (
    state.route === "conflict" &&
    !["closed", "late-conflict"].includes(state.scenario)
  )
    state.scenario = "conflict";
  if (state.route === "duplicate") {
    state.scenario = "duplicate";
    seed();
  }
  $("#state-select").value = state.scenario;
  render();
})();
