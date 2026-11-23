# QA móvil física pendiente

Este plan prepara pruebas; **no registra Android/iPhone físicos aprobados**.
Firefox/WebKit headless, viewports, cámara de canvas y selector automatizado no
demuestran instalación, teclado virtual, permisos reales o supervivencia a presión
de memoria. Registrar modelo, SO, navegador/versión, fecha, SHA, origen y resultado
por caso. Usar solo datos e imágenes sintéticos, sin gastos ni recibos personales.

## Laboratorio Android sin producción

Se necesita PC con Node 24/Java, Android SDK Platform Tools (adb), cable y permiso
de depuración USB. No abrir puertos de emuladores en la red pública. Confirmar un
solo dispositivo seleccionado con adb devices; si hay varios, añadir -s SERIAL a
cada comando. No compartir capturas con seriales ni logs de verificación Auth.

1. Ejecutar los emuladores locales: npm run emulators. Conservar proyecto demo- y
   puertos 9199/8180; usar un dataset sintético preparado y mantener el PC activo.
2. Construir el shell conectado con las variables demo- de .env.example en un
   archivo local ignorado y modo emulator-pwa. Ver scripts/build-offline-e2e.mjs
   para valores exactos. Para un laboratorio aislado reproducible se puede ejecutar
   ese script y luego el servidor estático de tests; **no sirve datos de producción**:

```bash
nvm use
node scripts/build-offline-e2e.mjs
GASTOS_STATIC_ROOT=dist-e2e/offline GASTOS_STATIC_PORT=4191 node tests/e2e/server.mjs
```

3. En otra terminal, preparar túneles USB inversos y abrir la misma URL usada
   para QR. No cambiar host/puerto entre pasadas:

```bash
adb reverse tcp:4191 tcp:4191
adb reverse tcp:9199 tcp:9199
adb reverse tcp:8180 tcp:8180
adb shell am start -a android.intent.action.VIEW -d http://127.0.0.1:4191/
```

4. Confirmar window.isSecureContext, disponibilidad de cámara/SW y que las peticiones
   llegan solo a esos emuladores. Loopback es tratado como origen confiable por
   navegadores compatibles; verificar en el equipo concreto antes de interpretar
   un error de permisos. Mantener el mismo origen para todo el ensayo.
5. Para modo avión real, cargar primero el viaje y activar modo avión; el cable/
   túnel USB puede seguir accesible. Detener temporalmente el servidor de emuladores
   o retirar los túneles Auth/Firestore para demostrar desconexión de datos, sin
   borrar el almacenamiento. Recuperarlos al reconectar. Registrar diferencia entre
   el icono de red y disponibilidad real del servicio.
6. Al terminar, retirar únicamente los túneles creados por este laboratorio con
   adb reverse --remove tcp:4191 (y 9199/8180), desactivar depuración USB y conservar
   o eliminar conscientemente solo los datos sintéticos del dispositivo.

No exponer la verificación de correo del emulador como API de producción. Preparar
la cuenta owner sintética desde PC y verificarla en Emulator Suite; nunca publicar
su oobCode. Un invitado del teléfono puede usar el QR del PC con el origen 127.0.0.1
porque ambos remiten al laboratorio mediante túneles.

## iPhone/Safari y red privada

iPhone no dispone de adb reverse. El código actual restringe Firebase a loopback:
abrir http://IP_DEL_PC:4191 no basta para probar finanzas y tampoco proporciona
HTTPS confiable para cámara/SW. No cambiar ese bloqueo ni desactivar validación
de certificados solo para completar un check.

Hace falta un laboratorio HTTPS privado con certificado confiado en el teléfono,
origen estable y un adaptador de endpoints de emuladores explícitamente permitido,
auditado y separado de producción. El plan propone esa preparación futura; **no
se configura en Fase 8A**. Aislarlo por firewall/red, sin proxies desconocidos y sin
compartir tokens. Hasta entonces, iPhone end-to-end con finanzas/cámara queda
bloqueado por infraestructura, no aprobado por WebKit headless. El shell de demo
puede revisarse por separado, sin atribuirle funciones financieras o selector de
fotos reales. Un piloto Firebase real solo procede con nueva autorización.

## Matriz de casos físicos

Repetir en Chrome Android pestaña/PWA y Safari iPhone pestaña/PWA. Dos equipos
distintos y dos identidades dentro del mismo viaje para los casos de sincronización.

| ID | Acción | Evidencia esperada |
| --- | --- | --- |
| MOB-01 | Primera carga, instalar desde menú/Compartir, abrir por icono y ruta interna | Nombre/icono, modo standalone, navegación y origen correctos |
| MOB-02 | QR desde pantalla/impresión, luz baja, permiso denegado, código manual | Ingreso autorizado, nombre no recupera identidad; fallback usable |
| MOB-03 | Cámara frontal/trasera, cancelar, cambiar app, bloquear pantalla, denegar permiso | Recursos liberados, sin audio; gasto funciona sin imagen |
| MOB-04 | Galería JPEG/PNG/WebP grande, orientación y HEIC | Preview legible, ≤640 px/40960 bytes, sin EXIF; HEIC no soportado explicado |
| MOB-05 | Captura rápida con teclado numérico, porcentajes, fecha/hora y nota larga | Importes no tapados, errores accesibles, scroll y botón Guardar alcanzables |
| MOB-06 | Claro/oscuro/sistema, 320–430 px, landscape, zoom/texto ampliado | Sin pérdida de dinero/texto, safe areas y barra de navegación sin superposición |
| MOB-07 | TalkBack/VoiceOver, teclado externo, foco de diálogo/Escape/volver | Nombres/errores/estados anunciados, orden y foco visible/restaurado |
| MOB-08 | Descargar viaje, desconectar realmente datos, cuatro gastos A/B, recargar | Guardados locales, IDs durables, subtotal provisional y cero confirmaciones falsas |
| MOB-09 | Cerrar app/forzar proceso, esperar, reabrir sin red | Mismos gastos/IDs o limitación explícita; no prometer trabajo cerrada |
| MOB-10 | Reconectar A→B y B→A, reintentar desde dos pestañas | Cuatro IDs únicos en servidor, mismo balance/costo y estados confirmados |
| MOB-11 | Ediciones offline 25.000/30.000 sobre mismo café, resolver y recibir rama tardía | Ambas propuestas conservadas, conflicto/provisional, resolución nueva; reabre si corresponde |
| MOB-12 | Foto offline, cuota/error, reconectar con rechazo de imagen | Gasto intacto y único, imagen pendiente/reintentable por separado |
| MOB-13 | Salir con pendientes, iniciar otra cuenta, revocar desde otro equipo | Sin datos A en B; servidor niega revocado; propuesta copiable conservada |
| MOB-14 | Ofrecer actualización SW con borrador y operaciones pendientes | Aviso, decisión explícita, IDB conservada y envío original único después |
| MOB-15 | Borrar almacenamiento o cambiar origen con usuario sintético | Riesgo de identidad/datos perdido comunicado; no supuesta recuperación por nombre |
| MOB-16 | Openverse público con red real, error/429 y sin internet | Atribución/copia real si disponible; icono/foto local siempre accesibles |

Para cada caso guardar un resultado pequeño fuera de Git: SHA, pasos, esperado,
observado, duración, IDs sintéticos o comprobación del servidor sin credenciales.
No adjuntar bases Auth, fotografías originales, tokens o recibos privados a GitHub.
Si falla MOB-08/09/10/13/14 por pérdida/duplicación/aislamiento, bloquear piloto.
