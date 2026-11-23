# Preparación de despliegue · no ejecutar en Fase 8A

Este es un procedimiento futuro, sujeto a autorización nueva. No se creó ningún
proyecto Firebase real ni se conectó o desplegó la aplicación. No se habilita Blaze,
Storage, Functions, App Hosting ni un servicio de pago. Publicar fuentes en GitHub
no constituye despliegue del frontend. Consultar la [checklist](RELEASE_CHECKLIST.md).

## Puerta técnica previa

El código actual **rechaza Firebase productivo deliberadamente**. Cambiar .env no
lo habilita: config.ts permite demo o demo-/loopback; client.ts conecta emuladores;
joinTrip, persistOperations y sendAttachment construyen endpoints REST HTTP locales.
firebase.json todavía no contiene Hosting. No utilizar este build como app productiva
ni reemplazar hosts/puertos mediante sustituciones de texto.

Una futura implementación debe introducir una selección explícita y validada del
entorno: demo, laboratorio y producción. La configuración productiva requiere SDK
sin connect*Emulator y REST HTTPS de Firestore, conservando create-only, token del
usuario, IDs, transforms, read-back, grupos atómicos y ambos coordinadores. Probar
que un build nunca mezcla Auth real con Firestore local ni viceversa. La partición
IDB por proyecto/UID debe mantenerse. No copiar datos o sesiones de emuladores.

## Proyecto y acceso

1. Elegir responsable, cuenta administradora con segundo factor y recuperación
   protegida. Crear un proyecto independiente de los demo-, mantener plan Spark
   y verificar que no tenga cuenta de facturación vinculada. No aceptar upgrades
   automáticos sugeridos por consola. [Planes oficiales](https://firebase.google.com/docs/projects/billing/firebase-pricing-plans).
2. Registrar una app web. Su configuración SDK es pública; no es una credencial
   administradora. No incluir claves privadas, service accounts, refresh tokens o
   credenciales de CLI en VITE_ ni en Git. Revisar restricciones de API key y el
   entorno en el pipeline futuro. [Configuración web](https://firebase.google.com/docs/web/setup).
3. Activar Email/Password y Anonymous Auth; mantener propietario permanente con
   correo verificado. No habilitar teléfono, proveedores nuevos ni Identity Platform
   por suposición. Configurar los dominios exactos del frontend, correo de soporte,
   plantillas y enlaces de verificación/reset. Probar correo real y caducidad en un
   piloto autorizado; el emulador no los certifica. [Auth web](https://firebase.google.com/docs/auth/web/start).
4. Elegir conscientemente ubicación de la única base gratuita, cercana a usuarios
   y adecuada para sus datos. Medir latencia y registrar decisión antes de crear:
   la ubicación de una base existente no se cambia. No suponer que la ubicación de
   Raspberry determina la de Firestore. [Ubicaciones](https://firebase.google.com/docs/firestore/locations).

## Firestore, reglas e índices

Crear Firestore Standard con denegación inicial, sin modo de prueba público.
Revisar las mismas firestore.rules e índices versionados contra el SHA aprobado;
antes de abrir clientes, desplegar reglas/índices con proyecto explícito y verificar
en consola el destino. No cambiar .firebaserc (actualmente demo-) silenciosamente.
Los comandos siguientes son **solo referencia futura**, no ejecutados aquí:

```text
firebase deploy --only firestore:rules,firestore:indexes --project ID_APROBADO
```

Conservar exenciones de índices para attachments.bytes y attribution. La consulta
array-contains de activeUids y las lecturas de eventos usan índices simples; no se
necesitan nuevos índices compuestos actualmente. Ningún SDK Admin en navegador.
Validar con dos usuarios ordinarios y un tercero ajeno: lectura privada, revocación,
autor, payload, inmutabilidad, presupuesto owner y merge atómico. Rules no certifica
restos mayores, IANA, cabezas globales, legibilidad o titularidad de una imagen:
esas fronteras siguen documentadas en SECURITY_RULES. No presentar validación del
cliente como garantía del servidor. [Pruebas de reglas](https://firebase.google.com/docs/firestore/security/test-rules-emulator).

## Frontend en Firebase Hosting

Usar Hosting estático, diferente de App Hosting. Después de implementar/verificar el
adaptador productivo, construir el SHA aprobado con npm ci, npm run check y las
suites reales. Revisar dist y guardar SHA/checksum de ese artefacto. Añadir entonces
configuración Hosting con public:dist, rewrites SPA a /index.html, exclusión de
fuentes, .env, logs y dependencias. Firebase Hosting proporciona HTTPS; validar dominio
y rutas profundas. [Guía de Hosting](https://firebase.google.com/docs/hosting/quickstart).

Política propuesta a probar antes de activar: HTML, sw.js y registro SW sin caché
larga; assets con hash con caché immutable; manifiesto con revalidación. No cachear
Auth, Firestore, tokens, colas ni miniaturas privadas en SW/CDN. El worker conserva
solo shell público y la activación sigue esperando IDB; no borrar almacenes para
forzar una actualización. No servir una versión vieja de un lector que no entienda
contratos/acciones ya publicados.

Definir headers en el hosting elegido y probarlos, sin prometer una CSP ya validada:
nosniff, referrer-policy:no-referrer, frame-ancestors 'none', microphone=(), cámara
solo self y CSP con script/worker self; permitir exclusivamente los endpoints SDK/
Firestore/Auth y Openverse requeridos. Imágenes necesitan blob:/data: para miniaturas
y QR; CSS actual contiene estilos inline. Probar cámara, SDK y SW con la política
antes de imponerla. HTTPS/HSTS solo después de comprobar certificados y renovación.

## Frontend futuro en Raspberry Pi

Raspberry sirve únicamente dist estático; Firestore/Auth siguen en Firebase. No
exponer emuladores ni ejecutar credenciales administradoras en el servidor web.
Preparar sistema mantenido, usuario de servicio sin privilegios, firewall, dominio,
certificado válido y renovación supervisada; utilizar Nginx/Caddy instalado de
fuente oficial. No hace falta ejecutar Vite DEV o Node para servir el build.

Ejemplo orientativo del bloque estático de Nginx, pendiente de adaptar a HTTPS,
permisos y headers del equipo real (no aplicado en esta fase):

```nginx
root /srv/gastos/current;
location / { try_files $uri $uri/ /index.html; }
location = /sw.js { add_header Cache-Control "no-cache"; }
location = /index.html { add_header Cache-Control "no-cache"; }
location /assets/ { add_header Cache-Control "public, max-age=31536000, immutable"; }
```

Publicar directorios de release inmutables y cambiar current atómicamente solo
cuando rutas/headers/checksums se hayan comprobado. Conservar release anterior
compatible para rollback. Un apagón de Raspberry afecta nuevas cargas del frontend;
no debe mover ni reescribir el registro financiero. Registrar DNS, responsable,
alimentación y recuperación del equipo. **El origen estable importa:** cambiar
esquema/host/puerto no migra Auth ni IndexedDB; invitados pueden perder su UID.
Avisar y preparar un procedimiento autorizado de acceso antes de migrar.

## Cuotas y operación gratuita

Valores oficiales consultados el 2026-11-23, a revalidar al activar: Firestore una
base gratuita, 1 GiB almacenado, 50.000 lecturas/día, 20.000 escrituras/día y 10 GiB
salientes/mes. Historia/índices/fotos comparten cuota. 1.000 fotos de 40 KiB son
39,06 MiB solo de bytes; diez descargas completas serían 10.000 lecturas de imagen
y ~390,63 MiB, más eventos y protocolo. [Cuotas Firestore](https://firebase.google.com/docs/firestore/quotas).

Hosting ofrece 10 GB almacenados y 10 GB/mes transferidos; versiones retenidas
consumen almacenamiento y agotar transferencia en Spark puede suspender el sitio.
Reducir lecturas/repeticiones; no borrar historial para liberar cuota.
[Cuotas Hosting](https://firebase.google.com/docs/hosting/usage-quotas-pricing).
Auth publica límites como 100 altas/hora/IP y 150 reset emails/día en Spark:
probar grupos en una misma red. [Límites Auth](https://firebase.google.com/docs/auth/limits).

Designar revisión de uso y respuesta a cuotas: pausar nuevas invitaciones/fotos
mediante un mecanismo futuro auditado si resulta necesario; conservar propuestas
locales y comunicar falta de confirmación. No prometer gratuidad indefinida, rate
limiting fuerte desde cliente ni alertas de facturación como barrera de gasto.

## Recuperación, incidentes y actualizaciones

Ante error: identificar proyecto/SHA, conservar colas y registro, retirar acceso
comprometido e invitaciones y corregir mediante revisiones; jamás limpiar IDB o
reenviar con IDs nuevos. Rollback del frontend solo a una versión compatible con
los eventos publicados; rollback no revierte dinero ni recupera borrados Admin.
No exportar tokens o datos privados a incidencias públicas o artefactos de CI.

PITR/backups/restores gestionados no están incluidos en la cuota gratuita y no se
activan aquí. Actualmente no hay backup productivo independiente verificado; la
copia IDB tampoco lo es. Antes de un lanzamiento debe ratificarse el nivel de
recuperación aceptable y un procedimiento gratuito/autorizado que realmente se
pruebe, o aceptar explícitamente esa limitación. Sin copia independiente no se
garantiza recuperación tras borrado administrativo o pérdida de identidad anónima.
Fuente: [funciones sin cuota gratuita](https://firebase.google.com/docs/firestore/quotas#free-quota).

Fase 8B recomendada: piloto privado autorizado, primero QA física y validación de
esta checklist, después conexión real y despliegue solo con autorización explícita.
