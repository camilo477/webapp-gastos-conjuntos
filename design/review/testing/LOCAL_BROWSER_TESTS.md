# Playwright desde una terminal normal de Ubuntu

Este ejecutor usa navegadores reales mediante HTTP. No ejecuta JSDOM ni las pruebas DOM anteriores.

La ejecución de Ubuntu `2026-11-22T00-18-45-770Z` consiguió Firefox real por HTTP:
14 casos aprobados, uno fallido y 30 omitidos de otros motores. Las correcciones
y las repeticiones posteriores están en el [informe actual](../../../docs/phase1/AUTOMATED_TEST_REPORT.md).

Cuando loopback está bloqueado pero Firefox puede abrir archivos, la misma
configuración admite `GASTOS_TEST_TRANSPORT=file` con la CLI directa y
`--project=firefox`. Ese modo omite `webServer` y comprueba `file://`; no demuestra
HTTP, instalación PWA o integración. El ejecutor `run-browser-tests.cjs` conserva
HTTP de forma explícita para no etiquetar por error un resultado de archivo como
prueba HTTP. Cada repetición debe usar un `GASTOS_RUN_DIR` y
`GASTOS_SCREENSHOT_DIR` nuevos para conservar los resultados anteriores.

## Un único comando

Desde una terminal de tu usuario normal, fuera de la sesión restringida de Codex:

```bash
node /mnt/Datos/gastos/design/review/testing/run-browser-tests.cjs --install-browsers
```

Se necesita Node 20 o posterior y npm. El comando reutiliza las herramientas en `/tmp/gastos-phase1-tools/node_modules` cuando existen. Si faltan, prepara Playwright 1.56.1 y axe-core 4.10.3 en un directorio de herramientas local; no añade dependencias al prototipo. La opción `--install-browsers` descarga únicamente los motores de la versión de Playwright que falten, sin instalar paquetes del sistema ni ejecutar `install-deps`. Requiere conexión para esas descargas.

Si HTTP local está denegado, registra el fallo y evita descargar navegadores inútilmente. Si una descarga falla, registra el resultado y prueba las versiones existentes, identificando su diferencia de revisión. No desactiva el sandbox de Chromium, no usa `--no-sandbox`, sudo o root y no modifica la configuración del sistema. WebKit/Firefox pueden seguir sin estar disponibles por dependencias del sistema; ese resultado se declara como cobertura pendiente.

## Qué hace

1. Crea una carpeta de ejecución con fecha, comprueba loopback y registra los permisos observables.
2. Intenta arrancar cada motor disponible una sola vez con su seguridad conservada. La sonda renderiza un documento de diagnóstico; no cuenta como prueba del prototipo.
3. Enumera las **45 pruebas existentes**: 15 por motor. Solo utiliza las sondas de esa misma ejecución para omitir motores bloqueados; no carga los resultados antiguos.
4. Playwright inicia su propio servidor con `webServer`, en un puerto libre de `127.0.0.1`. No reutiliza servidores de otras aplicaciones. Solo sirve el directorio del prototipo, sin escrituras.
5. Ejecuta los casos de los motores disponibles y guarda evidencia de los errores de infraestructura para los restantes. Si el servidor no arranca, los casos quedan **no iniciados**, sin aprobaciones.
6. Cierra los navegadores de las sondas. Playwright gestiona el cierre de su servidor y navegadores; el ejecutor también termina el grupo de procesos que él creó al acabar o recibir una interrupción. Nunca busca ni mata servidores ajenos.

El cierre se ejercitó aquí con arranques fallidos. El ciclo completo con servidor operativo y navegadores abiertos sigue sin validarse en este entorno.

## Evidencias

Cada intento conserva sus archivos sin sobrescribir los anteriores:

- `design/review/testing/runs/<fecha>/RUN_REPORT.md`: resumen de la ejecución.
- `diagnostic.json`, `preflight.json`, `launch-*.log`, `http-server.log` y `runner.log`: causas de bloqueo.
- `discovery.json`: los 45 casos realmente descubiertos por Playwright.
- `results.json` y `html-report/index.html`: reportes de Playwright cuando el runner consigue generarlos.
- `summary.json`: aprobados, fallidos, omitidos y no iniciados, separados.
- `source-hashes.json`: estado de los archivos al terminar ese intento.
- `design/review/testing/screenshots/<fecha>/`: capturas reales y representativas, solo si se consigue renderizar. Incluye inicio, gasto, balance, presupuesto, invitaciones, conflicto, inicio oscuro móvil y escritorio oscuro. No se crean imágenes de sustitución.
- `design/review/testing/latest-browser-run.json`: ubicación del último intento consolidado.

La salida final muestra la ruta del reporte. El código de salida es `0` solo con los 45 casos aprobados; `3` indica cobertura parcial sin fallos de casos ejecutados; `2` indica bloqueo, fallo o error del ejecutor. Un resultado parcial no aprueba la Fase 1.

## Alcance de los casos preparados

Las doce variantes responsive por motor recorren 23 pantallas, seis resoluciones y ambos temas, comprueban controles fuera del ancho, importes recortados, recursos, botón fijo, navegación inferior, scroll y formulario largo. Se añaden estados vacío/largo y crecimiento de texto al 200% por CSS controlada. Este último **no equivale al zoom nativo del navegador o del sistema**.

Los otros tres casos por motor ejercitan navegación mediante controles reales, login ficticio, pagadores, reparto, abonos, presupuesto, cierre, estados simulados, validación de errores, Tab, foco visible, confinamiento en `dialog`, Escape y retorno de foco. Axe recorre las 23 pantallas en los dos temas con contraste activado y conserva las reglas incompletas. No se prueban dispositivos físicos, Firebase ni sincronización real. Las safe areas dependen de lo que el navegador emulado exponga; no equivalen a un iPhone físico.

Las capturas son diagnósticas: no hay snapshots ni comparación por píxeles ni referencias que actualizar. Los cuerpos de estos casos permanecen sin validar hasta conseguir ejecutar un navegador; su enumeración no es una aprobación de su comportamiento.

Para una caché diferente se pueden indicar rutas absolutas mediante `DESIGN_TOOLS_DIR`, `PLAYWRIGHT_BROWSERS_PATH` o `GASTOS_CHROMIUM_EXECUTABLE` / `GASTOS_FIREFOX_EXECUTABLE` / `GASTOS_WEBKIT_EXECUTABLE`. No hacen falta para el comando anterior en este workspace.
