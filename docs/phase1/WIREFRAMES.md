# Wireframes y especificación de pantallas

[Tablero de wireframes](../../design/wireframes.html) · [Prototipo visual](../../design/prototype/index.html) · [Flujos](USER_FLOWS.md) · [Sistema visual](DESIGN_SYSTEM.md).

El tablero tiene 23 pantallas y 22 muestras de estados/tamaños de grupo. Alterna marco móvil de 390 px y escritorio de 1280 px; cada marco usa el mismo layout responsive en gris. Son vistas HTML navegables, no capturas ni evidencia de renderizado automatizado. Abrir cada pantalla a tamaño real para evaluar tipografía e interacción. Los controles externos de escenarios no pertenecen al producto.

## Composición dominante de Inicio

```text
MÓVIL · 390 px
┌──────────────────────────────────┐
│ Mis viajes     Sincronizado    ···│
│                                  │
│ Villa de Leyva                   │
│ 21–24 nov · COP                   │
│                                  │
│ Te deben                         │
│ $20.000                          │
│ Has aportado más de tu parte     │
│ Ver balance ↗                    │
│ ──────────────────────────────── │
│ Disponible          Gastado hoy  │
│ $150.000            $250.000      │
│ de $400.000         Cupo $100.000 │
│                    Exceso $150.000│
│                                  │
│ Movimientos                      │
│ Abono Bruno → Ana       $15.000  │
│ Almuerzo                $96.000  │
│ Mercado                 $84.000  │
│ Gasolina                $70.000  │
│       [ + Agregar gasto ]        │
│ Inicio      Balance    Actividad │
└──────────────────────────────────┘

ESCRITORIO · 1280 px
┌──────────────┬────────────────────────────────────────────┐
│ Gastos       │ Mis viajes / Villa de Leyva  Estado   ···  │
│ compartidos  ├────────────────────────────────────────────┤
│              │ Villa de Leyva            [Agregar gasto] │
│ Inicio       │                                            │
│ Balance      │ Te deben              Presupuesto          │
│ Actividad    │ $20.000               Uso y disponible     │
│ ───────────  │                                            │
│ Presupuesto  │ Disponible / Hoy      Personas             │
│ Estadísticas │                                            │
│ Personas     │ Movimientos           Contexto secundario  │
│ Resumen      │                                            │
│              │                                            │
│ Mis viajes   │                                            │
│ Ana          │                                            │
└──────────────┴────────────────────────────────────────────┘
```

El ejemplo ilustra jerarquía, no exige encajar todos los movimientos sin scroll en cualquier dispositivo. La variante fija reserva una banda entre el contenido desplazable y la navegación. La geometría para evitar solapes debe confirmarse en navegador; la estructura y los estilos están comprobados sin renderizado real. Formulario de gasto usa ruta completa con guardado en flujo normal al mostrar teclado.

## Inventario y aceptación por pantalla

| ID | Pantalla / orden de contenido | Acción y destino | Estados esenciales |
| --- | --- | --- | --- |
| A1 | Bienvenida: propósito breve y dos entradas | Crear cuenta / Unirme | Sin red: funciones locales requieren viaje previo |
| A2 | Crear cuenta: nombre, correo, contraseña | Crear → A5 | Validación, error de Auth, conexión requerida |
| A3 | Login: correo/contraseña y recuperación | Entrar → B; recuperar → A4 | Credenciales inválidas y sin conexión |
| A4 | Recuperación: correo, mensaje neutro | Enviar enlace | Loading/envío/error sin enumerar cuentas |
| A5 | Verificación: correo pendiente, reenvío | Verificado → B | Espera, reenvío, correo no recibido |
| A6 | Invitado: QR/código completo, nombre, advertencia | Entrar → D tras validación | Expirada/revocada, completo, cámara denegada, offline |
| B | Viaje actual, otros activos, finalizados | Abrir / Crear → C | Sin viajes, esperando participantes, carga parcial |
| C | Título/destino, fechas, moneda/zona, presupuesto, personas/portada opcionales | Crear → J | Inválido, offline, un organizador al inicio |
| D | Nombre, saldo, disponible/hoy, cronología | Agregar → E; abrir fila → detalle | Vacío, offline, pendiente, conflicto, cerrado, largo |
| E | Concepto, importe, pagadores/reparto, categoría, detalles progresivos | Guardar → D | Inválido, error de guardado, borrador, foto fallida |
| F1 | Modo, personas, inclusión, cuotas, total/diferencia | Aplicar → E | 0 participantes, 99,99%, 100,01%, cuotas no suman |
| F2 | Pagadores e importes, aportado/total | Aplicar → E | Suma incorrecta; pagar independiente de consumir |
| Detalle | Concepto/total, pagadores, cuotas, nota/imagen, auditoría | Editar → E / Eliminar confirmado | Eliminado, restaurable, merged, versiones simultáneas |
| G1 | Saldo propio, personas, pagos sugeridos, historial | Registrar → G2 | Cero, provisional, datos parciales, personas revocadas |
| G2 | Origen, destino, monto, nota | Registrar → G1 | Mismo origen/destino, parcial, sobrepago advertido |
| H1 | Disponible, total/usado, días, propuesta | Ajustar → H2 | Sin presupuesto, cero, exceso, reservas, conflicto |
| H2 | Total opcional, cupos diarios | Guardar → H1 | Solo propietario, reserva excesiva, sin días futuros |
| I | Total, categoría, día, pagado por persona, evolución | Tablas de valores | Sin datos, provisional, largo y futuro sin inventar |
| J | Ocupación/personas, QR/código, vigencia | Copiar / Revocar / Generar | 10 personas, offline, invitación inválida, rol invitado |
| K1 | Estado, pendientes monetarios/adjuntos, errores, historial | Sync / comparar / copiar propuesta | Los seis estados de sincronización y caché parcial |
| K2 | Dos propuestas comparadas sin selección inicial | Elegir/corregir y confirmar | Provisional, rama tardía, cerrado sin excepción aprobada |
| K3 | Dos registros similares con contexto | Distintos / Unificar confirmado | Ambos cuentan antes; uno después; historial íntegro |
| L | Costo, presupuesto, deudas, personas y advertencia de cierre | Finalizar / consultar cerrado | Offline/pendientes/conflictos bloquean; deuda permitida |

## Hojas y diálogos

- Más opciones: destinos secundarios, sin abrir otra hoja encima.
- Eliminar gasto: «Eliminar y conservar historial» y «Conservar gasto».
- Revocar invitación: explicar que miembros existentes conservan acceso.
- Finalizar: advertencia de dispositivos sin conexión y deudas conservadas.
- Abono superior a sugerencia: confirmar hecho real, no bloquearlo por saldo provisional.
- Salir del borrador: conservar en memoria en este prototipo o continuar editando.
- Imagen: cámara/galería y búsqueda abierta simuladas; no solicitar permisos reales ni fingir resultados de API.

Reparto, pagadores y presupuesto son rutas, no hojas anidadas. La tecla Escape/cierre devuelve foco; falta validación física con teclado/lector.

## Cobertura adicional y límites

El prototipo incluye los recorridos dominantes y estados transversales; no es una simulación exhaustiva de todos los errores Firebase. Expulsión/reasignación de identidad, error de Auth específico, conflictos de más de dos cabezas y pares de merge distribuidos se especifican en flujos/matriz, sin implementar servicios. Estadísticas y gráficas son derivadas del fixture; la evolución acumulada usa las fechas de viaje y el gasto conocido; el renderizado y la legibilidad a tamaños extremos siguen pendientes.

No se usa una imagen decorativa para aprobar el gasto: el prototipo permite continuar sin ella. La portada no es requisito de creación. QR de ejemplo apunta a `example.invalid` y se etiqueta como no operativo.

Aprobación solicitada sobre composición, navegación, captura, reparto, modo oscuro y estados financieros. Backend, instalación PWA y sincronización real permanecen fuera de Fase 1.

## Ajuste solicitado tras revisar la composición

El tablero sigue usando estas 23 pantallas. Inicio añade contexto de cupo/exceso sin nuevas tarjetas; Presupuesto muestra asignado/gastado/diferencia y redistribución; Balance conserva ambos pagos sugeridos; Actividad identifica operaciones por nombre y entrega. El selector «Botón Agregar gasto» compara las dos variantes fijas. La nueva [ilustración de presupuesto](../../design/review/budget-composition.png) es una referencia adicional, sin captura real. Detalles en [ajustes visuales](VISUAL_ADJUSTMENTS.md).
