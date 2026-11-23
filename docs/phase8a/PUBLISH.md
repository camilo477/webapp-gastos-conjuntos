# Publicar la corrección inicial de CI desde Ubuntu

El entorno de Codex permitió el staging inicial y después protegió .git.
No hay commit nuevo ni push. El árbol conserva todos los archivos finales;
el índice conserva una versión anterior del informe y carece del resumen final.
Ejecutar desde una terminal normal donde Git tenga permisos, sin sudo ni force.

Primero inspeccionar rama y avances. Base esperada de esta entrega:
`a9ac5e22171681ad7319246b555695fcfe2c02aa`. Si aparece trabajo nuevo o divergencia,
detenerse y revisarlo antes de integrar; no descartar cambios ni hacer push forzado.

```bash
cd /mnt/Datos/gastos
git status --short --branch
git branch --show-current
git fetch origin
git rev-parse HEAD
git log --oneline --left-right main...origin/main
```

Con main/base comprobadas y sin divergencia, preparar **todos** los entregables
finales y revisar el contenido exacto:

```bash
git add .github/workflows/ci.yml scripts/check-browser.mjs tests/e2e/shell.spec.ts README.md AGENTS.md docs/phase8a/RISK_INVENTORY.md docs/phase8a/REPORT.md docs/phase8a/test-results-summary.json docs/phase8a/PUBLISH.md
git diff --cached --check
git diff --cached
git commit -m "fix: stabilize browser CI and keyboard focus checks"
git push origin main
git rev-parse HEAD
git ls-remote origin refs/heads/main
git status --short --branch
```

Los dos SHA finales deben coincidir. Comprobar después la ejecución del commit
en [Actions](https://github.com/camilo477/webapp-gastos-conjuntos/actions).
Si gh está autenticado, estos comandos son de solo lectura:

```bash
gh run list --repo camilo477/webapp-gastos-conjuntos --workflow ci.yml --branch main --limit 5
gh run view RUN_ID --repo camilo477/webapp-gastos-conjuntos --log-failed
```

RUN_ID debe corresponder al SHA recién publicado. Verificar validate y los tres
jobs browsers, sus cuatro suites y artefactos. El helper debe existir y pasar
preflight en Chromium. Si falla, conservar logs y corregir el entorno; no
desactivar sandbox/AppArmor para conseguir verde. Un check omitido no es aprobado.
No desplegar ni conectar Firebase productivo al publicar esta corrección.
