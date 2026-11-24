# Sprint 2 · Voucher, lista de espera e imagen de la lista (MVP piloto)

Orden: HU-48 → HU-09 → HU-10 → HU-11 → HU-12 → HU-13 → HU-14 → HU-15 → HU-16 → HU-17

Estado al iniciar: rama `feat/sprint-2-mvp-pilot` creada desde `feat/HU-08-manual-registrations` (HU-07 y HU-08 aún no están en `main`). Modo rápido: sin aprobación por historia; las decisiones de producto quedan abajo para que las revises.

Recordatorio (2026-11-24): sin Mercado Pago ni pago automático. El pago es manual o por voucher que revisa el organizador.

## HU-48 · Cuenta del jugador con Google (3 pts) ✅
Depende de: HU-01 (Auth.js con Google), HU-06
- [x] Migración: `User.firstName` y `User.lastName` (Google los manda por separado en el perfil)
- [x] `identity`: `getPlayerProfile` y `savePlayerPhone` (el celular de la cuenta no cambia una vez guardado; si otra cuenta ya lo tiene, se ignora)
- [x] `registrations`: `linkGuestRegistrations` (inscripciones de invitado con ese celular pasan a la cuenta) y `listPlayerRegistrations`
- [x] Formulario de inscripción con sesión: muestra "Te inscribes como …" y solo pide el celular la primera vez
- [x] Página `/mis-inscripciones` con estado de pago (con botón de Google si no hay sesión)
- [x] Tests: unitarios de `savePlayerPhone`, vínculo de inscripciones y lista
- [ ] Probar a mano el login real con Google (necesita `AUTH_GOOGLE_*`)

## HU-09 · Comunidades o niveles (2 pts)
## HU-10 · Posición y nivel al inscribirse (1 pt)
## HU-11 · Vista previa del link en WhatsApp (2 pts)
## HU-12 · Lista de espera (3 pts)
## HU-13 · QR y número de Yape/Plin (2 pts)
## HU-14 · Subir voucher (3 pts)
## HU-15 · Aprobar o rechazar vouchers (2 pts)
## HU-16 · Imagen de la lista (5 pts)
## HU-17 · Copiar la lista como texto (1 pt)

## Decisiones tomadas sin consultar

- **HU-48**: el jugador con Google se inscribe con un solo botón; nombre y apellido salen de Google (si Google no manda apellido, se piden). El celular se pide solo la primera vez y queda fijo en la cuenta. Si el celular ya está en otra cuenta, la inscripción igual se hace pero no se vinculan las inscripciones de invitado.
- **HU-48**: "Mis inscripciones" vive en `/mis-inscripciones` (nombre reservado para clubes, junto con `inscripcion` y `vouchers`). Muestra todas las inscripciones no canceladas, la más reciente primero.
- **HU-48**: un jugador cuyo correo de Google ya tiene cuenta de organizador con contraseña no puede entrar con Google (se mantiene la regla de HU-01 de no vincular cuentas automáticamente).
