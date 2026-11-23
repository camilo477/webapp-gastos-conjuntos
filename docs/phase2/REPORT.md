# Fase 2 · Informe técnico

Fecha: 2026-11-22 (America/Bogota; ejecuciones también identificadas en UTC).
Fase 1 aceptada provisionalmente por autorización explícita del usuario. Base
implementada; Fase 3 no iniciada. No hay despliegue público.

## Implementación

- React 19.3.1, React DOM 19.3.1, TypeScript 5.9.3 estricto, Vite 8.3.8,
  React Router DOM 7.18.6 y CSS propio. Dependencias exactas en `package-lock.json`.
- Pantallas de Inicio, Balance, Actividad, Mis viajes, formulario visual,
  Presupuesto, Personas y ruta desconocida. Fixtures de presentación separados;
  no son modelos persistidos ni se ejecuta el motor del prototipo.
- Botones, campos con ayuda/error, iconos, encabezados, filas, avisos, vacío,
  contenedor, navegación, estado de conectividad, diálogo nativo y error boundary.
  Tema Sistema/Claro/Oscuro con preferencia local tolerante a storage bloqueado.
- Tokens y estilos base derivados del CSS de Fase 1; mismos SVG Lucide locales.
  Navegación inferior de tres destinos, lateral en escritorio, menú secundario,
  CTA de gasto deshabilitado y reserva medida para navegación/banda fija.
- Directorios con responsabilidades reales en `src/app`, `components`,
  `features/demo`, `features/status` y `repositories/firebase`. Dominio, cola e
  imágenes se incorporarán cuando corresponda, sin contratos ni carpetas vacías.

El prototipo, iconos y resultados anteriores de `design/` permanecen intactos.
Solo se actualiza el estado documental de Fase 1 y se añade la autorización al
informe histórico, sin reescribir sus resultados.

## Firebase

Firebase SDK modular 12.19.0, preparado para Auth y Firestore con inicialización
centralizada y diferida. Sin configuración, la aplicación es una demostración.
La configuración inválida se explica y no impide usarla. Solo se permite SDK
con proyecto `demo-`, loopback y puertos explícitos durante `npm run dev`.
El build productivo no habilita Firebase, aunque existan variables locales.

No se crean cuentas desde la interfaz ni se realizan lecturas/escrituras de
producto. Auth y Firestore usan memoria. Reglas Firestore deny-all, incluso para
clientes autenticados; los permisos de producto siguen pendientes de Fase 4.
Los contextos y el seed de las pruebas son exclusivamente sintéticos/locales.

Puertos elegidos para evitar servicios existentes: Auth 9199, Firestore 8180,
hub 4410, logging 4510 y websocket 9151. No se detuvieron emuladores ajenos.
`.env.example` explica los valores sintéticos; el README enumera la configuración
web que se necesitará en una fase posterior. No hay proyecto real, facturación,
Storage, Functions, invitaciones ni despliegue.

## PWA

`vite-plugin-pwa` 2.0.0/Workbox genera manifest, iconos 192/512, maskable,
apple-touch-icon y service worker con 17 recursos de shell en precache
(aproximadamente 765 KiB sin comprimir). Fallback SPA y ninguna runtime cache:
no se almacenan respuestas privadas de Firebase.

Se distingue interfaz offline de sincronización financiera. Las actualizaciones
se ofrecen; el usuario confirma o pospone. Tras confirmar se espera el evento
nativo `controllerchange` antes de recargar. Se comprueban versiones al recuperar
conectividad/visibilidad y cada hora mientras la aplicación está abierta.

Playwright sirve dos builds reales distintos (a/b) y verifica que el segundo
no se active en la página antes de confirmar y que sobreviva a una recarga
posterior sin red. Los iconos se regeneran con Python estándar a partir del
símbolo Lucide existente, conservando licencia y margen maskable.

## Verificación

- `npm run check`: ESLint, Vitest, typecheck y build ejecutados correctamente.
  Última suite unitaria: **34 pruebas, 6 archivos**, sin servicios reales.
- `npm run test:rules`: **15/15 aprobadas** en Auth/Firestore Emulator Suite:
  leer/listar/crear/editar/borrar denegados para cliente sin autenticar y dos
  identidades sintéticas. Es la base deny-all, no las reglas futuras de negocio.
- Playwright Firefox 159.0 HTTP: **19/19 casos aprobados**, sin fallos ni omitidos;
  ejecución final `2026-11-23T00:15:57.894Z`, 45,2 segundos. Resultados en
  [resumen versionado](test-results-summary.json).
  Incluye seis tamaños en ambos temas (7 rutas cada uno), arranque/navegación,
  tema persistido, configuración ausente, acciones deshabilitadas, foco,
  diálogo/Escape/retorno, texto al 200%, nombres/importes largos, axe, manifiesto,
  decodificación de iconos, ausencia de solicitudes externas en demo, recarga y
  reapertura de rutas offline y actualización real a/b.
- Se intentó el smoke en los tres motores: Firefox aprobado; Chromium bloqueado
  por `No usable sandbox!`, WebKit por bibliotecas `libevent-2.1-7t64` y
  `libavif16` ausentes. No se deshabilitó sandbox, no se usó root ni se presentan
  los cuerpos de esos casos como ejecutados/aprobados.
- Instalación reproducible `npm ci` comprobada a partir del lockfile. Las
  dependencias iniciales en el volumen NTFS hacían esperar a los procesos; se
  reinstaló el mismo lockfile en `/tmp`, con enlace local ignorado y la instalación
  original conservada en `.cache/`. Fuentes y pruebas siguieron en el repositorio.
- Los reportes HTML, trazas y capturas nuevos permanecen en `test-results/`,
  `playwright-report/` y copias de intentos en `.cache/phase2-runs/`, ignorados.
  El resumen versionado distingue intentos, correcciones y ejecución final.
- La CI se configura para Node 24 LTS, Java 21 y las tres plataformas Playwright
  en Ubuntu. **CI remota no verificada mientras no se publique esta entrega.**

Las auditorías axe sin infracciones en sus reglas evaluadas no certifican WCAG
completa ni sustituyen lectores, dispositivos reales o contraste manual. El texto
al 200% se amplía mediante tamaños CSS calculados, no zoom nativo del navegador.
Las pruebas del prototipo de Fase 1 no se repitieron porque su código no cambió.

## Defectos encontrados y correcciones

1. Dependencias: SDK 13 no satisface el peer de las pruebas oficiales de reglas;
   se eligió SDK 12.19.0. Los peers amplios `0.x` mezclaban core/compat posteriores
   y la prueba real falló con `firestore is not a function`; se fijaron las dos
   versiones correspondientes al SDK. Las 15 pruebas reales pasan tras corregirlo.
2. Auditoría: gRPC retenido en `~1.9.0` tenía avisos altos. Override 1.14.7,
   compatible con la misma versión mayor; pruebas de reglas verificadas.
   ESLint se actualizó a la línea mantenida 10.15.0.
3. Fast Refresh: una constante exportada junto al componente disparaba lint;
   se dejó privada en su módulo.
4. Texto al 200%: encabezado e indicadores no podían reorganizarse a 320 px.
   Ahora envuelven filas según su contenido, conservando la presentación normal,
   tipografía y paleta. Regresión fallida antes y aprobada después.
5. Actualización PWA rápida: Workbox-window puede clasificar al segundo worker
   como externo; el aviso aparecía, pero no recargaba. Se espera confirmación
   nativa de activación y se controla timeout/error. Tests unitarios y regresión
   a/b real aprobados tras la corrección; no se sustituye por recarga forzada.
6. Ejecutor: el servidor cierra conexiones al recibir la señal de parada. El
   primer filtro `^starts` no seleccionaba títulos completos y se corrigió.
   Un intento coincidió con reinstalación de herramientas y se descartó por
   interferencia; los resultados válidos se repitieron después de terminarla.

## Seguridad y revisión

`npm audit --omit=dev --json`: **0 vulnerabilidades de ejecución** tras las
correcciones. La última auditoría completa mantiene **17 avisos moderados en
herramientas/transitivas** de Firebase CLI y Workbox (glob/minimatch, uuid y
OpenTelemetry); sin avisos altos/críticos. No se aplicaron degradaciones ni
cambios mayores incompatibles para silenciarlos. No es una auditoría exhaustiva
ni autoriza publicar secretos o conectar servicios reales.

Gemini fue omitido: se ejecutó el CLI en modo de revisión `plan`, sin extensiones,
con un resumen técnico, y terminó por falta de `GEMINI_API_KEY`. No revisó código,
no se reintentó ni se cambió autenticación. Se realizó revisión propia de
contratos, ciclo PWA, límites de Firebase, pruebas, documentación y cambios Git.

## Git y publicación

Estado inicial: `main` limpio, seguimiento `origin/main`, remoto correcto y
commit `07ce6efaacfcc0baf33e39dea5252429b711b0cd` confirmado mediante GitHub.
`git add --all` falló con `Unable to create .git/index.lock: Read-only file
system`. El índice permanece vacío: no fue posible preparar/revisar un diff
staged, crear un commit ni hacer push. Se revisaron el diff de trabajo, las
fuentes nuevas y los candidatos publicables. No se eludió el montaje protegido.
**Commit nuevo: no generado. Push: pendiente. CI remota: no ejecutada.**
GitHub se volvió a consultar al cerrar y `main` permanece en el SHA inicial.
Comandos de Ubuntu y comprobación de SHA/seguimiento en
[GIT_SETUP](../GIT_SETUP.md). No se declara publicada la Fase 2.

Se comprobaron 17 rutas de exclusión/retención, todos los tokens CSS (ambos
temas) y el hash del plan original. El control documental final verificó 25
documentos y 32 combinaciones de contraste, sin incidencias, guardando resultados
en `.cache/phase2-document-review/` para conservar los reportes anteriores.
Los patrones de auditoría no detectaron secretos en los **215 candidatos** del
control final. `.gitignore` excluye también el enlace local
de dependencias; se conservan código, lockfile, configuración y resúmenes.

## Pendientes y límites

- Chromium y WebKit, instalación Android/iOS, safe areas físicas, teclado virtual,
  zoom nativo, VoiceOver/TalkBack y suspensión/reanudación física.
- Se conserva la matriz pendiente de Fase 1, incluida repetición HTTP de su
  corrección final y contraste incompleto; las suites React no la sustituyen.
- Sin motor financiero, datos persistentes de gastos, cuentas reales, QR,
  invitaciones, sincronización, resolución distribuida, fotos o estadísticas.
- Las decisiones de producto propuestas en fases anteriores siguen identificadas
  como tales; no se habilita `fixed` ni una política de cierre nueva.
- Autorización nueva necesaria antes de Fase 3. No hay despliegue público.

## Referencias oficiales consultadas

- [Vite: requisitos y arranque](https://vite.dev/guide/).
- [React: aplicación desde cero con Vite](https://react.dev/learn/build-a-react-app-from-scratch).
- [Firebase: SDK modular](https://firebase.google.com/docs/web/setup) y
  [proyectos demo/emulador](https://firebase.google.com/docs/emulator-suite/connect_firestore).
- [Vite PWA: React](https://vite-pwa-org.netlify.app/frameworks/react.html) y
  [actualización por confirmación](https://vite-pwa-org.netlify.app/guide/prompt-for-update.html).
- [Vitest](https://vitest.dev/guide/) y [Playwright](https://playwright.dev/docs/intro).
- Versiones/engines y peers comprobados contra npm antes de instalar y nuevamente
  al resolver las incompatibilidades reales. No se usó `--legacy-peer-deps`.
