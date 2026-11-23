# Fase 5 · Plan de implementación

Autorización explícita, 2026-11-23. Base local y `origin/main` verificadas en
`545fb36bc41d9781d23b8f55946133c718232f2a`, árbol limpio. Leídos AGENTS, README,
PRD, arquitectura, contratos, cálculo, seguridad, offline, pruebas, decisiones,
plan MVP e informes de Fases 3 y 4. No se modifica el prototipo.

1. Reutilizar contratos financieros v2, proyector y resumen de `src/domain`.
2. Repositorio: registro completo, Timestamp → DTO, personas históricas,
   listeners con metadata y completitud explícita. Escritura REST create-only
   autenticada, ID preasignado, timeout y read-back canónico en reintentos.
   Sin escritura SDK encolada, caché durable ni outbox.
3. Reglas: campos estrictos, autor/binding activo, conservación, listas hasta diez,
   padres directos/before/reloj, inmutabilidad y presupuesto solo owner. Probar
   diez personas y dos padres. Validar cambios de una reserva manual por revisión
   para acotar evaluación; documentar semántica que corresponde al proyector.
4. React: formulario rápido con opciones progresivas, revisión/estado explícitos,
   gastos, abonos, historial, saldos, presupuesto y estadísticas del mismo estado.
   Mantener componentes, tokens, temas y separación de la demostración.
5. Verificar regresiones unitarias, reglas hostiles, dos contextos Firefox,
   accesibilidad/responsive y carga del registro. Ejecutar suites anteriores.
6. Revisar diff, exclusiones y secretos, documentar resultados; intentar commit y
   push autorizado. Si `.git` está protegido, entregar comandos sin eludirlo.

Riesgos principales: 1.000 expresiones de reglas, confirmación incierta de HTTP,
concurrencia sin elección de ganador, personas históricas revocadas, descarga
completa y coste de reproyectar. Cierre/reasignación continúan deshabilitados.

Gemini CLI ejecutado en modo plan, sin extensiones, timeout 45 segundos: no
completó revisión por cuota excedida. Se aplica fallback sin reintentos.
