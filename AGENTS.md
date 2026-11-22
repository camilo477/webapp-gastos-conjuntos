# Instrucciones del repositorio para Codex

## Alcance y estado

Proyecto de gastos compartidos. Leer `README.md`, la documentación de la fase
afectada y el plan antes de cambiar comportamiento. La Fase 1 sigue pendiente
de aprobación; consultar `docs/phase1/AUTOMATED_TEST_REPORT.md` para distinguir
los resultados reales de las correcciones todavía sin repetir. No iniciar
Fase 2, implementar Firebase ni
rediseñar el prototipo sin una nueva instrucción explícita.

## Git y publicación

Estas reglas proceden de la autorización explícita del usuario para mantener
el historial y publicar los cambios validados. Sustituyen la restricción
anterior de no hacer commits ni push para este proyecto.

- Repositorio: `https://github.com/camilo477/webapp-gastos-conjuntos.git`.
- Rama principal: `main`. Inspeccionar estado, rama, remotos y commits antes
  de cambiar archivos. Conservar modificaciones ajenas e historiales existentes.
- Usar la identidad Git existente. No reemplazar configuración global.
- Cada fase completada debe tener commits propios con mensajes descriptivos.
  Las correcciones importantes deben quedar registradas. Separar fases cuando
  sea razonable; la importación inicial puede reunir los entregables existentes
  de Fase 0 y Fase 1, sin declarar aprobada la Fase 1.
- Ejecutar las pruebas disponibles antes de publicar. Documentar con precisión
  las pruebas bloqueadas o pendientes; nunca presentar DOM como navegador real.
- Revisar todo el contenido preparado con `git diff --cached`, comprobar
  `.gitignore` y auditar secretos antes de cada publicación. La autorización
  para publicar no incluye secretos, datos reales de participantes ni basura
  temporal. Si aparece un secreto real en archivos o historial, detener la
  publicación y explicar el problema sin reproducir el secreto.
- Mantener `.gitignore`: conservar fuentes, documentación, diseño, composiciones
  de referencia, fixtures auditados y pruebas; excluir credenciales,
  dependencias, cachés, compilaciones y ejecuciones voluminosas regenerables.
- Hacer push al finalizar cambios validados dentro del alcance autorizado.
  Si el remoto tiene avances, fetch e inspección antes de integrar; no
  sobrescribir historiales ni resolver conflictos descartando trabajo ajeno.
- Nunca utilizar force push, borrar documentación o resultados anteriores,
  ejecutar Git destructivo ni cambiar de rama sin autorización. Crear/configurar
  `main` para la importación inicial está autorizado por el usuario.
- Tras publicar, verificar SHA remoto, seguimiento `origin/main`, archivos
  necesarios y estado local. No declarar éxito sin comprobar el remoto.
- Si permisos o autenticación bloquean Git, conservar todo el trabajo,
  documentar el bloqueo y proporcionar los comandos exactos para una terminal
  normal. No eludir controles del entorno ni usar sudo/root.

## Trabajo y verificación

Al finalizar cada fase: ejecutar pruebas disponibles, corregir errores
reproducibles, actualizar documentación, revisar `.gitignore`, auditar secretos,
crear commits descriptivos, hacer push a `origin/main` y verificar el SHA remoto
y el estado local. Una prueba omitida o bloqueada no cuenta como aprobada. Si
`.git` está protegido, no intentar eludirlo: entregar comandos mínimos para una
terminal normal y distinguir lo preparado de lo realmente publicado.

Entender el código antes de editarlo; aplicar la corrección mínima, añadir las
regresiones necesarias, ejecutar las comprobaciones relevantes y revisar el
resultado. No añadir dependencias o abstracciones innecesarias. El prototipo es
una simulación local, no una aplicación productiva ni una sincronización real.

La revisión con Gemini es opcional: usarla cuando aporte valor y esté disponible
y autorizada, sin enviar secretos ni datos privados. Si falta autenticación o
falla, seguir con revisión propia y señalarlo en el informe final.
