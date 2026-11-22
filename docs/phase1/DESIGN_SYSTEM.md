# Sistema de diseño · Fase 1

Propuesta visual para revisión, basada en [UI_GUIDELINES](../UI_GUIDELINES.md). Archivo tangible de tokens/componentes: [styles.css](../../design/prototype/styles.css). No Tailwind, biblioteca de componentes, fuente remota ni animación decorativa.

## Identidad y jerarquía

Minimalismo cálido: fondo casi blanco, tipografía de sistema, acento verde oscuro y números protagonistas. Listas con separadores y agrupaciones por espacio; superficies rellenas reservadas para avisos, selecciones y campos. No una tarjeta por cada dato. El prototipo no inventa marca comercial: «Gastos compartidos» sigue siendo nombre temporal.

Inicio prioriza nombre → saldo propio → disponible y gasto de hoy → movimientos → Agregar gasto. En escritorio el contexto secundario de presupuesto/personas ocupa columna derecha. En móvil baja al final; no transforma Inicio en tablero con seis indicadores.

## Color y temas

| Token CSS | Claro | Oscuro | Uso |
| --- | --- | --- | --- |
| --bg | #F7F7F5 | #151816 | Fondo de aplicación |
| --surface | #FFFFFF | #1D211E | Campos, navegación, hoja |
| --ink | #181A19 | #F0F2ED | Información principal |
| --muted | #555B57 | #AEB8AF | Contexto con contraste comprobable |
| --accent | #146347 | #91D3AD | Acción primaria, selección, serie principal |
| --on-accent | #FFFFFF | #15291D | Texto sobre acento |
| --accent-soft | #EAF2ED | #263B2E | Selección/aviso informativo |
| --line | #DEDFD9 | #383F39 | Separadores decorativos |
| --control | #7E8981 | #78857B | Contorno identificable de campos |
| --danger | #A32222 | #FFB3AC | Error/acción destructiva con texto |
| --danger-soft | #FAEEEE | #3D2625 | Superficie de error |
| --warning | #795400 | #EBCA88 | Aviso con icono y explicación |
| --warning-soft | #FAF2DE | #3A3222 | Superficie de aviso |

La preferencia inicial sigue el sistema; el control de revisión alterna claro/oscuro sin cambiar datos. En producción, si se incorpora preferencia manual, usar Sistema/Claro/Oscuro y persistencia acotada. No se añade una pantalla de configuración completa al MVP para justificar el tema.

Se calculan contrastes de texto/superficie y campo/superficie en [revisión](REVIEW.md); separadores decorativos no cumplen el papel de borde de input. Los avisos no dependen únicamente del color. Disabled conserva texto legible y la causa visible.

## Tipografía

Familia: `-apple-system, BlinkMacSystemFont, Segoe UI, sans-serif`. Sin descarga de fuentes: comportamiento local y coherencia con plataforma.

| Nivel | Tamaño / altura aproximada | Peso | Uso |
| --- | --- | --- | --- |
| Saldo protagonista | 44 móvil / hasta 52 escritorio, adaptable | 600 | Un valor prioritario |
| Importe en formulario | 44–48 | 550 | Teclado numérico, COP visible |
| Título de pantalla | 30 móvil / 32 escritorio | 650 | Una idea por pantalla |
| Título de sección | 18–21 | 600–620 | Grupos por espacio |
| Cuerpo y inputs | 16 / 1,5 | 400–550 | Lectura y captura |
| Filas/acciones | 15 / 1,4–1,5 | 400–600 | Contenido operativo |
| Contexto | 13–14 / 1,5 | 400 | Fechas, autor, ayuda, cupo y estado pendiente por operación |
| Etiquetas mínimas | 12 | 400–600 | Metadatos muy breves y encabezados compactos |

Controles de revisión ajenos al producto pueden usar 11–13 px. No usar ese tamaño para importes de producto. Dígitos tabulares en importes; no truncar cifras ni esconder signo/moneda. `overflow-wrap` en valores largos y nombres completos. Con zoom o ancho pequeño, reflujo antes que reducir tipografía.

## Espaciado y geometría

Escala: 4, 8, 12, 16, 20, 24, 32, 40, 48 px. Padding principal móvil 24 px (18 en 320); escritorio 32–64. Separación de secciones 32. Campos 22–24. Icono a texto 8–14. Filas monetarias ≥64, cómodas para lectura. No aplicar la misma altura a todas las filas si un nombre requiere dos líneas.

Botones/targets previstos ≥44 px, controles de formulario 48, navegación inferior ~64 más safe area. Las cotas de CSS requieren validación de targets renderizados en navegador. Radios: campos 9, botones 10, selección/hoja 12–20 según función. Sombras solo en overlays/toast, no sobre todas las superficies. No degradados ni glassmorphism.

## Iconografía

Lucide 0.468.0, trazo coherente 2, sin emojis ni mezcla de familias. SVG locales, licencia conservada en [assets](../../design/prototype/assets/LUCIDE-LICENSE). Tamaños 16 en metadatos, 20–21 en acciones, 28–30 en ilustración mínima. Son decorativos si el texto ya dice lo mismo; un botón solo icono tiene nombre accesible y target 44. El prototipo distribuye un subconjunto estático, no una dependencia de producción.

## Componentes y estados

| Componente | Diseño y comportamiento |
| --- | --- |
| Botón primario | Una acción principal por grupo; acento sólido. Hover sutil, foco visible 3 px, pressed sin animación prolongada. Disabled explica por qué |
| Botón secundario | Superficie neutra, borde identificable; acciones reversibles o alternativas |
| Acción destructiva | Texto explícito «Eliminar», «Revocar» con confirmación; no solo papelera |
| Campo | Label persistente, ayuda asociada, teclado correcto y error inline; conservar entrada. Placeholder nunca sustituye label |
| Input dinero | Importe grande y moneda visible; unidades exactas. En COP no aceptar decimal/redondeo silencioso |
| Lista de movimientos | Icono, concepto, quién pagó/fecha, total y contexto. Toda la fila abre detalle; sin tarjetas repetidas |
| Persona/cuota | Avatar de iniciales, nombre, inclusión y valor. Checklist vertical para 2–10; no depender de avatares solos |
| Segmentado | Igual / Porcentajes / Importes, selección con semántica pressed; contenido operable con teclado nativo |
| Estado de sincronización | Icono+texto accionable hacia Actividad; no únicamente punto de color |
| Aviso | Fondo suave, icono, título y causa concreta; acción solo si resuelve algo |
| Hoja inferior | Menú, confirmación breve o elección de imagen. Un nivel; cerrar/atrás, Escape, foco contenido y retorno a control de origen |
| Formulario largo | Ruta completa con título/volver. Pagadores y reparto son rutas hijas del borrador; no modales sobre modales |
| Toast | Confirmación no exclusiva. Resultado también visible en lista/estado; no confiar en él para errores o información financiera |
| Tabla diaria | Inicial, Gastado, Propuesta con unidades. Sin bordes verticales; adaptar rótulos o agrupar por día a tamaño extremo, sin cortar dinero |
| Gráficas | Una serie de acento, contexto neutro, valores rotulados y tabla equivalente; no 10 colores para 10 personas |

`<dialog>` nativo en el prototipo facilita foco/Escape; la prueba en lector real sigue pendiente. Si se sustituye en producción, conservar esas garantías. El prototipo mantiene el foco principal tras navegación; no roba foco al teclear o actualizar una cuota.

## Responsive y teclado virtual

- **320–700 px**: una columna, padding 18–24, navegación inferior de 3 destinos. Agregar gasto en banda fija sobre ella, con variantes ancha/compacta; la zona de scroll reserva su altura y la de navegación mediante medición. Ausencia de solapes pendiente de validar en navegador. Formulario sin navegación fija ni botón flotante: guardado en flujo normal para evitar interferir con teclado.
- **701–1100 px**: barra lateral compacta, contenido refluye; columna secundaria se apila cuando no cabe.
- **>1100 px**: lateral de 236, contenido máximo 1060–1140. Inicio en dos columnas, formularios de máximo 740. No estirar inputs de importe a todo un monitor.
- **iPhone**: `viewport-fit=cover`, insets superior/inferior en elementos pegados al borde, no renderizar una barra de estado iOS falsa. Targets HTML funcionan también en Android.
- **Zoom 200% / texto mayor**: controles refluibles, sin alturas rígidas para texto de usuario, dinero/nombre no elididos. Validación física pendiente.
- **Reduced motion**: no animaciones decorativas; reducir desplazamientos/transformaciones. Skeleton estático durante carga lenta; no shimmer infinito.

## Microcopy y estados de confianza

| Estado | Mensaje y acción |
| --- | --- |
| Sin conexión | «Puedes seguir registrando»; actividad local disponible, cifras provisionales |
| Pendiente | Número de cambios y «esperan confirmación»; fotos separadas |
| Sincronizando | «Sincronizando» sin porcentaje inventado |
| Sincronizado | Confirmación conocida; no prometer todos los dispositivos actualizados |
| Error | Causa y propuesta conservada; reintentar o copiar |
| Conflicto | «Saldo provisional» + «Revisar versiones»; gasto fuera de subtotal |
| Datos incompletos | Explicar descarga incompleta; no usar cero como total real |
| Sin presupuesto | «Sin presupuesto» distinto de presupuesto cero |
| Sin gastos | Primera acción útil, sin cifras ficticias de producción |
| Cerrado | Consulta/historial; no nuevos movimientos |
| Imagen fallida | Importe guardado, miniatura pendiente; continuar |

## Pendiente para aprobación

Identidad/nombre, proveedor permanente, cupos manuales como reservas, cantidades específicas como extensión de contrato y política de incidencias después del cierre. El diseño evita convertir esas propuestas en garantías del backend. Ver [diferencias](SCOPE_RECONCILIATION.md) y [revisión](REVIEW.md).

## Ajustes de la revisión visual

Se conserva la paleta y se compara automáticamente con [la anterior](../../design/review/identity-baseline.json). Cupo y diferencia se añaden como contexto de «Gastado hoy»; detalles permanecen en Presupuesto. Categoría/fecha/nota se agrupan progresivamente y Cámara/Galería/Stock son elecciones independientes. Los estados de entrega tienen texto por operación. Ver [cambios y limitaciones](VISUAL_ADJUSTMENTS.md).
