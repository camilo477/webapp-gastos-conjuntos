# Gastos compartidos

PWA privada para llevar gastos de viajes entre 2 y 10 personas, con funcionamiento offline y contabilidad exacta.

**Estado: Fase 0 documentada y Fase 1 de diseño preparada para revisión; sin aplicación de producción.** No hay dependencias de producción instaladas, servicios Firebase configurados ni despliegue. Esta carpeta no tiene un repositorio Git inicializado; no se hicieron commits ni push.

## Diseño UX/UI · Fase 1

- [Prototipo navegable](design/prototype/index.html), con datos ficticios en memoria y modos claro/oscuro.
- [Wireframes móvil/escritorio](design/wireframes.html): 23 pantallas y 22 muestras de estados/grupo.
- [Composición ilustrada](design/review/composition.png), referencia visual sin captura de navegador.
- [Detalle de presupuesto diario](design/review/budget-composition.png) y [ajustes visuales posteriores a la revisión](docs/phase1/VISUAL_ADJUSTMENTS.md).
- [Entregables, flujos, sistema de diseño y diferencias con Fase 0](docs/phase1/README.md).
- [Cómo abrir y verificar el prototipo](design/README.md) y [limitaciones de revisión](docs/phase1/REVIEW.md).
- [Validación automatizada de Fase 1](docs/phase1/AUTOMATED_TEST_REPORT.md): pruebas ejecutadas, correcciones y bloqueos de navegador; aprobación pendiente.

**Aprobación visual pendiente.** La Fase 2 no se inició. El prototipo simula cuentas, sincronización y operaciones; no implementa Firebase, persistencia durable ni una PWA instalable. El reparto por importes específicos solicitado en Fase 1 está documentado como extensión del contrato antes de programar.

## Documentación

- [Plan original, copia sin cambios](docs/PLAN_MVP_GASTOS_COMPARTIDOS.md).
- [Requisitos y fases](docs/PRD.md).
- [Arquitectura y límites de confianza](docs/ARCHITECTURE.md).
- [Modelo y contratos de datos](docs/DATA_MODEL.md).
- [Reglas financieras](docs/CALCULATION_RULES.md).
- [Offline, conflictos y duplicados](docs/OFFLINE_SYNC.md).
- [Propuesta de seguridad](docs/SECURITY_RULES.md).
- [UX y estados](docs/UI_GUIDELINES.md).
- [Pruebas y criterios de aceptación](docs/TEST_PLAN.md).
- [Decisiones y cuestiones pendientes](docs/DECISIONS.md).
- [Límites de servicios y fuentes](docs/SERVICE_LIMITS.md).

El plan original es la fuente de alcance. Los contratos de `DATA_MODEL.md` son compartidos por todos los módulos. Las decisiones propuestas aún no ratificadas se identifican en `DECISIONS.md`; no se presentan como aprobaciones del usuario.

El siguiente paso es revisar visualmente la Fase 1 y registrar las decisiones ratificadas. No comenzar código productivo hasta superar esa fase. Las hipótesis de reglas y sincronización requieren pruebas de concepto en emuladores antes de depender de ellas en las fases funcionales.
