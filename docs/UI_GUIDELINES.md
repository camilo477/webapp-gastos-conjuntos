# UX y guía visual

Documento de Fase 0. Define comportamiento para los wireframes de Fase 1; **no es un diseño visual aprobado**. Nombre de trabajo: «Gastos compartidos», sin identidad final.

## Principios y tokens propuestos

Inspiración iOS: tipografía de sistema, aire, listas con separadores, números protagonistas y una acción principal por pantalla. Sin gamificación ni funciones sociales. Iconos consistentes Lucide o equivalentes locales; no añadir fotografías decorativas dependientes de red.

| Token | Propuesta inicial |
| --- | --- |
| Fondo / superficie | `#F7F7F5` / `#FFFFFF` |
| Texto principal / secundario | `#181A19` / `#555B57` |
| Acento único | Verde oscuro `#146347` |
| Error / aviso | `#A32222` / `#795400`, siempre con texto e icono |
| Espaciado | Base 4 px: 4, 8, 12, 16, 24, 32 |
| Tipografía | Sistema; cuerpo ≥16 px; cifras principales 32–40 px y dígitos tabulares |
| Interacción | Targets ≥44×44 px, foco visible, safe areas iOS |

Los colores se verifican con sus combinaciones reales antes de aprobar diseño. Criterio: contraste AA para texto normal 4,5:1, texto grande 3:1; controles y foco distinguibles. No usar transparencia para rebajar el contraste de información relevante. Cifras grandes se adaptan a importes largos y zoom 200% sin truncar dinero.

## Navegación y capturas rápidas

Entrada → elegir/crear viaje o unirse → inicio del viaje. Navegación principal del viaje: Inicio, Balance y Actividad; Personas, Presupuesto, Estadísticas y Resumen desde menú contextual visible. En escritorio, navegación lateral y contenido con ancho contenido; mismas rutas, sin funciones escondidas solo para móvil.

Agregar gasto desde inicio: «+ Gasto» fijo respetando teclado/safe areas → título e importe → guardar con valores predeterminados visibles. Defaults: quien registra paga, categoría Other, ahora en zona del viaje y reparto igual entre activos. Antes de guardar se ve «Paga Ana · Entre 3 · Partes iguales». Pagadores, exclusiones, porcentajes, nota e imagen son secciones progresivas en la misma ruta, sin modales anidados. Confirmar guardado local incluso offline. No imponer foto ni nota.

Si la persona no puede pagar o el viaje está cerrado, el botón explica la causa. Al salir con formulario modificado, conservar borrador o confirmar descarte. Cambiar pagadores no cambia reparto automáticamente; cualquier diferencia entre aportes y total se muestra en unidades exactas.

## Pantallas y estados requeridos

| Pantalla | Contenido y acción principal | Estados/errores específicos |
| --- | --- | --- |
| 1. Bienvenida/acceso | Organizador: correo, contraseña y recuperación. Invitado: enlace/QR/código y nombre | Auth cargando, error, offline, aviso de acceso anónimo, cámara denegada con alternativa pegar código |
| 2. Viajes | Activo destacado, otros activos, historial de cerrados; crear | Sin viajes, esperando participantes, carga, caché parcial, invitación aceptada |
| 3. Inicio | Gasto de hoy, disponible, estado de saldo, cronología por día; + Gasto | Sin gastos, sin presupuesto, pendiente, offline, error y provisional con enlace a causa |
| 4. Gasto nuevo/editar | Título, monto, resumen pagadores/reparto; campos progresivos | Total inválido, suma de aportes incorrecta, porcentaje 99,99%, excluidos, miembro revocado, cambios en conflicto |
| 5. Detalle/auditoría | Total, aportes, cuotas, notas, autor, imagen y cambios | Eliminado, unificado con enlace al superviviente, adjunto pendiente, varias propuestas comparables |
| 6. Personas/invitar | Lista de personas, rol/acceso, QR y código completo; compartir/copy | Invitación caducada/revocada, 10 cupos, necesidad de conexión, revocación, reasignación explícita |
| 7. Presupuesto | Total, cupo/gasto por fecha, reservas manuales, proyección mañana | Sin presupuesto, déficit, reserva imposible, fin de viaje, presupuesto provisional |
| 8. Balance/abonos | «Debes»/«Te deben», pagado y consumido; registrar abono | Saldo cero, pago parcial, adelanto advertido, personas históricas, liquidación provisional |
| 9. Estadísticas | Día, categoría, pagado/consumido por persona; tabla accesible | Sin datos, filtros vacíos, conjunto parcial/conflictivo señalado |
| 10. Actividad/sync | Pendientes y errores, historial, comparar/resolver, sincronizar ahora | Ramas tardías, duplicados, upload rechazado, falta acceso, cuota agotada |
| 11. Resumen/cierre | Costo, presupuesto, personas, deudas y avisos; cerrar por owner | Deudas permitidas con aviso; conflictos conocidos bloquean; colas remotas desconocidas; cerrado consultable |

No se debe mostrar carga infinita cuando se sabe que no hay red. Vacíos explican qué falta y ofrecen acción útil; nunca fabrican participantes ni datos de ejemplo en producción.

## Lenguaje de estados

- «Sincronizado»: servidor confirmó operaciones locales y conjunto conocido consistente. No promete que otros dispositivos ya lo descargaron.
- «Sin conexión · datos guardados hasta …»: navegación local disponible; usar etiqueta provisional cuando dependa de actualidad remota.
- «2 cambios pendientes»: operaciones monetarias; adjuntos tienen contador independiente.
- «No se pudo sincronizar»: motivo concreto y reintento/copia local; no desaparecer operación.
- «Conflicto en 1 gasto · saldo provisional»: entrar a comparar propuestas con autor y cambios, sin selección automática silenciosa.
- «Datos incompletos»: caché parcial; no presentar cero como total real.
- «Viaje finalizado»: consulta e historial; movimientos nuevos no habilitados.

Mensajes críticos: «Borrar los datos de este navegador o usar otro dispositivo puede hacerte perder el acceso. El organizador puede invitarte de nuevo.»; «Guardamos una miniatura, no la fotografía original.»; «Cerrar no comprueba los cambios que otros dispositivos aún tienen sin conexión.»

## Accesibilidad, móvil y escritorio

Labels persistentes, errores junto al campo y resumen enfocable al enviar; `inputmode` numérico/decimal según moneda. No usar color como única distinción de deuda, estado o categoría. Lectores de pantalla anuncian importe y moneda, pendientes sin interrupciones excesivas y resultado de guardado. Gráficas siempre tienen equivalente tabular. Respetar reduced-motion y teclado completo.

Wireframes en 390 px y 1280 px, comprobación adicional a 320 px; no asumir un modelo concreto de teléfono. Evitar scroll horizontal en formularios y saldos. Una lista cronológica usa agrupaciones por espacio y divisores; no requiere tarjeta/sombra para cada fila.

## Salida de Fase 1

Entregar wireframes de estas 11 pantallas, flujo de captura rápida, editar/repartir, unión, duplicado/conflicto y cierre; variantes móvil/escritorio, estados transversales y anotaciones de interacción. Recorrer al menos alta de gasto igualitario, pagadores múltiples, offline/reconexión y conflicto. Validar accesibilidad básica y solicitar aprobación visual sobre esos entregables concretos antes de escribir la aplicación. No solicitar aprobación de código que aún no existe.
