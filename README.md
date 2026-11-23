# Gastos compartidos

PWA privada para gastos de viajes entre 2 y 10 personas.

**Estado: Fase 4 publicada y Fase 5 implementada para Firebase Emulator Suite.**
Registro, verificación/recuperación, sesión anónima, viajes e invitaciones usan datos
locales reales en modo emuladores. Gastos, abonos, revisiones, balances, presupuestos
y estadísticas se derivan del registro financiero v2. Sin configuración permanece la demostración.
No se habilita producción. La Fase 1 conserva su aceptación provisional y sus
[pruebas multiplataforma pendientes](docs/phase1/AUTOMATED_TEST_REPORT.md).

Git: `main`, Fase 4 publicada como `545fb36bc41d9781d23b8f55946133c718232f2a` en
[GitHub](https://github.com/camilo477/webapp-gastos-conjuntos).
Validación, limitaciones y estado de publicación de Fase 4 en
[el informe anterior](docs/phase4/REPORT.md). Implementación, pruebas y publicación
de Fase 5 en [su informe](docs/phase5/REPORT.md).

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
falta `.env`. La demostración contiene ejemplos explícitos de solo lectura.
Para registrar viajes y movimientos persistidos localmente, activar
el modo de emuladores descrito abajo. Usar únicamente datos sintéticos.

## Comandos

| Comando | Uso |
| --- | --- |
| `npm run dev` | React con recarga de desarrollo; sin service worker |
| `npm run typecheck` | TypeScript estricto, aplicación y pruebas |
| `npm run typecheck:domain` | Dominio sin lib DOM ni tipos React/Firebase |
| `npm run lint` | ESLint sobre código, pruebas y configuración |
| `npm test` | Vitest + Testing Library, sin servicios reales |
| `npm run test:domain` | Motor y contratos en Node, sin setup de React/DOM |
| `npm run build` | Typecheck + build PWA en `dist/` |
| `npm run preview` | Build local en `http://127.0.0.1:4173` |
| `npm run check` | Lint + Vitest + typecheck/build |
| `npm run emulators` | Auth y Firestore locales, proyecto `demo-` |
| `npm run test:rules` | Emuladores temporales y pruebas adversariales de acceso |
| `npm run test:e2e` | Dos builds reales y Playwright HTTP, incluidos SW/offline/actualización |
| `npm run test:access` | Emuladores temporales + UI real en Chromium, Firefox y WebKit |
| `npm run test:access:firefox` | La misma integración, solo Firefox |
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

Para probar las Fases 4 y 5 **solo en desarrollo**:

1. Copiar `.env.example` a `.env.local` y cambiar `VITE_FIREBASE_MODE=emulators`.
2. Mantener `demo-gastos-compartidos`, valores sintéticos, host `127.0.0.1`,
   Auth 9199 y Firestore 8180. No hace falta `firebase login`.
3. Ejecutar `npm run emulators` y `npm run dev` en terminales separadas.
4. Abrir `/registro`, crear cuenta sintética y usar el enlace de verificación
   impreso por **Auth Emulator** en su terminal. Volver a `/verificar` y pulsar
   «Actualizar verificación». No se envía correo real. Recuperación funciona
   de la misma forma mediante `/recuperar` y el enlace local impreso.
5. Crear el viaje desde `/viajes/nuevo`. En detalles se puede editar título,
   destino o icono, consultar personas y generar/revocar invitaciones.
6. Abrir el enlace/QR en otro perfil de navegador: validar, escribir nombre y
   confirmar ingreso. El código manual contiene UUID del viaje y token completo.
   El QR se genera/lee localmente; también se acepta una imagen PNG/JPEG/WebP.
7. Desde el viaje, pulsar «Agregar gasto», indicar concepto e importe y guardar.
   Pagas tú; se divide entre activos. «Pagadores y división» permite exclusiones,
   varios aportes, porcentajes exactos e importes fijos. Categoría/fecha/hora/nota
   están en las opciones. Las fechas se interpretan en la zona del viaje.
8. Consultar Balance para registrar/corregir/eliminar/restaurar abonos declarados;
   abrir un gasto para editarlo, eliminarlo o restaurarlo mediante otra revisión.
   Actividad conserva todas las propuestas. Presupuesto admite revisiones por
   organizador y un cambio de cupo manual por revisión, preservando los demás.
9. Abrir el mismo viaje en dos perfiles: los eventos confirmados se actualizan
   sin recarga. Si hay ramas incompatibles o datos incompletos, los balances
   son provisionales y se excluyen las entidades afectadas del subtotal.

Auth conserva sesión en IndexedDB, con fallback localStorage; si ambos fallan,
no se ofrece una sesión anónima supuestamente durable. Firestore usa memoria,
sin persistencia privada en disco ni respuestas Firebase en la caché del SW.
Las pantallas requieren confirmación del servidor. Administración y join requieren
conexión; no existe cola financiera ni envío administrativo diferido offline.
Cada intento financiero usa commit REST autenticado create-only, timeout e ID
preasignado. Un reintento comprueba ese ID y contenido en servidor. Ante resultado
incierto se mantiene la propuesta solo en la pantalla y se ofrece el mismo intento;
no se afirma guardado durable. Salir/recargar puede perderla: comprobar historial
antes de registrar otra operación. Las escrituras locales pendientes nunca
representan confirmación. No existe outbox de Fase 6.
Salir de una sesión anónima, borrar almacenamiento, cambiar perfil, dispositivo
u origen puede perder esa identidad. El nombre no permite recuperarla.

Los emuladores se reinician sin datos salvo que el usuario configure una
exportación local. No versionar exportaciones, códigos OOB, tokens ni estados
Auth de pruebas. La persistencia del navegador no conserva el servidor borrado.
Solo se aceptan proyectos `demo-`, loopback y puertos válidos distintos.
Una configuración inválida muestra el motivo y conserva la demostración.
Las reglas autorizan únicamente las operaciones de esta fase, con denegación
por defecto. Permiten eventos financieros v2 inmutables y presupuestos solo por
propietario. Las reglas verifican conservación y padres; algoritmo de restos
mayores, coherencia IANA y semántica global se validan en el proyector. Véanse
las [fronteras precisas de seguridad](docs/phase5/REPORT.md).

La interfaz de acceso se prueba sobre Vite de desarrollo, con SW bloqueado.
Los tests PWA sirven dos builds de demostración. Esto distingue Auth/Firestore
locales del comportamiento instalable del shell; todavía no se distribuye un
build conectado a Firebase. La configuración loopback no permite usar otro
móvil en la LAN: esa prueba física requiere revisar origen/HTTPS/configuración,
sin cambiar silenciosamente el cerrojo contra producción.

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
src/features/access/        sesión, formularios, viajes, participantes y QR locales
src/features/demo/          pantallas y fixtures visuales de solo lectura
src/features/financial/     formularios y proyecciones financieras online
src/repositories/financial/ eventos v2, listeners y commits idempotentes online
src/features/status/        actividad y estado de configuración
src/repositories/access/    Auth, contratos persistidos, viajes y admisión REST atómica
src/repositories/firebase/  validación de entorno y SDK modular diferido
src/domain/                 modelos Zod, DTO versionados y motor financiero puro
public/icons/               iconos instalables y licencia
scripts/                    regeneración de iconos y builds E2E
tests/                      setup de componentes, E2E HTTP y reglas
.github/workflows/ci.yml     comprobaciones reproducibles
```

El dominio implementa dinero BigInt, reparto igual/porcentaje/fixed, saldos,
abonos, sugerencias, presupuestos, estadísticas y validación de snapshots/eventos.
Los módulos `sync/` y `attachments/` se crearán en sus fases. El dominio recibe
revisiones efectivas con estado explícito; no implementa el proyector distribuido.

```ts
import { splitExpense, formatMoney } from './src/domain';

const shares = splitExpense(100n, { mode: 'equal', personIds: ['C', 'A', 'B'] });
// A: 34n, B: 33n, C: 33n. Entrada reordenada: mismo resultado.
formatMoney(shares[0]!.amount, 'COP'); // 'COP $34'
```

Los DTO usan enteros Number acotados; cálculos/agregados y salidas monetarias
usan BigInt. `prepareFinancialState` valida y selecciona snapshots;
`projectFinancialEvents` detecta localmente padres ausentes, snapshots inválidos
y cabezas incompatibles. Todos los cálculos consumen el mismo estado y propagan
`provisional`. El reloj y la zona
son explícitos. El contrato financiero v2 admite `fixed`; v1 se migra mediante
una función explícita. El dominio no genera IDs ni escribe documentos. Fase 4 genera IDs en el
repositorio y persiste únicamente la raíz de presupuesto v2 al crear un viaje.

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
- [Plan de Fase 3](docs/phase3/PLAN.md), [informe](docs/phase3/REPORT.md)
  y [resumen de pruebas](docs/phase3/test-results-summary.json).

- [Plan de Fase 4](docs/phase4/PLAN.md), [informe](docs/phase4/REPORT.md)
  y [resumen de pruebas](docs/phase4/test-results-summary.json).

Hay gastos y abonos persistidos exclusivamente en emuladores y actualizaciones
entre usuarios conectados. No hay cuentas de producción, fotos, outbox durable,
sincronización distribuida completa ni despliegue público. **Finalizar y reasignar identidad histórica
permanecen deshabilitados** hasta verificar sus garantías. Revocar conserva
personas e historial, bloquea el servidor y evita reingreso del mismo UID;
no puede borrar copias previamente descargadas ni identificar humanos únicos.
Fase 6 requiere nueva autorización; no se inicia automáticamente.

- [Plan de Fase 5](docs/phase5/PLAN.md), [informe](docs/phase5/REPORT.md) y
  [resumen de pruebas](docs/phase5/test-results-summary.json).

Carga reproducible del motor: `node scripts/measure-financial.mjs` (Node 24);
resultados regenerables en `.cache/phase5/performance.json`. El registro se descarga
completo; actividad muestra 50 entradas por bloque. No se prometen latencias ni
cuotas de producción a partir de estas pruebas locales.
