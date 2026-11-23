# Fase 2 · Base técnica

Autorización explícita del usuario: 2026-11-22. La Fase 1 se acepta
provisionalmente para continuar. Se conserva el prototipo y toda su evidencia;
esta aceptación no aprueba las pruebas multiplataforma pendientes.

## Alcance

React, TypeScript estricto, Vite, routing, componentes CSS propios, demostración
identificada, temas, Firebase SDK modular limitado a emuladores, PWA de recursos
estáticos, Vitest, Playwright y CI. Sin motor financiero, cuentas, escrituras de
producto, invitaciones, fotos, sincronización distribuida ni despliegue.

## Implementación prevista

1. Reutilizar tokens, geometría e iconos locales de Fase 1 en componentes React.
   Inicio, balance, actividad, viajes y formulario visual representativos;
   cantidades de ejemplo predefinidas, sin trasladar cálculos del prototipo.
2. Routing con rutas directas, estados vacíos/error y navegación accesible.
   Acciones futuras deshabilitadas y explicadas. Solo preferencia de tema local.
3. Configuración Firebase validada antes de importar/inicializar servicios:
   demostración por defecto; emuladores solo en desarrollo, proyecto `demo-`,
   hosts de loopback y puertos explícitos. Sin ruta habilitada hacia producción.
   Auth preparado sin crear usuarios; Firestore en memoria y reglas deny-all.
4. Workbox precache del shell y recursos locales, fallback SPA, actualización
   ofrecida sin recarga automática. Ninguna caché de respuestas Firebase.
5. Pruebas de configuración, componentes, navegación, temas, errores, reglas
   deny-all, responsive y ciclo real de service worker sobre build HTTP.
6. Documentación, auditoría de secretos, revisión y publicación en `main` si
   los permisos lo permiten; comandos de terminal si `.git` está protegido.

## Decisiones y riesgos

- No crear directorios vacíos `domain`, `sync`, `attachments`: se incorporarán
  cuando tengan implementación en su fase. Se conserva el contrato documental.
- El reparto `fixed` diseñado en Fase 1 sigue pendiente de reconciliar antes
  del motor; la base no introduce contratos monetarios nuevos.
- Instalabilidad/configuración PWA y pruebas automatizadas no demuestran
  instalación física Android/iOS, safe areas ni sincronización financiera.
- Las pruebas de navegador requieren HTTP, procesos de navegador y bibliotecas
  del sistema. Un bloqueo se registra como pendiente, nunca como aprobado.
- Gemini CLI disponible, pero el intento de revisión previa en modo `plan`
  terminó por falta de autenticación. Se continúa con revisión propia sin
  reintentar ni enviar archivos privados.

## Verificación prevista

Typecheck, ESLint, Vitest/Testing Library, build, reglas en Emulator Suite y
Playwright en Chromium/Firefox/WebKit. Seis viewports en claro/oscuro,
texto al 200%, foco, diálogo/Escape, axe, manifiesto/iconos y shell offline.
Pruebas de actualización con dos versiones reales del service worker.
