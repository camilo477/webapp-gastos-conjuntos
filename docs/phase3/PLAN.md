# Fase 3 · Motor financiero puro

Autorización del usuario: petición completa de Fase 3. Se comprobó `main`, sin
conflictos, y la publicación de Fase 2 en GitHub: `9071de8da696ad698f99cf127511cc9c2aaca4d5`.
El archivo previo no versionado se conserva, por decisión autorizada por el
usuario, en `.cache/pre-phase3/`; no se incluye en la entrega.

## Diseño

- `src/domain/`: esquemas Zod compartidos, tipos inferidos, fechas, dinero,
  repartos, snapshots efectivos, balances, liquidación, presupuesto y estadísticas.
- DTO monetarios: enteros Number seguros de hasta 10^12 por movimiento; motor y
  agregados: BigInt. Conversión a DTO únicamente con comprobación de rango.
- Fechas civiles inclusivas y zona IANA explícita; instantes UTC y reloj recibido
  como argumentos. Ningún acceso a React, Firebase, navegador, red o reloj global.
- El motor recibe snapshots con revisión/estado explícitos o eventos financieros
  para proyección contable local: verifica padres directos y detecta cabezas
  incompatibles/ancestros ausentes. Si hay conflicto/incompletitud excluye las
  entidades afectadas y marca resultados provisionales. No elige resoluciones
  por su cuenta ni implementa transporte, cola, merges o sincronización distribuida.
- Una sola selección de gastos/abonos efectivos alimenta balances, estadísticas
  y presupuesto. Cambiar/borrar/restaurar significa recalcular desde snapshots;
  no existe saldo editable ni historial mutable dentro del motor.

## Contrato previo a implementación

La ampliación `fixed` de UX-D01 se incorpora al contrato financiero v2, manteniendo
lectura/migración explícita de v1 (`equal`/`percentage`). `fixed` usa cuotas
enteras explícitas y `weights: []`; no se aproxima mediante porcentajes.
El resto de contratos de metadatos sigue en v1; no hay documentos reales que
migrar ni escrituras Firestore en esta fase. La descripción exacta se añade a
DATA_MODEL, CALCULATION_RULES y DECISIONS antes de implementar el esquema.

Los viajes se prueban con 2–10 personas activas; un gasto puede beneficiar a una
sola persona al excluir al resto. Las personas históricas se conservan.

## Verificación

FIN-01–11, VAL-01–02, BUD-01–05 y STAT-01; miles de vectores deterministas,
permutaciones, máximos/BigInt, pagos parciales/adelantos, restauración, DST,
presupuestos manuales y estados provisionales. Pruebas del dominio en entorno
Node sin setup de React/DOM, además de las suites anteriores, lint, typecheck y
build. No cambios visuales, cuentas, integración Firestore ni Fase 4.

Gemini está instalado, pero su autenticación ya falló en esta sesión. Se sigue
la alternativa documentada: revisión propia y verificación, sin reintentos de
autenticación ni atribuir una revisión independiente inexistente.
