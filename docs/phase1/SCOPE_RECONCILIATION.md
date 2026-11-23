# Fase 1: alcance, diferencias y decisiones

Actualización 2026-11-22: el usuario aceptó provisionalmente Fase 1 y autorizó
Fase 2. El alcance y las propuestas siguientes se conservan como registro de
diseño; no ratifican el motor ni sus contratos pendientes. La prohibición histórica
de avanzar queda sustituida por esa autorización explícita.

Fuente: petición de Fase 1, README y todos los documentos de Fase 0, incluido el plan original. Se conserva el original sin modificaciones. Este documento precede al prototipo y explica las diferencias que afectan su diseño.

## Orden de decisión

La petición actual define el entregable de diseño. Se mantienen los contratos de Fase 0 salvo las ampliaciones explícitas siguientes. El prototipo es un instrumento de revisión con datos ficticios y estado en memoria: no implementa Firebase, autenticación, almacenamiento durable, conciliación distribuida ni una PWA instalable. Aprobarlo visualmente no valida esas garantías.

| ID | Diferencia o tensión | Solución propuesta para el diseño | Impacto posterior |
| --- | --- | --- | --- |
| UX-D01 | Se solicitan cantidades específicas; DATA_MODEL/CALCULATION_RULES solo definen equal/percentage | Añadir tercer modo «Importes»: cuotas enteras introducidas directamente, total asignado y diferencia siempre visibles. No convertir a porcentajes: 34/33/33 no conserva fielmente cualquier asignación al cambiar total. Cambio de modo explícito y reversible mientras se edita | Extensión propuesta splitMode=fixed, shareAmounts como entradas exactas y weights vacío; actualizar contrato, reglas y tests antes de implementar Fase 3. No modificar silenciosamente esquema v1 |
| UX-D02 | Crear viaje pide participantes, pero el acceso exige ingreso autenticado online | Mostrar organizador como primera persona y explicar «Invita al resto después de crear». Pantalla siguiente ofrece enlace/QR; no se crean identidades por teclear nombres | Reutiliza D-07/D-14/D-18; límite 10 incluye organizador |
| UX-D03 | Se pide claro/oscuro; Fase 0 solo concreta paleta clara | Añadir tokens oscuros equivalentes y preferencia de sistema con override de revisión | Ampliación visual autorizada, sin cambio contable |
| UX-D04 | Se solicita navegación inferior/hojas cuando ayuden; guía propone tres destinos | Mantener Inicio, Balance, Actividad. Acceso visible «Más» en cabecera abre una hoja con Personas, Presupuesto, Estadísticas y Resumen. Formularios largos ocupan ruta propia; no hay hojas anidadas | Misma arquitectura de información móvil/escritorio |
| UX-D05 | Cierre definitivo frente a incidencias tardías, pendiente D-13 | Cierre exige conexión y no tener pendientes propios, datos incompletos ni conflictos conocidos. Mostrar advertencia de otros dispositivos. Resumen tardíamente conflictivo es provisional; no diseñar reapertura ni resolución en cerrado como ya autorizada | D-13 sigue pendiente antes de reglas de Fase 4 |
| UX-D06 | Se pide «a quién debe pagar» pero las deudas se derivan de saldos agregados | Etiquetar «Pagos sugeridos», mostrar origen/destino/importe y distinguirlos del historial de abonos | No afirmar relación de deuda bancaria ni ejecutar pagos reales |
| UX-D07 | Presupuesto inicial diario y redistribuido podrían confundirse | Separar «Inicial», «Gastado» y «Propuesta restante»; reserva manual tiene icono/texto «Fijo» | Sigue D-10 como propuesta, no nueva regla automática |
| UX-D08 | Prototipo de QR/offline puede confundirse con integración real | Banda externa permanente «Prototipo · datos de ejemplo»; QR de demostración rotulado, estados de red seleccionados desde controles de revisión | No solicitar cámara real ni prometer sync/offline durable |

## Decisiones vigentes para dibujar, sin ratificación implícita

- Nombre temporal «Gastos compartidos»; sin nueva marca inventada.
- Cuenta organizador por correo/contraseña y recuperación, con estado de verificación. Sigue pendiente elegir proveedor definitivo (D-03).
- COP como fixture, importes enteros; elección de moneda/zona al crear, fijas después según D-15. USD/EUR permanecen propuestas.
- Invitaciones largas de alta entropía, no código corto decorativo. El invitado solo ve nombre del viaje después de incorporarse; antes se pide código/nombre sin filtrar datos privados.
- Presupuesto administrado por organizador; los cupos manuales se reservan y no bloquean registrar gastos.
- Fotos opcionales, miniatura y atribución; fallo visual independiente del gasto. Retención/cuota siguen pendientes.
- Deudas al cerrar permitidas con confirmación; conflictos conocidos bloquean. Incidencias tardías no tienen permiso de reapertura asumido.

## Límites que atraviesan todas las pantallas

Entre 2 y 10 personas, pudiendo crear con una persona y esperar. Personas revocadas conservan identidad/historia contable. Dinero/saldos no se editan como totales independientes. Dos compras con mismo nombre pueden ser legítimas. Borrar siempre es lógico y visible en auditoría. Offline permite operaciones locales solo sobre viajes descargados; incorporación, administración de acceso y cierre requieren red. Caché incompleto y conflicto producen cifras provisionales; una imagen fallida no borra dinero.

## Puerta de salida

Esta fase queda lista para revisión cuando se entreguen flujos, wireframes de A–L y detalle/auditoría, sistema de diseño claro/oscuro, estados y prototipo navegable comprobado. La aprobación visual del usuario sigue pendiente hasta que revise esos entregables. No iniciar la Fase 2 ni presentar hipótesis técnicas como implementadas.
