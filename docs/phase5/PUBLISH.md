# Publicar Fase 5 desde Ubuntu

La implementación y sus pruebas están completas. En esta sesión el primer staging
preparó 30 archivos; un staging posterior de documentación falló porque `.git`
está montado en solo lectura. Hay código preparado y documentación final sin
preparar. No se generó commit ni se hizo push. No se eludió el montaje.

Base verificada: `main`, seguimiento `origin/main`, SHA local y remoto
`545fb36bc41d9781d23b8f55946133c718232f2a`. Todas las modificaciones proceden de
esta fase; conservar y revisar cualquier cambio añadido posteriormente por otra
persona. No publicar `.cache`, `.env`, dependencias, exportaciones ni capturas.

En una terminal normal de Ubuntu con acceso de escritura al repositorio:

```bash
cd /mnt/Datos/gastos
git status --short --branch
git branch --show-current
git remote -v
git fetch origin
git log --oneline --left-right main...origin/main
```

Continuar solo en `main` y después de inspeccionar avances remotos si el último
comando muestra commits. No usar force push ni descartar cambios. Si no hay
avances remotos y el contenido sigue siendo el auditado de Fase 5:

```bash
git add --all
git diff --cached --check
git diff --cached
git commit -m "feat: implement shared expenses balances and budgets"
git push origin main
git rev-parse HEAD
git ls-remote origin refs/heads/main
git status --short --branch
```

Comparar los dos SHA y comprobar árbol limpio/seguimiento `origin/main`. La fase
no se declara publicada hasta completar esa comprobación. No cambiar identidad
Git global. Si vuelven a aparecer errores de permisos, detener la publicación;
no usar sudo/root ni copiar `.git` a otra ubicación para eludir controles.

Las pruebas ya ejecutadas y los límites están en [REPORT](REPORT.md) y el
[resumen](test-results-summary.json). Si se modifica código antes de publicar,
repetir las suites pertinentes con Node 24 y las versiones del lockfile:

```bash
npm run check
npm run test:rules
npm run test:access:firefox
npm run test:e2e -- --project=firefox
```

Auth y Firestore exclusivamente en emuladores. No desplegar producción ni iniciar
Fase 6 por publicar este commit.
