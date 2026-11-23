import { horizontalOverflow } from './diagnostics';
import { expect, test } from '@playwright/test';
import type { APIRequestContext, Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { randomUUID } from 'node:crypto';
import QRCode from 'qrcode';

const password = 'Synthetic-test-984!';
const authOrigin = 'http://127.0.0.1:9199';

async function register(page: Page, request: APIRequestContext) {
  const email = `owner-${randomUUID()}@example.invalid`;
  await page.goto('/registro'); await page.getByLabel('Tu nombre',{ exact: true }).fill('Organizadora sintética');
  await page.getByLabel('Correo electrónico').fill(email); await page.getByLabel('Contraseña',{ exact: true }).fill(password);
  await page.getByRole('button',{ name: 'Crear cuenta', exact: true }).click();
  await expect(page.getByRole('heading',{ name: 'Verificar correo', exact: true })).toBeVisible();
  await page.goto('/viajes/nuevo'); await expect(page.getByText(/Se requiere la cuenta verificada/)).toBeVisible();
  const response = await request.get(`${authOrigin}/emulator/v1/projects/demo-gastos-compartidos/oobCodes`);
  const data = await response.json() as { oobCodes: { email: string; oobCode: string; requestType: string }[] };
  const code = data.oobCodes.find(value => value.email === email && value.requestType === 'VERIFY_EMAIL');
  expect(code).toBeTruthy();
  const verified = await request.post(`${authOrigin}/identitytoolkit.googleapis.com/v1/accounts:update?key=demo-not-a-real-api-key`,{ data: { oobCode: code!.oobCode } });
  expect(verified.ok()).toBe(true);
  await page.goto('/verificar'); await page.getByRole('button',{ name: 'Actualizar verificación' }).click();
  await expect(page.getByText('Tu correo está verificado.',{ exact: true })).toBeVisible();
  return email;
}
async function create(page: Page, long = false) {
  const title = long ? `Viaje ${randomUUID().slice(0,8)} ${'recorrido largo '.repeat(5)}`.slice(0,100) : `Viaje ${randomUUID().slice(0,8)}`;
  await page.goto('/viajes/nuevo'); await page.getByLabel('Nombre del viaje').fill(title);
  await page.getByLabel('Destino (opcional)',{ exact: true }).fill('Destino de prueba');
  await page.getByLabel('Fecha inicial',{ exact: true }).fill('2026-11-21'); await page.getByLabel('Fecha final',{ exact: true }).fill('2026-11-24');
  await page.getByLabel('Presupuesto total (opcional)',{ exact: true }).fill(long ? '1000000000000' : '400000');
  await page.getByRole('button',{ name: 'Crear viaje', exact: true }).click(); await expect(page.getByRole('heading',{ name: title, exact: true })).toBeVisible();
  await expect(page.getByRole('button',{ name: 'Finalizar viaje', exact: true })).toBeDisabled();
  await expect(page.getByText(long ? 'COP $1.000.000.000.000' : 'COP $400.000',{ exact: true })).toBeVisible();
  return { title, path: new URL(page.url()).pathname };
}
async function logout(page: Page) {
  await page.getByRole('button',{ name: 'Más opciones', exact: true }).click();
  await page.getByRole('dialog').getByRole('button',{ name: 'Cerrar sesión', exact: true }).click();
  await page.getByRole('button',{ name: 'Confirmar cierre de sesión', exact: true }).click();
  await expect(page.getByRole('dialog')).not.toBeVisible();
}

test('real emulator auth, verified organizer, atomic creation, local QR, anonymous persistence and revocation', async ({ page, request, browser }, info) => {
  const external: string[] = [], allowed = new Set(['http://127.0.0.1:4184','http://127.0.0.1:9199','http://127.0.0.1:8180','ws://127.0.0.1:4184']);
  page.on('request', req => { const url = new URL(req.url()); if (!['data:','blob:'].includes(url.protocol) && !allowed.has(url.origin)) external.push(url.origin); });
  await register(page,request); const trip = await create(page);
  await page.getByRole('link',{ name: 'Gestionar invitaciones', exact: true }).click();
  await page.getByRole('button',{ name: 'Generar invitación', exact: true }).click();
  const image = page.getByRole('img',{ name: 'QR local de la invitación' }); await expect(image).toBeVisible();
  const qr = await image.getAttribute('src'); expect(qr?.startsWith('data:image/png;base64,')).toBe(true);
  const link = await page.getByLabel('Enlace de invitación',{ exact: true }).inputValue();
  const guestContext = await browser.newContext({ baseURL: 'http://127.0.0.1:4184', viewport: { width: 390, height: 844 }, serviceWorkers: 'block' });
  const guest = await guestContext.newPage(); await guest.goto('/join');
  await guest.getByLabel('Leer QR desde una imagen',{ exact: true }).setInputFiles({ name: 'invitation.png', mimeType: 'image/png', buffer: Buffer.from(qr!.split(',')[1]!, 'base64') });
  await expect(guest.getByLabel('Código completo o enlace',{ exact: true })).toHaveValue(link);
  await guest.getByRole('button',{ name: 'Validar invitación', exact: true }).click(); await expect(guest.getByLabel('Tu nombre en el viaje',{ exact: true })).toBeVisible();
  await guest.getByLabel('Tu nombre en el viaje',{ exact: true }).fill('Invitada sintética');
  await guest.getByRole('button',{ name: 'Unirme al viaje', exact: true }).click();
  await expect(guest.getByRole('heading',{ name: trip.title, exact: true })).toBeVisible();
  await expect(guest.getByText('2/10, incluido el organizador',{ exact: true })).toBeVisible();
  await guest.reload(); await expect(guest.getByRole('heading',{ name: trip.title, exact: true })).toBeVisible();
  const reopened = await guestContext.newPage(); await guest.close(); await reopened.goto(trip.path);
  await expect(reopened.getByRole('heading',{ name: trip.title, exact: true })).toBeVisible();
  const mirror = await guestContext.newPage(); await mirror.goto(trip.path);
  await expect(mirror.getByRole('heading',{ name: trip.title, exact: true })).toBeVisible();
  await expect(reopened.getByRole('link',{ name: 'Gestionar invitaciones', exact: true })).toHaveCount(0);
  await page.goto(`${trip.path}/personas`); await page.getByRole('button',{ name: 'Revocar acceso de Invitada sintética', exact: true }).click();
  await page.getByRole('button',{ name: 'Confirmar revocación', exact: true }).click();
  await expect(reopened.getByRole('heading',{ name: 'Acceso no disponible', exact: true })).toBeVisible();
  await expect(mirror.getByRole('heading',{ name: 'Acceso no disponible', exact: true })).toBeVisible();
  await expect(reopened.getByRole('heading',{ name: trip.title, exact: true })).toHaveCount(0);
  await expect(page.getByText('Invitada sintética',{ exact: true })).toBeVisible(); await expect(page.getByText(/Participante · Acceso retirado/)).toBeVisible();
  await reopened.goto(link); await expect(reopened.getByRole('heading',{ name: 'Unirse a un viaje', exact: true })).toBeVisible();
  expect(new URL(reopened.url()).hash).toBe('');
  await reopened.getByRole('button',{ name: 'Validar invitación', exact: true }).click();
  await reopened.getByLabel('Tu nombre en el viaje',{ exact: true }).fill('Otro nombre'); await reopened.getByRole('button',{ name: 'Unirme al viaje', exact: true }).click();
  await expect(reopened.getByText(/El mismo UID no puede reincorporarse/)).toBeVisible();
  await page.getByRole('combobox',{ name: 'Tema', exact: true }).selectOption('dark');
  const axe = await new AxeBuilder({ page }).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze(); expect(axe.violations).toEqual([]);
  await page.screenshot({ path: info.outputPath('participants-dark.png'), fullPage: true });
  expect(external).toEqual([]); await guestContext.close();
});

test('password reset and login use Firebase; logout isolates private views across identities', async ({ page, request }) => {
  const email = await register(page,request), trip = await create(page);
  const peer = await page.context().newPage(); await peer.goto(trip.path);
  await expect(peer.getByRole('heading',{ name: trip.title, exact: true })).toBeVisible();
  await logout(page);
  await expect(peer.getByRole('heading',{ name: 'Iniciar sesión', exact: true })).toBeVisible();
  await expect(peer.getByText(trip.title,{ exact: true })).toHaveCount(0);
  await page.goto('/recuperar'); await page.getByLabel('Correo electrónico').fill(email);
  await page.getByRole('button',{ name: 'Recuperar acceso', exact: true }).click(); await expect(page.getByText(/Si la cuenta existe/)).toBeVisible();
  const records = await (await request.get(`${authOrigin}/emulator/v1/projects/demo-gastos-compartidos/oobCodes`)).json() as { oobCodes: { email: string; oobCode: string; requestType: string }[] };
  const reset = records.oobCodes.find(code => code.email === email && code.requestType === 'PASSWORD_RESET'); expect(reset).toBeTruthy();
  const newPassword = 'Synthetic-new-785!';
  expect((await request.post(`${authOrigin}/identitytoolkit.googleapis.com/v1/accounts:resetPassword?key=demo-not-a-real-api-key`,{ data: { oobCode: reset!.oobCode, newPassword } })).ok()).toBe(true);
  await page.goto('/login'); await page.getByLabel('Correo electrónico').fill(email); await page.getByLabel('Contraseña',{ exact: true }).fill(newPassword);
  await page.getByRole('button',{ name: 'Iniciar sesión', exact: true }).click(); await expect(page.getByRole('heading',{ name: 'Mis viajes', exact: true })).toBeVisible();
  await expect(page.getByText(trip.title,{ exact: true })).toBeVisible(); await logout(page);
  await register(page,request); await page.goto(trip.path);
  await expect(page.getByRole('heading',{ name: 'Acceso no disponible', exact: true })).toBeVisible();
  await expect(page.getByText(trip.title,{ exact: true })).toHaveCount(0);
  await peer.goto(trip.path); await expect(peer.getByRole('heading',{ name: 'Acceso no disponible', exact: true })).toBeVisible();
});

for (const [width,height] of [[320,568],[375,667],[390,844],[430,932],[768,1024],[1440,900]] as const) {
  test(`access screens reflow at ${width}x${height} in both themes with local emulator data`, async ({ page, request },info) => {
    await page.setViewportSize({ width,height }); await register(page,request); const trip = await create(page,true);
    for (const theme of ['light','dark']) {
      await page.getByRole('combobox',{ name: 'Tema', exact: true }).selectOption(theme);
      for (const path of [trip.path,`${trip.path}/editar`,`${trip.path}/personas`,`${trip.path}/invitaciones`]) {
        await page.goto(path); await expect(page.locator('main h1')).toBeVisible();
        if (path.endsWith('/personas')) await expect(page.getByText('Organizadora sintética',{ exact: true })).toBeVisible();
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
      }
      const axe = await new AxeBuilder({ page }).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze(); expect(axe.violations).toEqual([]);
      await page.screenshot({ path: info.outputPath(`invitations-${theme}.png`), fullPage: true });
    }
    await page.goto(`${trip.path}/editar`); const edited = `${trip.title.slice(0,80)} editado`;
    await page.getByLabel('Nombre del viaje').fill(edited); await page.getByRole('button',{ name: 'Guardar cambios', exact: true }).click();
    await expect(page.getByRole('heading',{ name: edited, exact: true })).toBeVisible();
    await page.evaluate(() => {
      const sizes = [...document.querySelectorAll<HTMLElement>('body *')].map(element => ({ element, size: parseFloat(getComputedStyle(element).fontSize) * 2 }));
      for (const { element, size } of sizes) element.style.fontSize = `${size}px`;
    });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
    if (width < 700) {
      const last = page.getByRole('button',{ name: 'Finalizar viaje', exact: true }); await last.scrollIntoViewIfNeeded();
      await page.evaluate(() => window.scrollTo(0,document.documentElement.scrollHeight));
      const button = await last.boundingBox(), nav = await page.getByRole('navigation',{ name: 'Navegación principal móvil', exact: true }).boundingBox();
      expect(button!.y + button!.height).toBeLessThanOrEqual(nav!.y);
    }
  });
}

test('invalid code, file errors and offline administration have visible feedback without queued creation', async ({ page, request, context }) => {
  await page.goto('/join'); await page.getByLabel('Código completo o enlace',{ exact: true }).fill('123456');
  await page.getByRole('button',{ name: 'Validar invitación', exact: true }).click(); await expect(page.getByRole('alert')).toContainText('código');
  await page.getByLabel('Leer QR desde una imagen',{ exact: true }).setInputFiles({ name: 'fake.svg', mimeType: 'image/svg+xml', buffer: Buffer.from('<svg/>') });
  await expect(page.getByRole('alert').filter({ hasText: 'PNG, JPEG o WebP' })).toBeVisible();
  await register(page,request); await page.goto('/viajes/nuevo');
  await page.getByLabel('Nombre del viaje').fill('No debe guardarse sin conexión');
  await page.getByLabel('Fecha inicial',{ exact: true }).fill('2026-11-21'); await page.getByLabel('Fecha final',{ exact: true }).fill('2026-11-24');
  await context.setOffline(true); await page.getByRole('button',{ name: 'Crear viaje', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('requiere conexión');
  await context.setOffline(false); await page.goto('/viajes'); await expect(page.getByText('Todavía no hay viajes',{ exact: true })).toBeVisible();
});

test('QR image decoding handles the detector regression at several pixel scales', async ({ page }) => {
  const link = 'http://127.0.0.1:4184/join#14188d90-c951-4bc9-b503-67b363332184.WFWGJQA25EDULER5GXD5FKSFDTUOB7NJ';
  await page.goto('/join');
  for (const width of [256,512,768]) {
    const png = await QRCode.toBuffer(link,{ width,margin: 4,errorCorrectionLevel: 'M' });
    await page.getByLabel('Código completo o enlace',{ exact: true }).fill('');
    await page.getByLabel('Leer QR desde una imagen',{ exact: true }).setInputFiles({ name: 'synthetic-regression.png',mimeType: 'image/png',buffer: png });
    await expect(page.getByLabel('Código completo o enlace',{ exact: true })).toHaveValue(link);
  }
});

test.afterEach(async ({ page },info) => { if (info.status !== info.expectedStatus) console.log('Horizontal layout flags',JSON.stringify(await horizontalOverflow(page).catch(() => null))); });
