# Fase 4 · Acceso, viajes e invitaciones

Fase 3 confirmada en GitHub: `7524563b13b0efa4c681101e9cea050870663a0d`.
Inicio en `main` limpio, sin conflictos. Autorización explícita del usuario.

## Límites y decisiones

- Exclusivamente emuladores con proyecto `demo-`, SDK modular y persistencia
  Auth del navegador. Firestore permanece en memoria; no caché privada en SW.
- Organizador password y correo verificado para crear. Invitados Auth anónima,
  nombre sin privilegios, sin recuperación automática de identidad.
- Crear viaje/member/person/budget raíz v2 en una transacción online. No abrir
  escrituras financieras ordinarias, modificaciones o borrados de eventos.
- Join ciego de trip/member/person, sin leer el viaje privado, con transforms
  atómicos y reglas de capacidad. Usar commit REST autenticado para el join:
  no encola escrituras administrativas offline. El resto usa transacciones SDK
  online. El REST usa el ID token de Auth, nunca credenciales administrativas.
- Tokens Base32 de 160 bits, siete días como máximo comprobados por servidor,
  revocación monotónica. QR y lectura locales; URL en fragmento retirado al abrir.
- Reasignación histórica deshabilitada: falta un procedimiento ratificado de
  comprobación del nuevo titular. Revocación conserva personas/eventos y bloquea
  reingreso del mismo UID. Finalización deshabilitada hasta las puertas de
  consistencia financiera; no simular detección de colas remotas.
- La demo original se conserva sin configuración. En modo emuladores se muestra
  una interfaz de datos locales reales, sin mezclar fixtures con viajes del usuario.

## Puertas técnicas antes del cierre

1. Compilar reglas y probar creación íntegra, membresías, getAfter y transiciones.
2. Clientes no privilegiados: denegaciones, bypasses, altas parciales y revocación.
3. Carrera de nueve a diez: solo un ingreso; nunca once ni documentos parciales.
4. Exportar cobertura real de expresiones y revisar cota estática conservadora
   de accesos por operación/batch sin depender de caché. No confundir cobertura
   acumulada con una traza por petición.
5. Auth real en emulador, UI Firefox HTTP, persistencia/recarga, dos perfiles,
   QR local, metadatos y pérdida de acceso. Conservar limitaciones multiplataforma.
6. Suites existentes, lint, ambos typechecks, build, documentación y secretos.
7. Commit/push si `.git` lo permite; no eludir montaje protegido.

Gemini se omite por la falta de autenticación ya constatada en esta sesión;
se revisan las reglas con pruebas adversariales y revisión propia.
