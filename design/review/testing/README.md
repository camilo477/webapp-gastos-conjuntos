# Evidencias de validación automatizada

La ejecución real de Playwright usa [un único comando para Ubuntu](LOCAL_BROWSER_TESTS.md).
El [último intento HTTP](latest-browser-run.json) del usuario ejecutó Firefox:
14 aprobados, uno fallido y 30 omitidos de otros motores. El
[resumen Firefox posterior](firefox-followup-run.json) registra la repetición
por archivo tras corregir: 15 aprobados, cero fallidos. Hay capturas reales
en [screenshots/](screenshots/README.md); cada transporte se documenta por separado.

Las secciones siguientes conservan los resultados de la validación DOM anterior. Los hashes de `provenance.json` corresponden a esa entrega histórica; cada intento nuevo conserva su propio `source-hashes.json`.

Ejecución del 21 de noviembre de 2026. [Informe completo](../../../docs/phase1/AUTOMATED_TEST_REPORT.md). No se generaron capturas reales: los tres motores fallaron antes de abrir página y el servidor HTTP recibió `EPERM`.

[Conteos finales](summary.json), [archivos conservados/modificados](corrections/integrity.json) y [hashes de fuentes/evidencias](provenance.json). El sello de procedencia indica la consolidación; los tiempos de Playwright están en su reporte.

| Directorio | Contenido |
| --- | --- |
| `environment/` | Sondas ejecutadas, logs de arranque/ldd, permisos y dependencias extraídas localmente |
| `dom/` | Harness, 39 casos existentes, 42 ampliados, 27 grupos de propiedades y fixtures exportados |
| `accessibility/` | Axe antes/después/final; auditorías parciales en JSDOM, con reglas incompletas registradas |
| `playwright/` | Suite, configuración, reporte JSON/HTML y log: 45 omitidas, cero ejecutadas |
| `corrections/` | Seis defectos, diferencia del prototipo y hashes para revisión |

Los archivos `*-before.json` preservan los fallos reproducidos. `*-after.json` acredita la primera repetición; `*-final.json` es la ejecución más reciente con toda la cobertura añadida. Los resultados previos en el directorio superior son históricos. Ningún reporte DOM representa un navegador.

## Comandos utilizados

Herramientas de desarrollo externas al prototipo, sin dependencias productivas:

```bash
npm install --prefix /tmp/gastos-phase1-tools --no-audit --no-fund jsdom@26.1.0 playwright@1.56.1 axe-core@4.10.3 prettier@3.3.3
```

Desde la raíz del workspace:

```bash
python3 design/review/testing/environment/probe-sockets.py
node design/review/testing/environment/probe-browsers.cjs
node design/review/testing/environment/probe-webkit-local.cjs
DESIGN_REPORT_DIR=design/review/testing/dom node design/review/verify-prototype.cjs
DESIGN_RUN_LABEL=final node design/review/testing/dom/extended-tests.cjs
node design/review/testing/dom/calculation-properties.cjs
DESIGN_RUN_LABEL=final node design/review/testing/accessibility/run-axe.cjs
node /tmp/gastos-phase1-tools/node_modules/playwright/cli.js test --config design/review/testing/playwright/playwright.config.cjs
DESIGN_REPORT_DIR=design/review/testing python3 design/review/verify-docs.py
```

Estos comandos se ejecutaron en la validación anterior. `DESIGN_TOOLS_DIR` permite indicar otro directorio de módulos. Para la suite actual se debe usar el ejecutor enlazado arriba: inicia HTTP mediante `webServer`, realiza sondas nuevas y no considera omitidos o no iniciados como aprobados.

WebKit tiene un wrapper adicional, `environment/webkit-local.sh`, que añade bibliotecas locales con `LD_LIBRARY_PATH`. La sonda final está en `webkit-local-results.json`; sigue fallando por libyuv. Los cuatro paquetes descargados se conservan junto a sus hashes, licencias y bibliotecas. No se modificó el sistema ni se deshabilitó seguridad.

Las pruebas de propiedades acceden a funciones privadas mediante instrumentación únicamente dentro del harness. Comprueban 6.750 vectores válidos y 2.250 inválidos; son 27 grupos de pruebas, no 9.000 pruebas independientes. Los temporizadores de las regresiones se disparan de forma controlada, no representan red real.

## Capturas y referencias

No hay capturas móviles, de escritorio u oscuras de esta ejecución. Las PNG/SVG del directorio superior son composiciones ilustradas anteriores. La suite preparada toma unas pocas capturas diagnósticas si consigue navegar; no usa `toHaveScreenshot`, snapshots ni referencias por píxel. No existe ninguna referencia visual que actualizar. La ausencia de imágenes aquí refleja el bloqueo, no una aprobación visual.
