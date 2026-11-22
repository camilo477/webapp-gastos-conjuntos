# Servicios, límites y fuentes

Consulta documental: 2026-11-21. Las cifras describen documentación consultada, no una inspección de un proyecto Firebase del usuario. Revalidar antes de configurar y desplegar; no hay proyecto, región ni billing comprobados. No se habilitó facturación.

## Firestore Standard

| Concepto | Valor publicado |
| --- | --- |
| Almacenamiento gratuito | 1 GiB |
| Lecturas / escrituras / borrados | 50.000 / 20.000 / 20.000 al día |
| Transferencia saliente | 10 GiB al mes |
| Documento máximo | 1 MiB |
| Base de datos con cuota gratuita | Una por proyecto |
| Evaluación de reglas | 10 accesos por operación; 20 por operación atómica compuesta, manteniendo límite individual; 1.000 expresiones |

TTL, backups/PITR y funciones de restauración no forman parte de la cuota gratuita. No usarlos para caducar invitaciones. Índices y documentos históricos también consumen recursos. Fuente: [cuotas oficiales](https://firebase.google.com/docs/firestore/quotas).

La persistencia web debe configurarse, no se activa por defecto. Caché y multitab requieren compatibilidad del navegador; no se eliminan automáticamente al salir. Varias escrituras al mismo documento se resuelven con last-write-wins. Esta es la razón de diseñar eventos independientes: [persistencia offline](https://firebase.google.com/docs/firestore/manage-data/enable-offline).

Las transacciones requieren conexión; batches pueden encolarse offline y ser validados al volver. `getAfter` permite comprobar conjuntos atómicos: [transacciones y batches](https://firebase.google.com/docs/firestore/manage-data/transactions). Las reglas no son filtros de consultas, tienen funciones acotadas y no recorren un registro entero: [condiciones de seguridad](https://firebase.google.com/docs/firestore/security/rules-conditions).

Las comprobaciones de campos específicos y tipos no equivalen a validar automáticamente todos los elementos de una lista: [validación de campos](https://firebase.google.com/docs/firestore/security/rules-fields). El control real necesita emuladores: [pruebas de reglas](https://firebase.google.com/docs/firestore/security/test-rules-emulator).

Estimación propia, sin overhead: 1.000 miniaturas ×40.960 bytes ≈39,1 MiB; 10.000 ≈390,6 MiB. A esto se suman eventos, metadata e índices. No equivale a capacidad efectiva garantizada de Spark. Descargar todos los eventos de un viaje en diez dispositivos multiplica lecturas; medir reconexiones y lecturas de reglas. No incluir bytes de fotos en las suscripciones del registro financiero.

## Auth

Auth anónima proporciona UID sin correo y permite vinculación futura de credenciales; no recupera una identidad cuya sesión local se perdió: [anónimos web](https://firebase.google.com/docs/auth/web/anonymous-auth). Persistencia de sesión y persistencia de datos son mecanismos distintos: [persistencia de Auth](https://firebase.google.com/docs/auth/web/auth-state-persistence).

La página de límites publica 100 cuentas nuevas/hora/IP y 150 correos de recuperación/día en Spark; pueden afectar un grupo bajo la misma red. Los límites de usuarios diarios de Identity Platform dependen de esa configuración y no deben atribuirse sin más a cualquier proyecto Auth. No habilitar Identity Platform por suposición. Fuente: [límites de Authentication](https://firebase.google.com/docs/auth/limits).

## Fotos y hosting

Cloud Storage for Firebase exige Blaze desde el cambio efectivo en febrero de 2026. El MVP no depende de él; usa miniaturas en Firestore: [requisitos de Storage](https://firebase.google.com/docs/storage/faqs-storage-changes-announced-sept-2024).

Hosting publica 10 GB de almacenamiento y 10 GB/mes de transferencia sin costo. En Spark, exceder almacenamiento impide nuevos despliegues; exceder transferencia puede suspender el sitio tras período de gracia. Retener releases también consume almacenamiento. Firebase Hosting y Cloud Storage son servicios diferentes: [límites de Hosting](https://firebase.google.com/docs/hosting/usage-quotas-pricing).

## Openverse

La documentación oficial describe consultas anónimas sin credenciales y respuestas 429 con límites indicados en headers. No fijar una cuota anónima numérica sin comprobar headers reales de esa integración. Usar debounce, consultas explícitas, páginas pequeñas y cache de resultados; nunca incluir un client_secret en frontend. Fuentes: [API](https://api.openverse.org/v1/), [cliente oficial](https://docs.openverse.org/packages/js/api_client/index.html).

La apertura directa del endpoint mediante la herramienta de consulta devolvió 403 durante esta revisión; la descripción oficial fue accesible mediante búsqueda. No se probó una búsqueda desde el navegador de la futura app, ni CORS de miniaturas. Por tanto disponibilidad práctica, restricciones y carga/canvas de imágenes siguen pendientes de IMG-04/05; no se presentan como integración validada.

Cada resultado conserva licencia y procedencia. Una URL de thumbnail no garantiza acceso offline ni permiso para cualquier reutilización. Usar inicialmente filtros conservadores CC0/CC BY, conservar atribución y modificación de miniatura; otras licencias requieren que UI/flujo puedan cumplir sus condiciones. No se ofrece asesoría legal ni se verifica autoría solo por aparecer en el buscador. Consultar [términos oficiales de Openverse](https://docs.openverse.org/terms_of_service.html).

## Pendientes operativos

Antes de producción: proyecto de pruebas, región Firestore elegida conscientemente, métodos Auth, dominios autorizados, cuota real observada, reglas e índices compilados, límites de fotos y responsables de mantenimiento. CI debe usar datos sintéticos y emuladores; no guardar cuentas de servicio en el repositorio. Para Raspberry verificar HTTPS, SPA fallback, caché/origen, autorización Firebase y advertencia de identidad anónima al cambiar dominio.
