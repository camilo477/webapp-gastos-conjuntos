# Fase 4 · Autenticación, viajes, invitaciones y seguridad

## Alcance y procedencia

Autorización explícita del usuario. Inicio en `main` limpio, sin conflictos,
con seguimiento `origin/main`. La Fase 3 se confirmó mediante Git local y API
GitHub en `7524563b13b0efa4c681101e9cea050870663a0d`. Se leyeron AGENTS, README,
PRD, arquitectura, modelos v2, reglas, decisiones, pruebas e informe anterior.
Se preservan el prototipo original, el motor financiero y resultados anteriores.
La aceptación provisional de Fase 1 no aprueba las pruebas físicas pendientes.

Implementación exclusivamente local: `demo-gastos-compartidos`, Auth 9199,
Firestore 8180, Vite de desarrollo en loopback. Sin Firebase productivo,
Admin SDK en frontend, Functions, Storage, facturación ni despliegue.

## Flujos disponibles

- Organizador: registro email/password del SDK, login, logout, envío de
  verificación, refresco del estado verificado y recuperación. El emulador imprime
  los enlaces locales; no entrega correos reales. Crear requiere proveedor password
  y correo verificado, también en reglas.
- Sesión: persistencia Auth IndexedDB con fallback localStorage; error visible si
  no hay persistencia disponible. Invitado Anonymous Auth sin email/contraseña;
  conserva UID mientras permanezcan sus datos y el usuario del servidor local.
- Viajes: lista consultada por UID, selección local por usuario/proyecto, detalles,
  participantes y roles, historial cerrado consultable, crear con 1 organizador y
  hasta 10 accesos activos. Fechas, zona, moneda y presupuesto usan contratos de
  Fase 3; portada opcional de icono. Edición solo de título/destino/icono.
- Invitaciones: generar, mostrar QR/enlace/código completo, copiar, compartir si el
  navegador ofrece Web Share y revocar. Lector local de cámara o PNG/JPEG/WebP
  hasta 10 MB, sin almacenar imagen. Código manual disponible como alternativa.
- Ingreso: validar invitación exacta con Auth, pedir nombre y commit ciego atómico;
  confirmar pertenencia antes de mostrar título/datos privados del viaje.
- Revocación: solo organizador, confirmación explícita, quita binding y marca
  miembro revocado atómicamente. Conserva persona e historial. Mismo UID no puede
  volver por invitación común; otro nombre no modifica esa condición.

Finalizar y reasignar identidad histórica permanecen **deshabilitados** en UI y
reglas. Falta comprobar consistencia financiera/cierre y un procedimiento de
consentimiento/identificación del nuevo titular. No se exige saldo cero ni se
simula detectar dispositivos desconectados. Se puede invitar una identidad nueva,
sin atribuirle deudas de otra por coincidencia de nombre.

## Código y contratos

| Ubicación | Responsabilidad |
| --- | --- |
| `src/features/access/` | Contexto de sesión, Auth, viajes, personas, formularios, QR y feedback |
| `src/repositories/access/auth.ts` | Operaciones oficiales Auth y persistencia |
| `src/repositories/access/contracts.ts` | Frontera Zod de documentos Firebase v1 y metadatos |
| `src/repositories/access/trips.ts` | Creación, consultas, metadatos, revocación y presupuesto inicial |
| `src/repositories/access/invitations.ts` | Gestión y commit REST de admisión |
| `src/repositories/access/inviteCode.ts` | Token criptográfico, código completo y enlace en fragmento |
| `firestore.rules` | Autorización y coherencia de estados previos/posteriores |
| `tests/rules/phase4.test.mjs` | Clientes ordinarios contra reglas reales |
| `tests/emulator-e2e/access.spec.ts` | Integración de interfaz y emuladores en navegador |
| `playwright.emulator.config.ts` | Servidor Vite DEV con configuración demo reproducible |

App conserva el modo demostración sin configuración y carga el entorno de acceso
por separado. Componentes existentes Button/Field/Notice/Dialog/PageHeader/Icon/
Container se reutilizan. Solo se amplían estilos de selects, filas, detalles y
lector/QR, con los tokens, tipografía y temas previos. El motor `src/domain/`
permanece sin cambios. No se agregan outbox ni abstracciones de fases futuras.

Dependencias nuevas exactas: `qrcode@1.5.4`, `@zxing/browser@0.2.1`, su peer explícito `@zxing/library@0.23.0` y tipos
`@types/qrcode@1.5.6`. Generador y lector se importan bajo demanda. Se conservan
lockfile y Node 24 LTS exigido por la base y transitivas.

Metadatos trip/member/person/user/invite usan versión 1 explícita. El único evento
financiero nuevo permitido es **budget create v2**, validado antes de persistir y
al leer su Timestamp como DTO. No se migran ni aceptan eventos v1 al escribir.
Payload inicial: `total: entero 0..10^12 o null`, `lockedDays: []`, status active;
sin padres, before vacío, reloj 0, entidad/operación igual a budgetEntityId, autor
igual al propietario. Recepción usa request.time; authoredAt canónico UTC con
milisegundos es informativo. No hay colección mutable paralela de presupuestos.

## Operaciones atómicas y límites reales

1. Crear: transacción SDK online, lectura del perfil propio para operar online y
   cuatro escrituras de trip, member owner, person y raíz budget. Cada contraparte
   requiere estado posterior mediante getAfter; omitir cualquiera deniega el lote.
2. Join: `documents:commit` REST con Firebase ID token normal. Máscara de campo
   correctamente escapada agrega solo el UID solicitante; transforms agregan UID
   a listas e incrementan versión. Member/person requieren inexistencia. El cliente
   nunca lee trip antes del ingreso; solo invitación exacta y estado propio.
3. REST se elige porque writeBatch SDK puede encolar escrituras offline. El commit
   HTTP no se encola y tiene timeout. Un timeout puede dejar resultado incierto:
   el reintento consulta primero la membresía propia y no crea otra identidad.
   Transacciones restantes requieren conexión; no se implementa una cola casera.
4. Revocar: transacción trip+member, elimina exactamente un UID no propietario,
   conserva todos los demás bindings/participantIds y exige estado revoked posterior.

`memberBindings` es autoridad, con valores únicos y máximo diez. `activeUids`
debe ser exactamente su conjunto de claves sin duplicados. `participantIds`
conserva personas y admite hasta 1.000 históricas, sin borrado para liberar cupos.
Los clientes no conceden roles con nombres ni perfiles. La carrera de dos altas
con nueve activos deja exactamente diez y solo una alta completa.

| Commit | Cota conservadora get/exists/getAfter por write | Total |
| --- | --- | --- |
| Crear viaje | Trip 6, member 4, person 4, budget 3 | 17 |
| Join | Trip 5, member 5, person 5 | 15 |
| Revocar | Trip hasta 4 contando rama join fallida, member 5 | 9 |
| Metadatos | Trip 0 | 0 |
| Crear/revocar invitación | 2 / 1 | 2 / 1 |

Cotas por inspección del código **sin descontar caché**: ≤10 por operación y ≤20
por commit. El emulador compila las reglas y ejecuta los casos positivos hasta
diez miembros. Su endpoint ruleCoverage exporta cobertura de expresiones; no se
presenta esa cobertura acumulada como una medición de lecturas por petición.
No se han comprobado en esta fase las cotas de padres/merges financieros.

La creación valida todo el documento; actualizaciones limitan affectedKeys y
validan campos modificados/invariantes. Mantener inmutables los demás campos
evita repetir calendarios en cada rama y conserva coherencia inductivamente.
Las reglas no resuelven zonas IANA: validan estructura; el dominio valida nombres
reales y semántica. No se presenta el cliente como protección del servidor.

## Invitaciones y aislamiento

20 bytes de `crypto.getRandomValues`, 160 bits, 32 caracteres Base32. No se trunca
a seis dígitos. Reglas limitan la caducidad a siete días con reloj servidor,
validan emisor y revocación monotónica; no se pueden extender/reactivar tokens.
Get exacto autenticado devuelve únicamente metadata mínima de invitación; listar
corresponde al propietario. Viaje, personas y eventos siguen privados antes del join.

El enlace usa `/join#UUID.token` y el fragmento se retira al abrir. No hay recursos
QR externos, analytics ni logs de aplicación con tokens. El QR PNG local tiene
margen de cuatro módulos y resolución 512, mostrado con la geometría existente.
El código puede copiarse manualmente si Clipboard/Web Share no están disponibles.

Firestore mantiene memoria, sin persistencia privada en SW. Las vistas privadas
se desmontan al cambiar UID; suscripciones omiten datos solo cacheados/pendientes
y comprueban el UID. Offline no se presentan permisos como confirmados. Revocar
impide acceso futuro al servidor pero no borra información descargada, capturada
o copiada anteriormente. Reglas limitan identidades, no prueban humanos únicos;
no hay rate limiting robusto por IP ni protección de cuotas de producción verificada.

## Verificación ejecutada

Resultados finales y comandos: [test-results-summary.json](test-results-summary.json).
Las capturas/trazas completas, logs y cobertura están ignorados por ser
regenerables y poder contener códigos efímeros de emuladores.

| Suite | Resultado |
| --- | --- |
| ESLint | Aprobado |
| TypeScript aplicación + dominio sin DOM | Aprobado |
| Vitest | 180 aprobadas en 19 archivos, 0 fallidas |
| Vite build + manifest/SW | Aprobado |
| Reglas Emulator Suite | 45 aprobadas, 0 fallidas, incluidas 15 conservadas |
| Firefox integración Auth/Firestore | 10 aprobadas, 0 fallidas, Auth y Firestore reales locales |
| Firefox demo/PWA existente | 19 aprobadas, 0 fallidas, HTTP y SW reales |
| Chromium/WebKit | Bloqueados: sandbox de Chromium y bibliotecas WebKit ausentes |

Cobertura de aceptación: AUTH-01/02/03; SEC-01/02/03/04/05; revocación de SEC-06;
escritura inicial/protecciones aplicables de SEC-08/09; aislamiento de SEC-10;
creación/edición/selección de TRIP-01. AUTH-04 no incluye outbox; SEC-06 no aprueba
reasignación; SEC-08/09 no aprueban eventos ordinarios/padres/merges; TRIP-02
permanece bloqueado. Historial cerrado se prepara como fixture administrativo,
sin usar privilegios para las aserciones de permisos. No se usa Admin SDK en app.

Interfaz: seis resoluciones 320×568, 375×667, 390×844, 430×932, 768×1024 y
1440×900, ambos temas, títulos largos/importe máximo, texto ampliado, navegación,
edición, QR, errores y axe. El shell anterior verifica SW real, fallback offline y
actualización entre dos builds, sin atribuirle sincronización financiera.

## Problemas encontrados y correcciones

- Primera regla de revocación excedía 1.000 expresiones: corregida validando
  transiciones e invariantes sin recalcular campos inmutables; positivos/ataques
  finales pasan, incluida revocación con diez accesos.
- Zod no permite pick de un objeto refinado: metadatos se definieron antes de
  extender el formulario. Las pruebas unitarias detectaron el error de arranque.
- Auth anónima desmontaba JoinPage al cambiar UID y perdía código: la ruta pública
  conserva su estado; las privadas mantienen desmontaje por identidad.
- ZXing rechaza algunos PNG válidos con «Dimensions could be not found». Se
  reprodujo con el mismo contenido a 256/512/768 px: el detector fallaba a 512,
  mientras PURE_BARCODE lo leía. Se conserva detección normal para fotos y se
  añade fallback para imágenes sin perspectiva, con regresión de los tres
  tamaños. El peer de ZXing ya instalado se declara directo para usar su enum,
  sin duplicar librerías. Copia de bytes antes de liberar input/URL, quiet zone
  de cuatro módulos y limpieza de cámara al desmontar completan el manejo.
- Fallos de carga de miembros/invitaciones ya no quedan como espera indefinida.
- Las suites Playwright compartían carpeta temporal: se separaron artefactos
  access/shell para impedir borrado cruzado de trazas. Sin alterar tests anteriores.
- Se corrigieron comandos de ejecución: selección Firefox dentro de Playwright,
  no como argumento Firebase; ruta de navegadores de la sesión explícita.

Auditoría npm: 0 vulnerabilidades de ejecución. Completa: 17 moderadas heredadas
por herramientas de Firebase CLI/Workbox, 0 altas/críticas. No se aplicaron
upgrades mayores o degradaciones para ocultar avisos. Se conservan `.gitignore`,
lockfile y exclusiones de emuladores, `.env`, estados Auth, capturas y logs.
La comprobación inspeccionó 273 candidatos (266 textos), 32 documentos y 15
controles de exclusión/retención: sin patrones de secretos ni enlaces locales
rotos. No sustituye una
autorización para incorporar datos personales o credenciales en el futuro.

Gemini omitido por autenticación no disponible ya constatada; sin nuevos intentos
ni envío de datos. Se realizó revisión propia de permisos/transiciones/contratos,
respaldada por reglas reales y navegador. No se atribuyen hallazgos a Gemini.

## Limitaciones y entrega

Faltan cámara física, Web Share real de Android/iOS, cierre/reasignación seguros,
validación multiplataforma y políticas de abuso/producción. SDK Firebase deja
advertencia de chunk >500 kB; los módulos QR se cargan bajo demanda. No se
deshabilita sandbox ni se instala software del sistema para simular aprobación.
Las pruebas contra emuladores no prueban cuotas, envío de correo ni operación
de servicios reales. Loopback/DEV impiden probar otro móvil en LAN sin revisión.

Git: `main` sigue `origin/main` en el SHA de Fase 3. `git add .` falló con
`Unable to create .git/index.lock: Read-only file system`. Índice vacío; no se
eludió el montaje protegido ni se usó API alternativa para publicar. Se revisaron
el diff de trabajo y todos los archivos nuevos, pero no fue posible preparar
un diff staged. **Commit nuevo: no generado. Push: no realizado, pendiente.**
La última consulta a GitHub sigue confirmando `7524563b13b0efa4c681101e9cea050870663a0d`.
CI remota de Fase 4: no ejecutada; requiere publicar los cambios.
No se declara publicada esta fase sin SHA remoto nuevo. Los comandos de entrega para Ubuntu están en [GIT_SETUP](../GIT_SETUP.md).
Fase 5 no iniciada; requiere nueva instrucción tras publicar/revisar esta entrega.
