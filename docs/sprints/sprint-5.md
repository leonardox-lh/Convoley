# Sprint 5 · Operación semanal

Rama: `feat/sprint-5-operacion-semanal` (sale de `main`, que ya tiene el Sprint 4, commit `df0bdad`).
Orden: HU-33 → HU-28 → HU-30 → HU-29 → HU-31 → HU-32. Los permisos (HU-33) protegen todas las pantallas nuevas. La política y el saldo (HU-30) van antes de la cancelación del jugador (HU-29). Los equipos (HU-31) van antes de su imagen (HU-32). Un commit por historia, un test por criterio y revisión del `reviewer` al final.
Modo: rápido, como en el Sprint 4 (sin aprobación por historia), una vez aprobado este plan. **Plan aprobado.**

## Plan propuesto

- **Sin librerías npm nuevas.** La recurrencia se calcula con `Date` (Lima está en UTC−5 todo el año, sin horario de verano). Los tokens de invitación usan `node:crypto`, como `identity/application/reset-token.ts`. La imagen de equipos usa `next/og`, igual que la imagen de la lista.
- **Estado actual:**
  - `ClubRole { admin, helper }` y `ClubMember` ya existen. `requireOrganizer` devuelve el rol y las páginas comparan `role !== "admin"` a mano. No hay invitaciones ni pantalla de organizadores.
  - No hay recurrencia ni política de cancelación. `CancellationOutcome.balance` (HU-05) es solo una marca en `Payment`. No existe un saldo a favor.
  - El jugador no puede cancelar. `removeRegistration` (organizador) ya cancela, devuelve el crédito del plan y pasa el cupo a la lista de espera.
  - `/inscripcion/[registration]` ya es el link privado del jugador (`noindex`). Llega ahí al inscribirse y desde ahí paga.
  - `Registration.position` y `level` existen. `Event.isMixed` existe. **No hay género.**
  - El módulo `media` no existe. La imagen de la lista vive en `app/admin/[club]/convocatorias/[event]/imagen/` (`route.tsx`, `list-image.tsx`, `image-layout.ts`).
  - No hay una página de inicio del club en el admin: `/admin` redirige a `/convocatorias/nueva`.
- **Datos (4 migraciones, con `prisma migrate diff`; no se aplican a la BD de dev compartida):**
  - HU-33 `add_club_invitations`: `ClubInvitation { id, clubId, role ClubRole, tokenHash @unique, expiresAt, usedAt?, createdByUserId, createdAt }`. Se borra en cascada con el club. Índice `[clubId]`.
  - HU-28 `add_recurring_events`:
    - `RecurringEvent { id, clubId, communityId, title, weekday Int, startMinute Int, venueName, mapsUrl?, priceCents, capacity, isMixed, rules?, publishDaysBefore Int, isPaused @default(false), timestamps }`. `communityId` con FK `Restrict`, así `deleteCommunity` sigue lanzando `CommunityInUseError`.
    - CHECKs: `weekday` 0–6 (0 = domingo, en Lima), `startMinute` 0–1439 (minutos desde las 00:00 en Lima), `publishDaysBefore` 0–13, `priceCents >= 0`, `capacity > 0`.
    - `Event.recurringEventId String?` (FK `Restrict`) y `@@unique([recurringEventId, startsAt])`: es la idempotencia de la publicación.
  - HU-30 `add_cancellation_policy_and_balance`:
    - `Club.cancellationDeadlineHours Int?`, con CHECK null o 0–168. Null = sin saldo a favor.
    - `PlayerBalance { id, clubId, userId, balanceCents Int @default(0), timestamps }`, `@@unique([clubId, userId])`. CHECK: `balanceCents >= 0`.
    - `BalanceUse { id, playerBalanceId, registrationId @unique, amountCents, createdAt }`, con CHECK `amountCents > 0`.
    - Es el mismo patrón que `creditsRemaining` + `CreditUse`.
  - HU-31 `add_teams`: `enum PlayerGender { female, male }`, `Registration.gender PlayerGender?` y `Registration.teamNumber Int?` con CHECK null o 1–8.
  - HU-29 y HU-32: **ninguna**.
  - Actualizar `docs/MODELO_DATOS.md`.
- **clubs (HU-33, HU-30):**
  - domain:
    - `permissions.ts`: `ClubPermission = manage_club | manage_events | run_game_day | review_payments`. `can(role, permission)`: el admin tiene todo; el helper solo `run_game_day` y `review_payments`.
    - `invitation.ts`: `INVITATION_TTL_DAYS = 7`, un solo uso.
    - `cancellation-policy.ts`: horas de 0 a 168, o null.
    - Errores: `InvitationInvalidError`, `InvitationExpiredError`, `LastAdminError`, `InvalidCancellationPolicyError`.
  - application: `createInvitation` (solo se guarda el sha256 del token), `acceptInvitation` (transacción: marca `usedAt` si sigue sin usar y crea el `ClubMember`; si ya era miembro no cambia su rol), `listClubMembers`, `removeClubMember` (no deja quitar al último admin), `updateCancellationPolicy`.
  - Puertos: `ClubInvitationRepository`, `ClubMemberRepository` y ampliación del repositorio de configuración de pagos para la política.
  - `index.ts` exporta `can` y `findCancellationPolicy(clubId)`.
  - `app/admin/[club]/require-organizer.ts` pasa a `requireOrganizer(clubSlug, permission)`. Se reemplazan todos los `role !== "admin"`.
- **events (HU-28):**
  - domain `recurrence.ts`: `validateRecurringEvent` (reutiliza `validateEventDetails` sobre la próxima fecha) y `dueOccurrences(template, now)`: fechas con `startsAt > now` y `startsAt − publishDaysBefore días <= now`. Cálculo en hora Lima con `LIMA_UTC_OFFSET_MINUTES`; domain no importa `lib/lima-time`.
  - application: `createRecurringEvent`, `setRecurringEventPaused`, `listRecurringEvents`, `publishDueOccurrences(clubId)` (crea las fechas como `published` con `createMany skipDuplicates`). `listOpenEvents` llama primero a `publishDueOccurrences`.
  - Puerto: `RecurringEventRepository`.
- **plans (HU-30, dueño de los créditos del jugador):**
  - domain `balance.ts`: el uso cubre el precio completo (sin pagos parciales).
  - application: `getBalance`, `earnBalance(..., tx)` (upsert con incremento), `spendBalance(..., tx)` (`UPDATE … WHERE balanceCents >= amount`, crea `BalanceUse`, `NoBalanceError` si no alcanza), `paymentSourceOf(registrationId, tx)` → `plan_credit | balance | null`.
  - `makeReturnCredits` también devuelve los `BalanceUse`. Así `removeRegistration` y `cancelEvent` quedan cubiertos sin tocar sus adaptadores.
- **registrations (HU-29, HU-30, HU-31):**
  - domain:
    - `cancellation.ts`: `cancellationResult({ status, paidWith, startsAt, now, deadlineHours })` → `nothing_paid | credited | forfeited`. No se puede cancelar con `in_review` ni después del inicio (`CancellationNotAllowedError`). `credited` si hay política y `now <= startsAt − horas`.
    - `teams.ts`: `buildTeams({ players, teamCount, minWomenPerTeam })` → `Map<registrationId, teamNumber>`. Valida 2–8 equipos y `teamCount <= jugadores`; reparte primero `minWomenPerTeam × teamCount` chicas (`NotEnoughWomenError` si no alcanzan); luego al resto por posición y nivel de mayor a menor, al equipo con menos jugadores, luego menos de esa posición, luego menor puntaje. Puntaje: principiante 1, intermedio 2, avanzado 3; sin nivel = 2. Empates por `createdAt` (determinista).
    - Errores: `InvalidTeamCountError`, `NotEnoughWomenError`, `CancellationNotAllowedError`.
  - application:
    - `cancelOwnRegistration(registrationId)`: transacción; bloquea el evento, calcula el resultado; con dinero `earnBalance(event.priceCents)`, con crédito o saldo `giveBack`, si se pierde no devuelve nada; siempre `setStatus(cancelled)` y `fillFreedSeats`.
    - `getCancellationPreview(registrationId)`.
    - `payWithBalance(registrationId)`: como `payWithCredit` con `spendBalance(event.priceCents)`.
    - `buildEventTeams`, `moveToTeam`, `listEventTeams` (con grupo "Sin equipo").
  - Puertos: `Credits` suma `paymentSourceOf`, `earnBalance`, `spendBalance`; nuevo `CancellationPolicies.deadlineHours(clubId)`; `RegistrationRepository` suma `assignTeams` y `setTeam`; `PlayerDetails` y `RegistrationListItem` suman `gender` y `teamNumber`.
- **app:**
  - Organizador:
    - `/admin/[club]`: nueva página de inicio con próximas convocatorias (publica las recurrentes) y enlaces según permisos. `/admin` redirige aquí.
    - `/admin/[club]/organizadores` (admin): miembros, quitar, generar link de invitación con rol y botón copiar.
    - `/admin/[club]/recurrentes` (admin): crear, pausar o reanudar, ver las fechas creadas. Reutiliza `event-fields.tsx` + día, hora y "publicar N días antes".
    - `/admin/[club]/pagos` (admin): "Horas límite para cancelar con saldo a favor".
    - `/admin/[club]/convocatorias/[event]/equipos` (admin y ayudante): número de equipos, "mínimo de chicas por equipo" (solo mixto), tarjetas por equipo y select "Mover a…".
    - `/admin/[club]/convocatorias/[event]/equipos/imagen`: PNG de los equipos.
  - Imagen: el encabezado y `logoDataUrl` se extraen de `list-image.tsx` y `route.tsx` a `image-header.tsx` y `image-assets.ts`. `teams-image.tsx` dibuja una columna por equipo (hasta 4 por fila) con los formatos de `LIST_IMAGE_FORMATS`.
  - Jugador:
    - `/invitacion/[token]`: pide iniciar sesión (Google o correo) y aceptar.
    - `/inscripcion/[registration]`: "Guarda este link para pagar o cancelar" con botón copiar; sección "¿No puedes ir?" con el resultado previo y confirmación; "Tienes S/ X de saldo a favor · Usar saldo".
    - `/c/[club]/[event]`: línea con la política de cancelación y la hora límite en Lima.
    - Inscripción y "Agregar jugador": campo Género (Chica / Chico), solo en mixtas y obligatorio ahí.
- **Tests:** unitarios de domain (`can`, `dueOccurrences`, `cancellationResult`, `buildTeams`), casos de uso con fakes (invitación usada dos veces, último admin) e integración Prisma (`skipDuplicates` de fechas, `spendBalance` concurrente sin saldo negativo).

## Decisiones a aprobar

1. **HU-28 sin cron:** las fechas se crean de forma perezosa al abrir `/[club]`, `/admin/[club]` o `/admin/[club]/recurrentes`. Idempotente por `@@unique([recurringEventId, startsAt])` + ON CONFLICT DO NOTHING. Si nadie visita, la fecha no existe, pero tampoco hay a quién mostrársela. Si hace falta, luego `/api/cron/recurrentes` con `CRON_SECRET`.
2. **Recurrentes:** solo semanal (día y hora en Lima, "publicar 0–13 días antes"). Las fechas nacen `published`. Las plantillas no se editan: se pausan y se crea otra. Pausar no toca fechas ya creadas; reanudar no crea fechas pasadas; una fecha cancelada no se vuelve a crear.
3. **Saldo a favor:** monto en céntimos por club + cuenta de Google (`PlayerBalance`, módulo `plans`). Es crédito dentro del club, no dinero. Solo paga inscripciones completas (sin parciales, sin tienda ni planes). No vence y no guarda historial. Se acredita `event.priceCents`, sin el cargo por servicio.
4. **Política:** null = sin saldo a favor (si cancela algo pagado, lo pierde; se avisa antes). Antes del límite: dinero → saldo a favor; crédito de plan → vuelve el crédito; saldo → vuelve el saldo. Después del límite se pierde. Pendiente de pago o lista de espera: siempre se puede cancelar. `in_review` o ya iniciada: no se puede.
5. **HU-29: el "link único" es `/inscripcion/[registration]`**, sin token nuevo. Riesgo: `cuid()` no es criptográficamente aleatorio; es el riesgo ya aceptado para pagar y subir voucher ahí. Alternativa: `Registration.accessToken @default(uuid())`.
6. **Cancelación por el organizador:** `removeRegistration` y `cancelEvent` no dan saldo por pagos en dinero; solo devuelven créditos y saldo usados. La opción `balance` de HU-05 sigue siendo una marca.
7. **Género:** opcional (`female | male`), se pregunta solo en mixtas y allí es obligatorio. Los inscritos sin género no cuentan como chicas.
8. **Equipos:** entran quienes ocupan cupo (pendiente, en revisión y pagado), de 2 a 8 equipos. El mínimo de chicas se ingresa al armar y no se guarda. Se guarda `Registration.teamNumber`; volver a armar borra los movimientos a mano; los nuevos inscritos aparecen en "Sin equipo".
9. **Permisos:** el ayudante tiene el día de juego (lista, agregar jugador, marcar pagado, aprobar/rechazar vouchers de inscripciones y pedidos, quitar inscritos, entregar pedidos, equipos e imágenes). Solo el admin: convocatorias y recurrentes, perfil, comunidades, pagos y política, tienda, planes (con sus vouchers) y organizadores.
10. **Invitaciones:** link de un solo uso que vence en 7 días, con el rol elegido, se comparte por WhatsApp (sin correos). Para aceptar hay que iniciar sesión. Se puede quitar miembros, pero no al último admin. Cambiar rol = quitar e invitar de nuevo.
11. **Nueva página `/admin/[club]`** (próximas convocatorias + menú según el rol), para que el ayudante tenga por dónde entrar y para publicar las recurrentes.
12. **HU-32:** se extrae el encabezado compartido de la imagen de la lista. La imagen de equipos es privada (admin y ayudante, `no-store`).

## Avance

- [x] HU-33 · Coorganizadores con roles
- [x] HU-28 · Convocatorias recurrentes
- [x] HU-30 · Política de cancelación con saldo a favor
- [x] HU-29 · Cancelar inscripción con link
- [x] HU-31 · Armar equipos parejos
- [x] HU-32 · Imagen de los equipos

## Decisiones tomadas sin consultar

- **Tests:** a pedido del usuario, desde HU-28 no se escribieron tests nuevos para ir más rápido. HU-33 sí tiene tests (permisos, invitaciones, último admin y `?volver=`); HU-28 conserva los suyos (recurrencia en hora Lima). Las demás historias solo se cubren con typecheck, lint y los tests existentes. Falta probarlas a mano en el celular (375px).
- **Permisos:** solo dos: `manage_club` (admin) y `run_game_day` (admin y ayudante), en lugar de los cuatro del plan. `requireOrganizer(clubSlug, permiso)` reemplazó todas las comparaciones `role !== "admin"`. Editar la convocatoria ahora es solo del admin: el ayudante ya no ve el link.
- **Invitaciones:** `/ingresar` y `/registro` aceptan `?volver=` (solo rutas internas, sin `//`, `/\` ni caracteres de control) para volver al link de invitación. Se reservaron los slugs `invitacion`, `pedido` y `plan`; los dos últimos faltaban desde el Sprint 4.
- **`/admin` lleva a `/admin/[club]`,** el nuevo inicio del club, en vez de a "Nueva convocatoria". Se ajustaron los e2e con `signInToNewEvent`.
- **Recurrentes:** `Event.recurringSlot` guarda el inicio programado, que nunca cambia. Así, una fecha que el organizador movió o canceló no se vuelve a crear. "Publicar N días antes" cuenta días calendario de Lima: 0 significa desde las 00:00 del mismo día. La primera versión con 0 nunca publicaba nada.
- **Saldo a favor:** se acredita el precio vigente de la convocatoria (`event.priceCents`), sin el cargo por servicio. También vale para pagos marcados a mano. Si la convocatoria es gratis, no se acredita nada y no se puede pagar con saldo.
- **Cancelar con crédito o saldo después del límite:** se pierde, igual que el dinero.
- **Género:** es obligatorio en el formulario (`required`) solo en convocatorias mixtas. El servidor lo acepta como opcional, porque el caso de uso de inscripción no conoce `isMixed`. Riesgo bajo: es un dato para armar equipos, no de dinero.
- **Equipos:** se guarda la suma de niveles de cada equipo y se muestra para ver qué tan parejos están. Las chicas que cubren el mínimo se reparten en serpiente por nivel.
- **Imagen de equipos:** está en cuadrado y en historia, con el mismo encabezado y pie que la lista (`imagen/image-header.tsx`, `imagen/image-assets.ts`). Muestra el nombre y la inicial del apellido.
- **Plan y saldo solo con Google (decidido por el usuario):** el celular no se verifica, así que no identifica a nadie. Comprar un plan exige entrar con Google, y los créditos se buscan solo por esa cuenta. El saldo a favor es por club + cuenta de Google. Pagar con plan o saldo exige que la sesión sea la cuenta de la inscripción (`AccountRequiredError`): el link privado no basta, porque una inscripción de invitado se vincula por celular a una cuenta al entrar con Google. Un invitado que pagó y cancela a tiempo no genera saldo (`guest_forfeited`) y se le avisa antes de confirmar. Compras de plan viejas sin `userId` ya no sirven para pagar (no hay datos en producción).
- **Pendiente menor del reviewer:** la vista previa de cancelación en `/inscripcion/[id]` toma el bloqueo del evento en cada visita. Funciona, pero serializa lecturas; conviene una variante sin bloqueo si hay mucho tráfico.
- **Migraciones nuevas** (`add_club_invitations`, `add_recurring_events`, `add_cancellation_policy_and_balance`, `add_teams`): se generaron con `prisma migrate diff` y CHECKs a mano. No se aplicaron a ninguna BD. Falta `npx prisma migrate deploy` en dev y en Railway, junto con las dos del Sprint 4.
