# Fase 6 · Plan y decisiones previas

Base limpia y publicada verificada localmente y por SSH en
`a89e2b630426929fd9fe33dc8184a65825fc252c`, main. Autorización explícita del usuario.
Leídos AGENTS, README, PRD, arquitectura, modelo, offline, reglas de cálculo y
seguridad, plan de pruebas, decisiones e informe de Fase 5; inspeccionados dominio,
repositorios, Auth, React, Firebase y SW. Sin cambios ajenos pendientes.

1. IndexedDB propio versionado por proyecto/UID, snapshots confirmados de viajes
   descargados, outbox y metadatos de entrega; ninguna tabla de saldos. Confirmar
   transacción completa antes de mostrar guardado. Conservar rechazos y exportación.
2. Coordinador por sesión, lease atómico por operación/grupo entre pestañas,
   notificaciones sin payload privado y backoff. IDs y autor inmutables. Transporte
   REST create-only existente, read-back canónico y confirmación durable atómica.
   Firestore sigue en memoria para evitar una segunda cola opaca de escrituras.
3. React recupera únicamente la partición del UID autenticado; suscripciones de
   servidor renuevan snapshots. Una descarga incompleta nunca habilita operaciones.
   Caché local no sustituye autorización del servidor. Revocación/cierre conservan
   propuestas rechazadas y bloquean escrituras confirmadas.
4. Resolver dos cabezas mediante evento v2 y comparación visible; repetir por pares
   para más cabezas. Detectar duplicados por los criterios existentes, mantener
   separados con revisión explícita y probar unificación atómica keep/hide con
   getAfter. No habilitarla si las reglas/pruebas no demuestran seguridad.
5. Ampliar proyector determinista para pares/coherencia de componentes; mantener
   ramas tardías, ciclos/medios pares como provisionales. Medir antes/después de
   reducir parseos y conversiones de zona repetidas, sin sustituir el motor.
6. Habilitar build PWA local explícito para emuladores (demo-/loopback únicamente),
   SW de recursos estáticos sin caché de datos privados. Actualización solo después
   de guardar operaciones y avisar de pendientes; no garantizar trabajo cerrada.
7. Pruebas: dominio/permutaciones, IndexedDB real en Firefox, fallos/lleno,
   dos dispositivos offline en ambos órdenes, replay/response perdida, dos pestañas,
   logout/otro UID, revocación/cierre, SW con pendientes, reglas y suites anteriores.
8. Informe y auditoría de fuentes/secretos/exclusiones; commit/push autorizados y SHA
   remoto, o comandos Ubuntu si .git protegido. No Fase 7, cierre ni reasignación.

Gemini CLI disponible; se omite como revisión efectiva por cuota excedida ya
constatada en esta conversación, sin reintentos. Revisión propia y pruebas reales.
