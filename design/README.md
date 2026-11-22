# Entrega de diseño · Fase 1

- [Prototipo navegable](prototype/index.html).
- [Tablero de wireframes](wireframes.html): 23 pantallas, 22 muestras de estados/grupo y marcos móvil/escritorio.
- [Composición ilustrada](review/composition.png) y [fuente SVG](review/composition.svg). Es una referencia de jerarquía inspeccionada visualmente; no es una captura del navegador.
- [Detalle ilustrado de presupuesto](review/budget-composition.png), generado con el mismo [fixture verificado](review/verified-fixture.json).
- [Resumen de ajustes visuales](../docs/phase1/VISUAL_ADJUSTMENTS.md).
- [Documentación y recorrido de revisión](../docs/phase1/README.md).
- [Validación automatizada ampliada](../docs/phase1/AUTOMATED_TEST_REPORT.md) y [evidencias actuales](review/testing/README.md): pruebas DOM, Firefox real, capturas y limitaciones explícitas por motor/transporte.

## Abrir

Abrir `prototype/index.html` en un navegador moderno. Es HTML/CSS/JS local, sin build, cuenta ni servicios conectados. No necesita npm para utilizarlo. El tablero incrusta las mismas pantallas en marcos responsive en gris; se puede abrir cada pantalla a tamaño completo.

Si se prefiere HTTP local, desde la raíz del proyecto:

```bash
python3 -m http.server 4173 --bind 127.0.0.1 --directory design
```

Entonces abrir `http://127.0.0.1:4173/prototype/`. Este servidor es opcional y no se dejó iniciado durante la entrega.

## Alcance del prototipo

Solo estado ficticio de esta pestaña, perdido al recargar. Selecciona pantalla, tema y escenarios desde la banda externa. Cámara, Openverse, correo, QR de acceso y sincronización son demostraciones rotuladas. El QR apunta a un dominio de ejemplo no operativo; no crea una invitación. Los SVG Lucide son recursos locales con licencia incluida.

Se puede añadir/editar/eliminar/restaurar un gasto de ejemplo, repartir igual/porcentajes/importes, seleccionar varios pagadores, registrar un abono, ajustar cupos, comparar versiones, decidir duplicados y finalizar el viaje de muestra. La UI calcula números coherentes para la revisión; no es el futuro motor financiero probado ni una implementación de registro inmutable distribuido.

No hay service worker, Firebase, persistencia durable, instalación PWA, cuentas reales ni publicación. Las restricciones de rol/red son escenarios visuales, no controles de seguridad implementados.

## Verificación reproducible

Para las pruebas reales de navegador, usar el [ejecutor de un comando en Ubuntu](review/testing/LOCAL_BROWSER_TESTS.md), que inicia HTTP mediante Playwright y conserva reportes/capturas separados por intento. HTTP sigue bloqueado dentro de Codex; Firefox sí pudo repetir las pruebas por archivo. Los resultados HTTP y `file://` se distinguen en el informe.

Sintaxis y comprobaciones sin navegador:

```bash
node --check design/prototype/app.js
python3 design/review/verify-docs.py
```

Pruebas DOM usan JSDOM fuera de las dependencias de producción:

```bash
npm install --prefix /tmp/gastos-phase1-tools --no-audit --no-fund jsdom@26.1.0
node design/review/verify-prototype.cjs
```

Puede indicarse otro directorio de módulos mediante `DESIGN_TOOLS_DIR`. Los reportes están en [dom-results.json](review/dom-results.json), [document-results.json](review/document-results.json) y [browser-results.json](review/browser-results.json).

`build-composition.py` lee el fixture exportado por las pruebas DOM y genera las dos ilustraciones SVG/PNG con Pillow, disponible en el entorno usado. Ejecutarlo después de `verify-prototype.cjs`. No captura la aplicación.

## Limitaciones de verificación

Firefox real verificó las 23 pantallas en seis resoluciones y ambos temas,
reflujo, scroll, foco nativo de dialog y teclado. Chromium y WebKit siguen sin
ejecutar sus casos. Teclado virtual, zoom nativo, instalación y dispositivos
Android/iPhone físicos permanecen pendientes. JSDOM comprueba DOM y
comportamiento; sus resultados siguen separados de los de navegador. Axe en
Firefox no detecta infracciones en las reglas evaluadas, pero conserva casos
de contraste incompletos y no certifica toda la accesibilidad.

En Escenarios también se compara el botón fijo ancho con el compacto. Las operaciones pendientes se identifican en movimientos y en Actividad. Los cambios continúan siendo locales y efímeros. La entrega se detiene en Fase 1.
