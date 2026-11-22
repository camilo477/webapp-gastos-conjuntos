/* Solo navegador real. HTTP por defecto; file explícito para diagnóstico sin sockets. */
const fs = require("node:fs");
const path = require("node:path");
const { modules, context, toolsDir } = require("./runtime.cjs");
const { test, expect } = modules("playwright/test");
const run = context();
const sizes = [
  [320, 568],
  [375, 667],
  [390, 844],
  [430, 932],
  [768, 1024],
  [1440, 900],
];
const representative = new Set([
  "home",
  "expense",
  "balance",
  "budget",
  "invite",
  "conflict",
]);

test.beforeEach(({}, info) => {
  const engine = run.preflight?.browsers.find(
    (entry) => entry.name === info.project.name,
  );
  if (engine)
    test.skip(
      engine.status !== "rendered-probe",
      `Sonda nueva ${info.project.name}: ${engine.status}; no se ejecutó el cuerpo de la prueba.`,
    );
});
async function settle(page) {
  await page.evaluate(async () => {
    await document.fonts.ready;
    await new Promise((resolve) =>
      requestAnimationFrame(() => requestAnimationFrame(resolve)),
    );
  });
}
async function screen(page, route) {
  await page.selectOption("#screen-select", route);
  await expect(page.locator("#main")).toBeVisible();
  await expect(page.locator("#screen-select")).toHaveValue(route);
  await settle(page);
}
async function scenario(page, value) {
  const details = page.locator("#review-options");
  if (!(await details.evaluate((el) => el.open)))
    await details.locator("summary").click();
  await page.selectOption("#state-select", value);
  // setScenario ya cierra el panel; un clic incondicional lo volvía a abrir.
  if (await details.evaluate((el) => el.open))
    await details.locator("summary").click();
  await expect(details).toHaveJSProperty("open", false);
  await settle(page);
}
async function open(page) {
  const response = await page.goto("index.html");
  if (run.transport === "http") expect(response.status()).toBe(200);
  else expect(page.url()).toMatch(/^file:\/\//);
  await expect(page.locator("#main")).toBeVisible();
  await settle(page);
}
async function capture(page, info, name) {
  await expect(page.locator("#review-options")).toHaveJSProperty("open", false);
  fs.mkdirSync(run.screenshotDir, { recursive: true });
  const file = path.join(run.screenshotDir, `${info.project.name}-${name}.png`);
  await page.screenshot({ path: file, fullPage: true, animations: "disabled" });
  await info.attach(name, { path: file, contentType: "image/png" });
}
async function layout(page, label) {
  const issues = await page.evaluate(() => {
    const issues = [];
    if (document.documentElement.scrollWidth > innerWidth + 1)
      issues.push("overflow horizontal del documento");
    for (const el of document.querySelectorAll(
      "#main .money, #main .big-money",
    )) {
      const rect = el.getBoundingClientRect(),
        style = getComputedStyle(el);
      if (
        rect.width &&
        el.clientWidth &&
        el.scrollWidth > el.clientWidth + 1 &&
        ["hidden", "clip"].includes(style.overflowX)
      )
        issues.push(`importe recortado: ${el.textContent}`);
    }
    for (const el of document.querySelectorAll(
      "#main button, #main input:not([type=checkbox]), #main select, #main textarea",
    )) {
      const rect = el.getBoundingClientRect();
      if (!rect.width || !rect.height) continue;
      if (rect.right > innerWidth + 1 || rect.left < -1)
        issues.push(
          `control fuera del ancho: ${el.id || el.getAttribute("aria-label") || el.textContent.trim().slice(0, 40)}`,
        );
    }
    return issues;
  });
  expect(issues, label).toEqual([]);
}
async function text200(page) {
  // Emulación explícita de texto 200%; no equivale al zoom nativo/OS.
  await page.evaluate(() => {
    const sizes = [...document.querySelectorAll("#app *")]
      .filter((el) => el instanceof HTMLElement)
      .map((el) => [el, parseFloat(getComputedStyle(el).fontSize)]);
    for (const [el, size] of sizes) el.style.fontSize = `${size * 2}px`;
  });
  await settle(page);
}

async function readableBudget(page) {
  const metrics = await page
    .locator(".heading-actions .button")
    .evaluate((el) => {
      const style = getComputedStyle(el),
        context = document.createElement("canvas").getContext("2d");
      context.font = `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
      const word = Math.max(
        ...el.textContent
          .trim()
          .split(/\s+/)
          .map((word) => context.measureText(word).width),
      );
      return {
        width: el.getBoundingClientRect().width,
        minimum:
          word +
          parseFloat(style.paddingLeft) +
          parseFloat(style.paddingRight) +
          parseFloat(style.borderLeftWidth) +
          parseFloat(style.borderRightWidth),
      };
    });
  expect(
    metrics.width,
    "El botón debe conservar palabras completas",
  ).toBeGreaterThanOrEqual(metrics.minimum - 2);
  for (const selector of ["[data-daily-assigned]", "[data-daily-spent]"]) {
    const lines = await page.locator(selector).evaluate((el) => {
      const range = document.createRange();
      range.selectNodeContents(el);
      return [...range.getClientRects()].filter((rect) => rect.width > 0)
        .length;
    });
    expect(lines, `Importe legible en una línea: ${selector}`).toBe(1);
  }
}

for (const [width, height] of sizes)
  for (const theme of ["light", "dark"])
    test(`Responsive ${width}x${height} ${theme}`, async ({ page }, info) => {
      await page.setViewportSize({ width, height });
      await open(page);
      if ((await page.locator("html").getAttribute("data-theme")) !== theme)
        await page.locator("#theme-toggle").click();
      const routes = await page
        .locator("#screen-select option")
        .evaluateAll((options) => options.map((option) => option.value));
      expect(routes).toHaveLength(23);
      for (const route of routes) {
        if (route === "conflict") await scenario(page, "conflict");
        await screen(page, route);
        if (
          (width === 390 && theme === "light" && representative.has(route)) ||
          (route === "home" &&
            ((width === 390 && theme === "dark") ||
              (width === 1440 && theme === "dark")))
        )
          await capture(page, info, `${width}x${height}-${theme}-${route}`);
        await layout(page, `${route}, ${width}x${height}, ${theme}`);
        if (route === "budget") await readableBudget(page);
        const images = await page
          .locator("#app img")
          .evaluateAll((images) =>
            images
              .filter((el) => !el.complete || !el.naturalWidth)
              .map((el) => el.getAttribute("src")),
          );
        expect(images, `recursos ${route}`).toEqual([]);
        if (route === "home" && width <= 700) {
          const dock = await page.locator(".add-dock").boundingBox(),
            workspace = await page.locator(".workspace").boundingBox(),
            nav = await page.locator(".bottom-nav").boundingBox();
          expect(workspace.y + workspace.height).toBeLessThanOrEqual(
            dock.y + 1,
          );
          expect(dock.y + dock.height).toBeLessThanOrEqual(nav.y + 1);
          const button = await page.locator(".fab").boundingBox();
          expect(button.height).toBeGreaterThanOrEqual(44);
          expect(button.width).toBeGreaterThanOrEqual(44);
          await page.locator(".workspace").evaluate((el) => {
            el.scrollTop = el.scrollHeight;
          });
          await expect(page.locator(".fab")).toBeInViewport();
          await page.locator("#main .movement").last().scrollIntoViewIfNeeded();
          const row = await page
            .locator("#main .movement")
            .last()
            .boundingBox();
          expect(row.y + row.height).toBeLessThanOrEqual(dock.y + 1);
        }
        if (route === "expense") {
          await page
            .locator("#expense-title")
            .fill("Nombre largo de ejemplo ".repeat(4));
          await page.locator("#expense-amount").fill("1000000000000");
          await page.locator("#expense-options summary").click();
          await page.locator("#expense-note").fill("Nota extensa ".repeat(50));
          const save = page.locator("#expense-form button[type=submit]");
          await save.scrollIntoViewIfNeeded();
          await expect(save).toBeInViewport();
          await layout(page, "formulario largo");
        }
        if (width <= 700 && ["balance", "budget", "invite"].includes(route)) {
          const target = page
            .locator(
              route === "budget"
                ? ".budget-table tbody tr:last-child"
                : route === "balance"
                  ? "#main [data-payment]"
                  : "#main button:not(:disabled)",
            )
            .last();
          await target.evaluate((el) =>
            el.scrollIntoView({ block: "center", behavior: "auto" }),
          );
          await settle(page);
          const item = await target.boundingBox(),
            nav = await page.locator(".bottom-nav").boundingBox();
          expect(
            item.y + item.height,
            `scroll accesible ${route}`,
          ).toBeLessThanOrEqual(nav.y + 1);
        }
        if (route === "conflict") await scenario(page, "synced");
      }
      if (width === 390 && theme === "light") {
        for (const state of ["empty", "long"]) {
          await scenario(page, state);
          await screen(page, "home");
          await layout(page, `home ${state}`);
        }
        await scenario(page, "synced");
        for (const route of ["home", "expense", "balance", "budget"]) {
          await screen(page, route);
          await text200(page);
          if (route === "budget") {
            await capture(page, info, "390x844-light-budget-text200");
            await readableBudget(page);
            const heading = await page.locator(".page-heading").boundingBox();
            const action = await page
              .locator(".heading-actions .button")
              .boundingBox();
            expect(action.x).toBeGreaterThanOrEqual(heading.x - 1);
            expect(action.x + action.width).toBeLessThanOrEqual(
              heading.x + heading.width + 1,
            );
          }
          await layout(page, `texto 200% ${route}`);
        }
      }
    });

test("Recorrido principal, presupuesto, abonos, temas y cierre", async ({
  page,
}) => {
  await open(page);
  await screen(page, "welcome");
  await page.locator("[data-route=login]").click();
  await page.locator("#auth-email").fill("test@example.invalid");
  await page.locator("#auth-password").fill("ficticia123");
  await page.locator("#auth-form button[type=submit]").click();
  await expect(page.locator("#screen-select")).toHaveValue("trips");
  await page.locator("#main [data-route=home]").click();
  await page.locator("#main .hero-balance [data-route=balance]").click();
  for (const payment of ["b,a,20000", "b,c,10000"]) {
    await page.locator(`[data-payment="${payment}"]`).click();
    await page.locator("#payment-form button[type=submit]").click();
  }
  await expect(page.locator("[data-payment]")).toHaveCount(0);
  await page.locator("[data-action=more]").click();
  await page.locator("[data-sheet-route=budget]").click();
  await expect(page.locator("[data-budget-available]")).toHaveText("$150.000");
  await expect(page.locator("[data-daily-spent]")).toHaveText("$250.000");
  await screen(page, "home");
  await page.locator(".fab").click();
  await page.locator("#expense-title").fill("Café automatizado");
  await page.locator("#expense-amount").fill("100");
  await page.locator("[data-route=payers]").click();
  await page.locator("[data-payer=b]").check();
  await page.locator("[data-contribution=a]").fill("60");
  await page.locator("[data-contribution=b]").fill("40");
  await page.locator("[data-action=apply-payers]").click();
  await page.locator("[data-route=split]").click();
  await expect(page.locator("[data-quota=a]")).toHaveText("$34");
  await page.locator("[data-split=percentage]").click();
  for (const [id, value] of [
    ["a", "50"],
    ["b", "25"],
    ["c", "25"],
  ])
    await page.locator(`[data-allocation=${id}]`).fill(value);
  await page.locator("[data-action=apply-split]").click();
  await page.locator("#expense-form button[type=submit]").click();
  await expect(page.locator("#main")).toContainText("Café automatizado");
  for (const route of ["stats", "invite", "activity", "summary"]) {
    await page.locator("[data-action=more]").click();
    if (route === "activity") {
      await page.locator("#sheet [data-action=dismiss]").click();
      await page.locator(".bottom-nav [data-route=activity]").click();
    } else await page.locator(`[data-sheet-route=${route}]`).click();
    await expect(page.locator("#screen-select")).toHaveValue(route);
  }
  await page.locator("[data-action=confirm-close]").click();
  await page.locator("[data-action=do-close]").click();
  await expect(page.locator("#main")).toContainText(
    "El viaje queda en la memoria",
  );
});

test("Estados simulados, modal y teclado nativo", async ({ page }, info) => {
  await open(page);
  const states = {
    synced: /Sincronizado/i,
    offline: /Sin conexión/,
    pending: /Pendiente/,
    syncing: /Enviando|Sincronizando/,
    error: /confirmar|Error|error/,
    conflict: /conflicto|Conflicto/,
    expired: /venci|caduc|expir/i,
    revoked: /revoc/i,
  };
  for (const [state, message] of Object.entries(states)) {
    await scenario(page, state);
    await screen(
      page,
      ["expired", "revoked"].includes(state) ? "join" : "activity",
    );
    await expect(page.locator("#main")).toContainText(message);
    if (["offline", "pending", "syncing", "error"].includes(state))
      await expect(page.locator("[data-local-change]")).toHaveCount(2);
    if (state === "offline")
      await capture(page, info, "390x844-light-activity-offline");
    if (["expired", "revoked"].includes(state))
      await expect(
        page.locator("#join-form button[type=submit]"),
      ).toBeDisabled();
  }
  await scenario(page, "synced");
  await screen(page, "expense");
  await page.locator("#expense-title").focus();
  await page.keyboard.press("Tab");
  await expect(page.locator("#expense-amount")).toBeFocused();
  expect(
    await page
      .locator("#expense-amount")
      .evaluate(
        (el) =>
          el.matches(":focus-visible") &&
          parseFloat(getComputedStyle(el).outlineWidth) >= 2,
      ),
  ).toBeTruthy();
  await page.locator("#expense-title").fill("Conservar formulario");
  await page.locator("#expense-amount").fill("-1");
  await page.locator("#expense-form button[type=submit]").click();
  await expect(page.locator("#form-error")).toBeFocused();
  await expect(page.locator("#expense-amount")).toHaveAttribute(
    "aria-invalid",
    "true",
  );
  await page.locator("#expense-amount").fill("100");
  const photo = page.locator("[data-action=photo]");
  await photo.focus();
  await page.keyboard.press("Enter");
  await expect(page.locator("#sheet")).toBeVisible();
  for (let i = 0; i < 8; i++) {
    await page.keyboard.press("Tab");
    expect(
      await page.evaluate(() => !!document.activeElement.closest("#sheet")),
    ).toBeTruthy();
  }
  await page.keyboard.press("Escape");
  await expect(page.locator("#sheet")).not.toBeVisible();
  await expect(photo).toBeFocused();
});

test("Axe en navegador con contraste y nombres accesibles", async ({
  page,
}, info) => {
  test.setTimeout(180000);
  await open(page);
  await page.addScriptTag({ path: path.join(toolsDir, "axe-core/axe.min.js") });
  const routes = await page
    .locator("#screen-select option")
    .evaluateAll((options) => options.map((option) => option.value));
  const audits = [];
  for (const theme of ["light", "dark"]) {
    if ((await page.locator("html").getAttribute("data-theme")) !== theme)
      await page.locator("#theme-toggle").click();
    for (const route of routes) {
      await screen(page, route);
      const result = await page.evaluate(() =>
        axe.run(document, {
          runOnly: {
            type: "tag",
            values: ["wcag2a", "wcag2aa", "wcag21aa", "best-practice"],
          },
        }),
      );
      audits.push({
        theme,
        route,
        violations: result.violations,
        incomplete: result.incomplete,
        passes: result.passes.map((rule) => rule.id),
      });
    }
  }
  fs.mkdirSync(run.runDir, { recursive: true });
  fs.writeFileSync(
    path.join(run.runDir, `axe-${info.project.name}.json`),
    JSON.stringify(audits, null, 2) + "\n",
  );
  expect(
    audits.flatMap((row) =>
      row.violations.map((rule) => ({
        theme: row.theme,
        route: row.route,
        id: rule.id,
        nodes: rule.nodes.map((node) => node.target),
      })),
    ),
  ).toEqual([]);
});
