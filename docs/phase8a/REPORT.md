# Fase 8A · Estabilización en curso

Base publicada verificada: `a9ac5e22171681ad7319246b555695fcfe2c02aa`.
Árbol limpio antes de editar. Se conserva la revisión inicial y reparación
de CI y se continúa la auditoría integral con el alcance recibido posteriormente.
No se autoriza producción ni despliegue. El
[inventario inicial](RISK_INVENTORY.md) conserva riesgos y pendientes.

## Diagnóstico de CI

Se leyeron los logs completos de las ejecuciones de Fases 5, 6 y 7 y se examinó
el artefacto/traza WebKit de la última. Las tres muestran 20 fallos y 37 casos
aprobados en shell. Acceso, offline y adjuntos se omiten después de ese fallo.
Las 530 pruebas locales de Fase 7 no se presentan como CI aprobada.

Chromium falla antes de abrir una página: Ubuntu 26.04 restringe namespaces
mediante AppArmor, mientras la configuración exige `chromiumSandbox:true`.
El mismo error se reprodujo localmente. La corrección usa el helper SUID de
Google Chrome instalado en la imagen del runner, siguiendo la
[alternativa documentada por Chromium](https://chromium.googlesource.com/chromium/src/+/main/docs/security/apparmor-userns-restrictions.md).
Conserva sandbox:true, comprueba archivo/root/SUID/sin escritura de grupo u otros
y falla explícitamente si no está disponible. No modifica AppArmor, sysctl ni
permisos del host, ni añade --no-sandbox. Su funcionamiento remoto debe verificarse
en la ejecución del commit; la máquina local no tiene ese helper instalado.

La [imagen Ubuntu 26.04](https://github.com/actions/runner-images/blob/main/images/ubuntu/Ubuntu2604-Readme.md)
es la observada en los logs y está entre los
[sistemas soportados por Playwright](https://playwright.dev/docs/intro#system-requirements).
Se fija su etiqueta para evitar una migración implícita desde ubuntu-latest;
la imagen sigue recibiendo actualizaciones del proveedor.

WebKit sí arranca. La traza muestra que :focus es main: el efecto RouteFocus de
React termina después de load y puede ejecutarse después del Tab de la prueba.
Main es un destino programático con outline:none intencional. Se reprodujo:
WebKit original→main/none, esperando navegación→enlace/solid. Firefox→enlace/solid.
La prueba ahora espera main enfocado, pulsa Tab y comprueba el enlace concreto,
outline sólido y grosor 3 px. No se cambia el producto ni se elimina la aserción.

## Cambios

- `.github/workflows/ci.yml`: validación y reglas, luego matriz de tres motores
  independientes, fail-fast:false, límite de duración y artefactos por motor.
  Cada suite se intenta aunque haya fallado otra del mismo motor, siempre que el
  arranque previo haya pasado y no se cancele. Un fallo sigue haciendo fallar CI.
- `scripts/check-browser.mjs`: comprobación real de arranque/página antes de las
  suites, evitando repetir 19 veces un fallo de infraestructura.
- `tests/e2e/shell.spec.ts`: regresión de foco sin carrera de montaje.
- README/AGENTS e inventario: estado real, sin borrar documentación histórica.

No cambian motor, contratos v2, reglas, dinero, colas, adjuntos ni dependencias.
Firebase permanece limitado a emuladores; cierre/reasignación deshabilitados.

## Verificación

Resultados locales de esta corrección:

- ESLint, TypeScript de aplicación/dominio y build PWA aprobados.
- Vitest: 243/243, 26 archivos.
- Regresión de foco: cinco repeticiones Firefox y cinco WebKit, 10/10 aprobadas.
- Preflight WebKit: arranque/página aprobados, versión 27.2.
- YAML parseado y matriz de tres motores comprobada.
- Auditoría npm de producción: cero vulnerabilidades.
- Reglas Firestore: 200/200 aprobadas en emuladores.
- Auditoría completa: 17 avisos moderados de herramientas; cero altos/críticos,
  sin cambios respecto a Fase 7. Fuentes/historial sin patrones de secretos,
  exclusiones comprobadas y 42 Markdown sin enlaces locales rotos.

- Shell WebKit completo: 19/19 aprobadas (55,1 s), incluidos accesibilidad,
  responsive, offline real y actualización entre dos builds.

Resumen compacto: [test-results-summary.json](test-results-summary.json).
CI remota corregida todavía sin ejecutar. Chromium local sigue bloqueado por
sandbox; no se declara aprobado. No hay pruebas físicas Android/iPhone.

Se descargaron los binarios exactos Playwright. WebKit local usa bibliotecas
Ubuntu extraídas únicamente dentro de cachés ignoradas, sin instalar paquetes
ni modificar el sistema. CI usa install --with-deps. Artefactos, trazas y
descargas de diagnóstico permanecen fuera de Git.
El primer intento de reglas se detuvo por faltar sus variables de entorno de
emuladores; el primer shell completo encontró el puerto aún ocupado tras las
repeticiones. No cuentan como aprobados. Se corrigió la invocación/limpieza y
se repitieron con las mismas expectativas, sin cambios al código financiero.

Gemini CLI se ejecutó en modo plan/read-only, sin extensiones y timeout 45 s;
no terminó la revisión. Se omitió como revisión efectiva, sin reintentos.
Diagnóstico propio respaldado por logs, traza y navegadores reales.

## Git y límites de esta entrega

El primer git add preparó siete archivos; se revisó todo el diff staged y
git diff --cached --check. Al actualizar el informe y añadir el resumen, el
segundo git add falló: `Unable to create .git/index.lock: Read-only file system`.
Se conservan tanto el índice parcial como todos los cambios finales de trabajo.
No se intentó eludir la protección con otra API, sudo, permisos o una copia Git.

**Commit nuevo: no generado. Push: no realizado. CI corregida: no ejecutada.**
GitHub confirmó de nuevo al cierre el SHA base de Fase 7, igual al HEAD local.
La reparación de foco está verificada localmente. La configuración del helper
Chromium y las suites de tres motores necesitan ejecución en Actions: no se
declaran reparadas remotamente sin esa evidencia.

[Comandos de publicación desde Ubuntu](PUBLISH.md). La Fase 8A sigue abierta:
queda la continuación del alcance, la verificación remota y el resto del
inventario; no se afirma que el MVP esté listo para producción.

## Continuación y primera validación remota

Se recibió el alcance completo y Git volvió a permitir escritura. Se publicó
`a763ce52d798e5b1b77c686cd74b1ee2aa3c9c68`; push comprobado. La ejecución
[45274580059](https://github.com/camilo477/webapp-gastos-conjuntos/actions/runs/45274580059)
pasó validate y el shell Firefox/WebKit. El preflight Chromium rechazó el helper
SUID porque no cumple propietario/permisos requeridos en esa imagen. No se
relajan comprobaciones ni se cambian permisos del host. La segunda configuración
usa el Chrome preinstalado en la ruta admitida por AppArmor, con sandbox activo;
los tres proyectos comparten selección en playwright.browsers.ts y conservan
todos los casos. Se identifica como Chrome en el log, sin atribuir el resultado
al Chromium empaquetado de Playwright. Su ejecución remota sigue pendiente.
WebKit acceso falló en esa primera ejecución; se investiga mediante reproducción
local y logs antes de atribuirlo a producto o infraestructura.
