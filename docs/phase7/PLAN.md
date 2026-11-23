# Fase 7 · Plan previo y fronteras

Base main limpia y publicada verificada por SHA remoto:
926aef92b9d1820f913252001c3d424893dc5d6f. Autorización expresa del usuario.
Leídos documentos requeridos e inspeccionados contratos v2, reglas, IndexedDB,
coordinador, formularios, vistas, SW y suites. Sin modificaciones ajenas.

- Mantener motor y eventos v2. Habilitar sus referencias visual/attachmentId sin
  insertar bytes en eventos, before, listeners financieros ni caché del SW.
- Módulo attachments separado: contratos, procesamiento WebP, Openverse, cámara,
  repositorio remoto, entrega local y presentación bajo demanda. Sin dependencias
  nuevas, Storage, Functions, backend, facturación ni conexión Firebase productiva.
- Usar exactamente el documento attachment v1 previsto. Autor autenticado y raíz
  expense del mismo viaje comprobados por reglas; Bytes.size real ≤40960 y metadatos
  acotados. No update/delete. La imagen no requiere alterar dinero ni resolver DAG.
- Persistencia IndexedDB existente, con migración aditiva para adjuntos y caché
  por proyecto/UID/viaje/ID. Confirmación, errores y leases de imagen independientes.
  El evento se guarda primero: un error al persistir/subir bytes nunca aborta el
  gasto ya durable; conservar imagen visible para reintento o continuar sin ella.
- Enviar imágenes solo después de confirmar la revisión financiera, con ID fijo,
  REST create-only, readback e integridad. Una respuesta tardía solo cambia entrega
  del adjunto; nunca escribe otra revisión de gasto. Revocación/cierre conservan
  propuestas locales rechazadas. Cámara/galería no suben antes de confirmar y guardar.
- Recodificar JPEG/PNG/WebP localmente, orientación del decodificador, límites de
  entrada/píxeles, canvas WebP ≤640 por lado/40960 bytes, calidad mínima y preview.
  No almacenar originales, EXIF ni HEIC no demostrado; cancelación y limpieza real.
- Openverse anónimo, solo al abrir/buscar, pocas páginas/resultados, cancelación,
  backoff 429 y timeout. Filtros conservadores CC0/CC BY, metadata validada y enlaces
  HTTPS públicos. Descargar únicamente miniatura oficial si CORS lo permite,
  comprimir y conservar atribución/modificación; si falla, icono local y sin prometer
  disponibilidad offline. Verificar servicio real, además de pruebas deterministas.
- Reutilizar UI minimalista con selector opcional, previews y atribución. Miniaturas
  visibles por ID y viewport, sin suscripción global de adjuntos. Liberar recursos.
- Pruebas IMG-01..05, reglas adversariales/bytes reales, Firefox real/cámara simulada,
  dos dispositivos/offline/reintentos/conflictos/cambio de imagen y regresión completa
  de Fase 6 sin modificar importes esperados. Medir compresión/cientos de miniaturas.
- Informe, README/AGENTS/modelo/seguridad/cuotas, auditoría, commit/push y SHA remoto.
  No Fase 8. Cámaras Android/iPhone físicas siguen pendientes.

Gemini CLI disponible, pero la revisión anterior terminó por cuota agotada. Se
omite un nuevo intento repetido; revisión propia más pruebas del contrato real.
