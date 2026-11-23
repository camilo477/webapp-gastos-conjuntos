# Publicación de Fase 8A

Los primeros intentos encontraron .git de solo lectura; ese bloqueo histórico
no representa el estado posterior. Se publicaron y verificaron:

- `a763ce52d798e5b1b77c686cd74b1ee2aa3c9c68`: foco y separación de motores.
- `1b8158fd53b56895ed12096d0c3320433d75ba58`: Chrome sandboxed en Actions.

La continuación publica las correcciones de durabilidad y sus regresiones, luego
consolida resultados. Ver [REPORT.md](REPORT.md) para SHA/Actions finales. No
interpretar un push como despliegue ni como aprobación automática de CI.

## Si el entorno vuelve a proteger .git

Conservar archivos, no usar sudo ni cambiar permisos ni eludir el bloqueo.
Desde Ubuntu normal, inspeccionar primero; si hay avances ajenos o divergencia,
revisarlos antes de integrar sin descartar trabajo:

```bash
cd /mnt/Datos/gastos
git status --short --branch
git branch --show-current
git fetch origin
git log --oneline --left-right main...origin/main
```

Con main comprobada, pruebas ejecutadas y diff/secretos auditados, preparar solo
los archivos de la fase. Ejecutar cada comando por separado, comprobar el índice
completo y detenerse ante cambios inesperados:

```bash
git add .github/workflows/ci.yml AGENTS.md README.md docs/phase8a scripts/measure-financial.mjs src tests
git diff --cached --check
git diff --cached
git commit -m "fix: stabilize offline durability and audit MVP readiness"
git push origin main
git rev-parse HEAD
git ls-remote origin refs/heads/main
git status --short --branch
```

Si ya se creó el commit y solo faltó push, no crear otro innecesariamente.
Los SHA local/remoto deben coincidir. Comprobar la ejecución del mismo SHA en
[Actions](https://github.com/camilo477/webapp-gastos-conjuntos/actions), incluyendo
validate y los doce jobs navegador × suite. Con gh autenticado:

```bash
gh run list --repo camilo477/webapp-gastos-conjuntos --workflow ci.yml --branch main --limit 5
gh run view RUN_ID --repo camilo477/webapp-gastos-conjuntos --log-failed
```

No relajar sandbox, omitir casos ni declarar verde un check pendiente/fallido.
No desplegar ni conectar Firebase productivo al publicar esta auditoría.
