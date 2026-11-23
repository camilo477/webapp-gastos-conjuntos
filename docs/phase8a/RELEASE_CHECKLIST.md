# Checklist de lanzamiento del MVP

**No autoriza despliegue.** La auditoría 8A y un lanzamiento productivo son puertas
distintas. Ver [informe](REPORT.md), [preparación](DEPLOYMENT_PLAN.md) y
[QA física](MOBILE_TEST_PLAN.md). Los resultados definitivos se consolidan al
cierre del informe; nunca interpretar «pendiente» como aprobado.

| Puerta | Estado de esta revisión | Criterio para abrir piloto |
| --- | --- | --- |
| Integridad exacta 2–10 personas, porcentajes/fixed, multipagador y abonos | Dominio existente auditado; nuevas referencias mixtas COP/USD/EUR pasan | Suites financieras y reglas verdes con mismo SHA |
| DAG, conflicto, borrado/restauración y merge | Mantener historial y subtotal provisional; regresiones existentes y dos clientes | Ninguna rama perdida ni ganador por timestamp |
| IndexedDB y recuperación | Corregida apertura transitoria y conexiones tardías; regresiones unitarias y PWA pasan; consolidación final en curso | Sin falsa durabilidad, sin duplicación tras interrupción |
| Dos dispositivos y pestañas | Regresión de integración en ejecución | IDs comprobados en servidor y balances iguales, ambos órdenes |
| Rechazos, revocación, cambio de usuario y SW | Pruebas adversas incluidas en suite | Propuestas conservadas; datos A nunca en B |
| Security Rules, Auth, invitaciones y adjuntos | Mantener denegación/inmutabilidad y pruebas ordinarias | Cero fallo crítico de autorización; límites reales de reglas respetados |
| CI | Chrome sandboxed ya pasa shell/finanzas; auditoría publicada con matriz 12 jobs y validate aprobado | Verificar Actions del SHA final; sin suites ocultas/omitidas como éxito |
| Accesibilidad y responsive | Shell WebKit y foco repetido pasan; finanzas Firefox pasan | Completar motores disponibles; QA de lector/teclado en móviles |
| Cámara/galería y PWA física | Pendiente Android/iPhone reales | Ejecutar MOB-01–16 y registrar versiones/origen |
| Openverse público | Búsqueda curl/miniatura 200; búsqueda exacta 504; copia real CORS en Firefox comprobada | Opcional: mantener fallback; no anunciar búsqueda pública estable |
| Rendimiento | 10.000 eventos ~0,83 s proyección Node, sin alterar semántica | Revisar memoria/latencia del piloto en teléfonos; no confundir benchmark con SLA |
| Dependencias/secretos | Cero vulnerabilidades producción; 17 moderadas herramientas; escaneo previo limpio | Revalidar diff final y contenido de build/artefactos |
| Cierre | Sigue deshabilitado, decisiones/barrera concurrente pendientes | Protocolo de congelación/lectura completa, permisos y recuperación auditados |
| Recuperación invitado | Sigue deshabilitada | Ratificar prueba de identidad, consentimiento, revocación del UID viejo y migración |
| Firebase real | Bloqueado deliberadamente por configuración | Nueva autorización, adaptador HTTPS y reglas/índices/domino verificados |
| Backup y operación | Sin backup independiente productivo garantizado | Ratificar nivel de recuperación y procedimiento probado, responsable/cuotas |

## Antes de autorizar Fase 8B

- [ ] Resolver cualquier defecto crítico de finanzas, convergencia, pérdida o privacidad.
- [ ] Publicar correcciones finales, comparar SHA local/remoto y consultar CI real.
- [ ] Registrar checks fallidos, reintentos, skips y bloqueos sin inflar conteos.
- [ ] Elegir laboratorio móvil privado y completar pruebas físicas prioritarias.
- [ ] Ratificar si cierre/recuperación quedan fuera del primer piloto; comunicarlo.
- [ ] Definir región, origen permanente y responsable de Firebase/Raspberry.
- [ ] Acordar recuperación, límites de uso, privacidad y respuesta a cuotas/abuso.
- [ ] Dar autorización explícita separada para configurar Firebase real y desplegar.

## Antes del primer despliegue autorizado

- [ ] Plan Spark sin billing vinculado; sin Storage/Functions/App Hosting.
- [ ] Cuenta administradora protegida; ninguna clave privada en Git, frontend o Pi.
- [ ] Adaptador productivo probado sin endpoints emuladores ni mezcla de proyectos.
- [ ] Reglas e índices revisados/publicados al proyecto explícito antes de clientes.
- [ ] Auth email/password + anónimo, dominios y correo/reset verificados realmente.
- [ ] HTTPS, rewrites, headers y cachés probados en el origen definitivo.
- [ ] Artefacto ligado al SHA, rollback compatible, historial y datos preservados.
- [ ] Piloto reducido con datos sintéticos, dos cuentas/dispositivos y observación de cuotas.

No marcar ninguna casilla por el mero hecho de existir este documento.
