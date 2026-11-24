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

## HU-09 · Comunidades o niveles (2 pts) ✅
Depende de: HU-02 (el club nace con "General")
- [x] `clubs`: `createCommunity`, `renameCommunity`, `deleteCommunity`, `listCommunities`; nombre de 1 a 40 letras, único por club
- [x] No se elimina una comunidad con convocatorias (lo frena la base: `ON DELETE RESTRICT`) ni la última del club
- [x] Página `/admin/[club]/comunidades` (solo admin) y link desde "Nueva convocatoria"
- [x] Cada convocatoria ya pertenece a una comunidad (`Event.communityId` obligatorio y selector en el formulario de HU-04)
- [x] Tests: unitarios del nombre y de los casos de uso con fakes; integración del repositorio (nombre repetido, borrar con eventos)

## HU-10 · Posición y nivel al inscribirse (1 pt) ✅
Depende de: HU-06
- [x] Migración: enums `PlayerPosition` y `PlayerLevel`; `Registration.position` y `Registration.level` opcionales
- [x] `registerGuest` guarda posición y nivel; Zod en la server action (vacío = sin respuesta)
- [x] Dos selectores opcionales en el formulario de inscripción; la lista del organizador los muestra
- [x] Tests: unitarios de las listas de posiciones/niveles y del caso de uso (guarda y es opcional)

## HU-11 · Vista previa del link en WhatsApp (2 pts) ✅
Depende de: HU-04, HU-02 (colores del club)
- [x] `opengraph-image.tsx` en `/c/[club]/[event]` con `next/og` (sin librerías nuevas): club, título, fecha en Lima, lugar, precio y cupos, con los colores del club
- [x] `generateMetadata`: título "Convocatoria · Club" y descripción con fecha, lugar, precio y cupos libres
- [x] Tests: unitarios del texto de la descripción y de los cupos
- [ ] Revisar a mano la vista previa pegando el link en WhatsApp (necesita la app desplegada con `APP_URL`)

## HU-12 · Lista de espera (3 pts) ✅
Depende de: HU-06, HU-08
- [x] Migración: estado `waitlisted` en `RegistrationStatus` (no ocupa cupo)
- [x] Dominio: `signUpStatus` (cupo o espera), `acceptsWaitlist`, `holdsSeat`
- [x] `registerGuest` manda a la espera cuando no hay cupo y devuelve la posición; `addPlayerManually` sigue exigiendo cupo
- [x] Al quitar a alguien con cupo pasa el primero de la espera (la convocatoria sigue llena); si no hay nadie esperando, se reabre
- [x] Al subir la capacidad en "Editar convocatoria", los cupos nuevos van primero a la espera
- [x] Reinscribirse tras cancelar cuenta como llegada nueva (`createdAt` se renueva)
- [x] UI: formulario "Entra a la lista de espera" en convocatorias llenas, confirmación con el puesto, puesto en "Mis inscripciones", filtro "En espera" y numeración E1, E2… en la lista del organizador
- [x] Tests: unitarios (orden, promoción, posición, capacidad), integración en Postgres (promoción real y concurrencia)

## HU-13 · QR y número de Yape/Plin (2 pts)
## HU-14 · Subir voucher (3 pts)
## HU-15 · Aprobar o rechazar vouchers (2 pts)
## HU-16 · Imagen de la lista (5 pts)
## HU-17 · Copiar la lista como texto (1 pt)

## Decisiones tomadas sin consultar

- **HU-48**: el jugador con Google se inscribe con un solo botón; nombre y apellido salen de Google (si Google no manda apellido, se piden). El celular se pide solo la primera vez y queda fijo en la cuenta. Si el celular ya está en otra cuenta, la inscripción igual se hace pero no se vinculan las inscripciones de invitado.
- **HU-48**: "Mis inscripciones" vive en `/mis-inscripciones` (nombre reservado para clubes, junto con `inscripcion` y `vouchers`). Muestra todas las inscripciones no canceladas, la más reciente primero.
- **HU-09**: solo el admin del club gestiona comunidades (igual que el perfil). Una comunidad con convocatorias no se puede eliminar (ni siquiera si están canceladas o pasadas): hay que renombrarla. El club siempre conserva al menos una.
- **HU-10**: la posición y el nivel se piden en cada inscripción (no se guardan en la cuenta de Google). En "Agregar jugador" del organizador no se piden.
- **HU-11**: la imagen es 1200×630 con el color primario del club de fondo y el secundario en la etiqueta de cupos (negro y amarillo si el club no tiene colores). Sin logo en la imagen para no depender del bucket. WhatsApp guarda la vista previa en caché: los cupos pueden verse desactualizados en un link ya compartido.
- **HU-12**: quien entra a la espera no paga hasta que pasa a la lista: el organizador no puede marcar "pagado" a alguien en espera. Cuando sube un jugador de la espera no se le avisa (no hay correos ni WhatsApp todavía): lo ve en "Mis inscripciones" o el organizador le escribe.
- **HU-12**: un invitado ve su puesto solo al inscribirse. Desde HU-14 tiene un link propio de su inscripción donde puede verlo de nuevo.
- **HU-48**: un jugador cuyo correo de Google ya tiene cuenta de organizador con contraseña no puede entrar con Google (se mantiene la regla de HU-01 de no vincular cuentas automáticamente).
