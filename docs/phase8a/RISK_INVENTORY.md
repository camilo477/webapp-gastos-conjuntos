# Fase 8A · Inventario inicial de riesgos y verificación

Base: `a9ac5e22171681ad7319246b555695fcfe2c02aa`, `main` limpio y coincidente
con GitHub antes de editar. Fecha: 2026-11-23. Este inventario distingue defectos
observados, límites conocidos y verificaciones pendientes; no certifica el MVP.

La revisión inicial recibió un mensaje truncado en el punto 6 de CI. Después
se recibió la continuación completa y se ejecutó la auditoría integral. La tabla
siguiente conserva el inventario inicial; el estado actualizado y las evidencias
están en [REPORT.md](REPORT.md). Producción, cierre y reasignación permanecen
deshabilitados; no se confunde auditoría con autorización de lanzamiento.

| Prioridad | Riesgo / evidencia | Acción o puerta de aceptación |
| --- | --- | --- |
| Alta, confirmado | Actions de Fases 5, 6 y 7: Chromium no arranca por sandbox/AppArmor; 19 casos por ejecución no ejercitan la app | Conservar sandbox, preparar entorno compatible y comprobar arranque antes de suites |
| Alta, confirmado | WebKit falla en shell.spec.ts:82, después de goto+Tab; 18 casos restantes pasan | Reproducir el elemento enfocado, separar foco de navegación y foco interactivo; conservar comprobación visual real |
| Alta, confirmado | Fallo del shell omite acceso, offline y adjuntos en Actions | Aislar motores y recoger resultados independientes sin convertir fallos en éxito |
| Alta, pendiente | Las 530 pruebas de Fase 7 son locales, mayormente Firefox; no equivalen a CI verde ni QA física | Ejecutar motores disponibles y verificar SHA/resultados remotos de la corrección |
| Alta, conocido | IndexedDB puede ser borrado/evicto; sesión anónima perdida no se recupera por nombre | Mantener advertencias y aislamiento; comprobar cambios relevantes con regresiones existentes, sin prometer backup |
| Alta, conocido | Servidor valida autorización/conservación/padres directos, no semántica global del DAG, IANA o restos mayores | Conservar proyector conservador y pruebas adversariales; no ampliar permisos |
| Alta, decisión pendiente | Cierre puede rechazar colas remotas desconocidas; reasignación requiere consentimiento/seguridad de identidad | D-13/D-14 sin ratificar; no habilitar desde esta revisión inicial |
| Media, conocido | Descarga financiera completa; crecimiento de historial/miniaturas y cuotas compartidas | Medir si se modifica esa ruta; no repetir carga ya validada sin un motivo |
| Media, pendiente externa | Openverse público no fue accesible desde el entorno de Fase 7 | Mantener fallback y distinguir respuestas controladas de disponibilidad real |
| Media, pendiente física | Android/iPhone: cámara, instalación, suspensión, reanudación y presión de almacenamiento | QA en equipos físicos; Playwright no la sustituye |
| Media, documentación | Encabezados de README/arquitectura conservan estados anteriores a Fases 6/7 | Aclarar estado vigente, conservando informes históricos |
| Media, conocido | Última auditoría: 17 avisos moderados de herramientas, cero de producción | Revalidar antes de publicar; sin upgrades generales para ocultar avisos |
| Operativa, pendiente | HTTPS, dominios Auth, mantenimiento/cuotas y recuperación antes de producción | Preparación documental; sin conectar servicios reales ni desplegar |

## Evidencia inicial de Actions

Se consultaron ejecuciones recientes y los logs completos de los jobs:

- [Fase 5, ejecución 45222279779](https://github.com/camilo477/webapp-gastos-conjuntos/actions/runs/45222279779).
- [Fase 6, ejecución 45250138775](https://github.com/camilo477/webapp-gastos-conjuntos/actions/runs/45250138775).
- [Fase 7, ejecución 45269708139](https://github.com/camilo477/webapp-gastos-conjuntos/actions/runs/45269708139).

En las tres: check, reglas e instalación de navegadores aprobados; shell:
20 fallidos y 37 aprobados. 19 fallos son arranque de Chromium; el restante es
foco WebKit. Las suites posteriores se omiten por dependencia secuencial.
Runner Ubuntu 26.04.1, imagen 20261116.202.1. No es evidencia de fallo financiero.

Lectura inicial: AGENTS, README, informes Fases 1–7 (y revisión documental de Fase 0
en DECISIONS), decisiones y plan de pruebas; reglas, dominio/proyector, transporte,
IndexedDB, coordinadores, sesión, imágenes, SW y configuración CI. Los informes
anteriores se conservan como evidencia histórica, incluidos sus bloqueos Git.
