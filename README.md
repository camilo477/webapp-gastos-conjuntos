# Gastos compartidos

PWA privada para gastos de viajes entre 2 y 10 personas.

**Estado: base técnica de Fase 2 implementada; demostración sin cuentas ni datos
reales.** La Fase 1 fue aceptada provisionalmente por el usuario el 2026-11-22.
Sus pruebas multiplataforma pendientes se conservan en el
[informe original](docs/phase1/AUTOMATED_TEST_REPORT.md). No se inició la Fase 3.

Git está inicializado en `main`. El commit inicial `07ce6ef` está publicado en
[GitHub](https://github.com/camilo477/webapp-gastos-conjuntos).
El estado exacto de validación y publicación de Fase 2 se registra en
[el informe técnico](docs/phase2/REPORT.md).

## Requisitos e instalación

- Node **24.12 o superior de la línea 24 LTS** y npm 11. `.nvmrc` selecciona 24.
- Java 21 o superior para Firestore Emulator; Java 25 disponible en esta sesión.
- Python 3 solo para regenerar iconos; los PNG necesarios están versionados.
- Navegadores y bibliotecas de Playwright para E2E. No se requiere Firebase real.

```bash
nvm install
nvm use
npm ci
npm run dev
```

Abrir la URL que imprime Vite (habitualmente `http://127.0.0.1:5173`). No hace
falta `.env`. Las pantallas contienen ejemplos explícitos; crear viajes, guardar
gastos, abonos e invitar están deshabilitados. No introducir datos personales.

## Comandos

| Comando | Uso |
| --- | --- |
| `npm run dev` | React con recarga de desarrollo; sin service worker |
| `npm run typecheck` | TypeScript estricto, aplicación y pruebas |
| `npm run lint` | ESLint sobre código y configuración de Fase 2 |
| `npm test` | Vitest + Testing Library, sin servicios reales |
| `npm run build` | Typecheck + build PWA en `dist/` |
| `npm run preview` | Build local en `http://127.0.0.1:4173` |
| `npm run check` | Lint + Vitest + typecheck/build |
| `npm run emulators` | Auth y Firestore locales, proyecto `demo-` |
| `npm run test:rules` | Emuladores temporales y pruebas deny-all |
| `npm run test:e2e` | Dos builds reales y Playwright HTTP, incluidos SW/offline/actualización |
| `npm run icons` | Regenerar iconos PNG con Python estándar |

Preparar navegadores con `npx playwright install chromium firefox webkit`.
En Ubuntu, si faltan bibliotecas, seguir las instrucciones de Playwright;
`npx playwright install --with-deps chromium firefox webkit` instala también
paquetes del sistema y puede requerir administración desde la terminal del usuario.
La configuración mantiene el sandbox de Chromium habilitado.

Para seleccionar solo Firefox:

```bash
npm run test:e2e -- --project=firefox
```

`test-results/`, `playwright-report/` y `dist-e2e/` son regenerables e ignorados.
La CI ejecuta comprobaciones, reglas y los tres motores. Su resultado remoto
solo queda confirmado después de publicar y comprobar la ejecución en GitHub.

## Firebase y emuladores

La ausencia de configuración habilita la demostración. No se conecta a servicios
Firebase. El build de producción tampoco habilita Firebase en esta fase.

Para preparar el SDK **solo en desarrollo**:

1. Copiar `.env.example` a `.env.local` y cambiar
   `VITE_FIREBASE_MODE=emulators`.
2. Mantener `demo-gastos-compartidos`, los valores sintéticos del ejemplo,
   host `127.0.0.1`, Auth 9199 y Firestore 8180.
3. Ejecutar `npm run emulators` y `npm run dev` en terminales separadas.
4. Abrir Actividad. El SDK se inicializa de forma diferida, una sola vez, sin
   crear usuarios ni leer/escribir datos. El mensaje distingue inicialización de
   disponibilidad del emulador; las pruebas de reglas comprueban acceso real.

Solo se aceptan proyectos `demo-`, loopback y puertos válidos distintos. Una
configuración inválida produce un mensaje visible y conserva la demostración.
Auth y Firestore usan memoria; la persistencia de datos financieros está pendiente.
Las reglas deniegan toda lectura/escritura, incluso de clientes autenticados.
El modo demo de Firebase evita acceder por accidente a recursos reales ausentes
cuando se usan emuladores: [documentación oficial](https://firebase.google.com/docs/emulator-suite/connect_firestore).

En una fase posterior habrá que proporcionar `projectId`, `apiKey`, `appId` y
`authDomain` de la configuración web del proyecto de pruebas, elegir región y
proveedores Auth, autorizar dominios y validar reglas. Las variables `VITE_` son
públicas en el bundle: nunca colocar claves privadas, cuentas de servicio ni
contraseñas. Esta fase no habilita un modo de producción ni despliega servicios.

## PWA

El build incluye manifest, iconos 192/512, maskable y apple-touch-icon, precache
Workbox del shell y fallback de navegación. Probar con `build` + `preview`:
abrir una vez con conexión, esperar «Interfaz disponible sin conexión» y luego
recargar una ruta sin red. La caché contiene recursos estáticos locales, sin
respuestas Auth/Firestore ni información privada.

Las actualizaciones se ofrecen con «Actualizar ahora» o «Más tarde»; no se
recarga automáticamente una versión en uso. Se comprueban al volver a primer
plano/conexión y cada hora mientras la aplicación está abierta. El test de
actualización sirve dos builds reales y verifica el nuevo build también offline.

HTTPS es necesario fuera de localhost. Android puede ofrecer instalación;
en iOS se usa Safari → Compartir → Añadir a pantalla de inicio. Instalación,
safe areas y suspensión en dispositivos físicos siguen pendientes; disponer de
manifest y SW no demuestra esas pruebas. **Offline del shell no es sincronización
ni persistencia de gastos.**

## Estructura y diseño

```text
src/app/                    routing, tema, conectividad y ciclo de la PWA
src/components/             botones, campos, diálogos, mensajes, filas, contenedores
src/features/demo/          pantallas y fixtures visuales de solo lectura
src/features/status/        actividad y estado de configuración
src/repositories/firebase/  validación de entorno y SDK modular diferido
public/icons/               iconos instalables y licencia
scripts/                    regeneración de iconos y builds E2E
tests/                      setup de componentes, E2E HTTP y reglas
.github/workflows/ci.yml     comprobaciones reproducibles
```

Los módulos `domain/`, `sync/` y `attachments/` se crearán al implementar sus
responsabilidades; no hay carpetas ni contratos vacíos. El registro financiero
inmutable propuesto en los documentos continúa siendo el contrato futuro.

Se conservan paleta, fuente de sistema, tokens, separadores, navegación de tres
destinos, temas e iconos locales Lucide de Fase 1. El
[prototipo original](design/prototype/index.html) permanece intacto y separado de
la aplicación. Las pantallas React no trasladan su motor simulado.

## Documentación y límites

- [Plan original, copia sin cambios](docs/PLAN_MVP_GASTOS_COMPARTIDOS.md).
- [Requisitos](docs/PRD.md), [arquitectura](docs/ARCHITECTURE.md),
  [contratos](docs/DATA_MODEL.md) y [reglas financieras](docs/CALCULATION_RULES.md).
- [Offline y conflictos](docs/OFFLINE_SYNC.md), [seguridad](docs/SECURITY_RULES.md),
  [UX](docs/UI_GUIDELINES.md), [pruebas](docs/TEST_PLAN.md),
  [decisiones](docs/DECISIONS.md) y [límites de servicios](docs/SERVICE_LIMITS.md).
- [Fase 1](docs/phase1/README.md), [sistema de diseño](docs/phase1/DESIGN_SYSTEM.md)
  y [cómo abrir el prototipo](design/README.md).
- [Plan de Fase 2](docs/phase2/PLAN.md), [resultados](docs/phase2/REPORT.md)
  y [publicación Git](docs/GIT_SETUP.md).

No hay cuentas reales, motor financiero, gastos persistentes, invitaciones,
QR reales, estadísticas reales, fotos ni sincronización entre dispositivos.
Las decisiones de producto todavía propuestas no se ratifican por instalar la
base. No hay despliegue público. La Fase 3 requiere una nueva autorización.
