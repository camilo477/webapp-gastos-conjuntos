# Git y publicación inicial

Repositorio público: <https://github.com/camilo477/webapp-gastos-conjuntos>.
Rama prevista: `main`. La importación inicial reúne los entregables existentes
de Fase 0 y Fase 1; no declara aprobada la Fase 1.

## Continuación con el repositorio ya inicializado

El usuario inicializó Git en Ubuntu y preparó los archivos. Ahora se comprueban
`main`, `origin` correcto y un índice sin conflictos. La URL guardada es HTTPS;
la configuración existente del usuario hace que `git remote -v` la muestre como
SSH para el mismo repositorio. No se cambió ese remoto ni se repitió `git init`.

Esta sesión puede leer Git, pero `.git` sigue montado como solo lectura. Las
correcciones de trabajo necesitan volver a prepararse en una terminal normal.
Después de revisar el informe de pruebas y el contenido preparado:

```bash
cd /mnt/Datos/gastos &&
git add . &&
git diff --cached --check &&
git commit -m "chore: initialize project with documentation and UI prototype" &&
git push -u origin main
```

Comprobar después `git status --short`, `git branch -vv`, `git rev-parse HEAD`
y `git ls-remote origin refs/heads/main`: los SHA local y remoto deben coincidir
y la rama debe seguir `origin/main`. No declarar publicado el commit antes de
esa comprobación.

`.gitattributes` conserva los dos espacios de salto de línea Markdown del plan
original como formato intencional, sin modificar ese documento ni su hash. La
excepción de espacios finales está limitada a ese archivo; el resto de cambios
continúa sujeto a `git diff --check`.

## Historial de la preparación anterior

GitHub confirmó un repositorio vacío, tamaño cero y ninguna rama. En esta sesión
no se ve un repositorio Git operativo en `/mnt/Datos/gastos`: `.git` es un montaje
`tmpfs` de solo lectura. El intento real de `git init --initial-branch=main`
terminó con `.git/info/: Read-only file system`. No se pudo crear una rama local,
configurar `origin`, preparar un índice real, crear un commit ni hacer push.
No existe un SHA publicado por esta tarea.

Se conservó la identidad Git existente y no se modificó configuración global.
La configuración del usuario reescribe las URLs HTTPS de GitHub a SSH. El intento
de `git ls-remote` falló al resolver `github.com`; el contenido remoto se comprobó
mediante la conexión GitHub disponible. La reescritura se conservó: la terminal
normal necesitará la autenticación SSH que el usuario ya tenga configurada.

## Qué se conserva y qué queda local

`.gitignore` conserva documentación, el plan, el prototipo, HTML/CSS/JavaScript,
iconos y licencia, wireframes, composiciones PNG/SVG, fixtures auditados, resúmenes
de pruebas y scripts. Excluye credenciales, cachés, dependencias, compilación,
bibliotecas extraídas, paquetes descargados, logs, trazas, capturas y directorios
de ejecuciones automáticas.

Los resultados existentes no se borraron. Las referencias históricas de los
informes a `testing/runs/`, logs o reportes HTML describen evidencia local que
no viaja en el repositorio. Se regenera mediante el ejecutor documentado. El
verificador documental distingue estas salidas locales de fuentes obligatorias:
la ausencia de una fuente o composición de referencia sigue siendo un error.

`AGENTS.md` contiene la regla permanente solicitada: commits descriptivos por
fase/corrección, pruebas antes de publicar, auditoría de secretos, push después
de cambios validados y conservación de historiales, sin force push.

## Verificación previa ejecutada

Las pruebas se ejecutaron sobre una copia que contiene únicamente archivos
publicables, para comprobar que no dependen de cachés o resultados locales:

- 108 pruebas DOM/lógica aprobadas, con 6.750 vectores de reparto válidos y
  2.250 vectores inválidos rechazados correctamente.
- 68 auditorías axe parciales sin infracciones detectadas en las reglas
  evaluables; no equivalen a accesibilidad certificada ni a navegador real.
- 32 pares de contraste de tokens y comprobación documental correctos.
- 3 regresiones del ejecutor de procesos aprobadas.
- 4 pruebas de exportación Git aprobadas, incluyendo 58 casos de `git check-ignore`,
  conservación de fuentes, documentación sin resultados locales y rechazo de un
  enlace fuente roto.

La revisión de candidatos no detectó secretos reales, cuentas de servicio o datos
reales de participantes; los correos encontrados usan `example.invalid` y los
participantes son fixtures documentados. Esta revisión no garantiza la ausencia
universal de secretos ni cubre archivos que cambien después. Los resultados
detallados están en `design/review/testing/git-publication/`, excluido de Git.

Los navegadores y HTTP siguen bloqueados en esta sesión; las 45 pruebas reales
no se presentan como aprobadas. No se borraron ni sobrescribieron los resultados
de las verificaciones anteriores. Gemini fue omitido; se realizó revisión propia.

## Comandos históricos de inicialización (no repetir en el repositorio actual)

Estos comandos están limitados a una importación inicial sin historial. Se
detienen si encuentran commits/refs locales o si el remoto dejó de estar vacío,
para que se inspeccione e integre ese historial antes de publicar. No sustituyen
remotos distintos ni alteran configuración global.

```bash
set -e
cd /mnt/Datos/gastos
git init --initial-branch=main
if git rev-parse --verify HEAD >/dev/null 2>&1; then
  echo 'Ya existen commits: conservarlos e inspeccionar el historial antes de continuar.'
  exit 1
fi
test -z "$(git for-each-ref --format='%(refname)')" || {
  echo 'Hay referencias existentes; revisar antes de la importación inicial.'
  exit 1
}
test -z "$(git ls-files --cached)" || {
  echo 'Hay archivos preparados previamente; revisarlos antes de continuar.'
  exit 1
}
git config --get user.name >/dev/null
git config --get user.email >/dev/null
git symbolic-ref HEAD refs/heads/main
if git config --local --get remote.origin.url >/dev/null; then
  case "$(git config --local --get remote.origin.url)" in
    https://github.com/camilo477/webapp-gastos-conjuntos.git|https://github.com/camilo477/webapp-gastos-conjuntos|git@github.com:camilo477/webapp-gastos-conjuntos.git) ;;
    *) echo 'origin apunta a otro repositorio; no se reemplazará.'; exit 1 ;;
  esac
else
  git remote add origin https://github.com/camilo477/webapp-gastos-conjuntos.git
fi
gastos_remote_refs="$(git ls-remote --heads --tags origin)"
test -z "$gastos_remote_refs" || {
  echo 'El remoto ya tiene historial. Hacer fetch e inspeccionar antes de integrar; no forzar.'
  exit 1
}
git add -- .gitignore AGENTS.md README.md docs design
git diff --cached --check
git status --short
git diff --cached --stat
```

Revisar el contenido preparado (`git diff --cached`) y volver a auditar cualquier
cambio posterior a esta sesión. La auditoría realizada aquí no cubre archivos
que se añadan o modifiquen después. Si aparece un secreto real, detenerse.

Con los archivos auditados y las pruebas disponibles verificadas, completar:

```bash
git commit -m "chore: initialize repository with phase 0 and phase 1"
git push --set-upstream origin main
git remote -v
git branch -vv
git rev-parse --abbrev-ref --symbolic-full-name '@{u}'
gastos_local_sha="$(git rev-parse HEAD)"
gastos_remote_sha="$(git ls-remote origin refs/heads/main | cut -f1)"
test "$gastos_local_sha" = "$gastos_remote_sha"
git status --short
printf 'Commit publicado: https://github.com/camilo477/webapp-gastos-conjuntos/commit/%s\n' "$gastos_local_sha"
```

Si el remoto contiene commits, usar `git fetch origin` e inspeccionar ramas,
árboles y ancestros para decidir la integración. No sobrescribir ni descartar
ningún historial. Este caso no se produjo en la inspección remota de esta tarea.

La Fase 1 conserva sus pruebas de navegador bloqueadas y la Fase 2 no se inició.
