# Sprint 6 · Lanzamiento comercial

Rama: `feat/sprint-6-lanzamiento-comercial` (sale de `feat/sprint-5-operacion-semanal`, commit `7746983`).
Orden: HU-35 → HU-36 → HU-34 → HU-38 → HU-37. La suscripción (HU-35) trae el bloqueo de "solo lectura", que deben usar todas las acciones nuevas del sprint. El panel del dueño (HU-36) registra los pagos de la suscripción, así que va justo después. Finanzas (HU-34), check-in (HU-38) y flyer (HU-37) son independientes entre sí. Un commit por historia y revisión del `reviewer` al final.
Modo: rápido, sin aprobación por historia, una vez aprobado este plan. **No se escriben tests nuevos:** solo se arreglan los existentes que se rompan.

## Plan propuesto

- **Librerías npm:**
  - **`uqr` para HU-38 (requiere aprobación).** Es de unjs, MIT, sin dependencias, con tipos, y `renderSVG(texto)` devuelve un SVG. No hay ninguna librería de QR en `package.json`. Alternativa sin dependencia si no se aprueba: HU-38 sale solo con check-in manual y el QR queda pendiente.
  - **HU-34 no necesita librería:** se exporta un CSV UTF-8 con BOM, que Excel abre bien.
  - **HU-37 no necesita librería:** reutiliza `next/og`.
- **Estado actual:**
  - El módulo `billing` no existe. Tampoco hay suscripción, panel del dueño ni noción de superadmin.
  - `requireOrganizer(clubSlug, permission)` lo usan por igual las páginas (lectura) y las server actions (escritura). `findClubMembership` devuelve solo `role`.
  - La imagen de la lista ya tiene formato `historia` (1080×1920), y comparte encabezado y pie (`imagen/image-header.tsx`, `imagen/image-assets.ts` → `loadImageBrand`). `ListSharing` sabe descargar y compartir un PNG.
  - `Payment` tiene `clubId`, `amountCents` (incluye el cargo por servicio), `status` y un dueño (`registrationId | orderId | planPurchaseId`). `Order.pickupEventId` es obligatorio: todo pedido cae en una convocatoria.
  - No hay costo de cancha ni check-in. `/inscripcion/[registration]` es el link privado del jugador.
- **Datos (3 migraciones, generadas con `prisma migrate diff` y CHECKs a mano; no se aplican a la BD compartida):**
  - HU-34 `20261127090000_add_court_cost`: `Event.courtCostCents Int?`, con CHECK null o `>= 0`. Null significa "sin registrar".
  - HU-35 `20261127100000_add_subscriptions`:
    - `Subscription { clubId String @id, trialEndsAt DateTime, paidUntil DateTime?, suspendedAt DateTime?, createdAt, updatedAt }`. FK a `Club` con `Cascade`.
    - `SubscriptionPayment { id, clubId, amountCents Int, paidUntil DateTime, recordedByUserId String?, createdAt }`. CHECK `amountCents > 0`. FK a `Subscription(clubId)` con `Restrict`, FK a `User` con `SetNull`. `@@index([clubId, createdAt])`.
    - Backfill: los clubes existentes reciben 30 días de prueba desde el despliegue.
  - HU-38 `20261127110000_add_check_in`: `Registration.checkedInAt DateTime?`.
  - HU-36 y HU-37: **ninguna**.
  - Actualizar `docs/MODELO_DATOS.md`.
- **billing (HU-35, HU-36), módulo nuevo:**
  - **domain `subscription.ts`:** constantes `TRIAL_DAYS = 30`, `BILLING_PERIOD_DAYS = 30`, `MONTHLY_PRICE_CENTS = 4900`, `EXPIRY_WARNING_DAYS = 7`. `subscriptionState(sub, now)` → `{ status: trial | active | read_only | suspended, accessEndsAt, daysLeft, warn }`, con `accessEndsAt = max(trialEndsAt, paidUntil)`. `isWritable(state)`. `nextPaidUntil(accessEndsAt, now) = max(accessEndsAt, now) + 30 días`. Error `StaleSubscriptionError`.
  - **application:** puerto `SubscriptionRepository`. Casos de uso `startTrial`, `getClubAccess` (crea la suscripción perezosamente si falta), `isClubWritable`, `recordSubscriptionPayment({ clubId, expectedPaidUntil, recordedByUserId })` (transacción con `FOR UPDATE`; si `paidUntil` cambió, `StaleSubscriptionError`), `setClubSuspended`, `listSubscriptions`.
  - **infrastructure:** `prisma-subscription-repository.ts`. `billing` no importa ningún otro módulo.
- **identity (HU-36):** `isPlatformAdmin(userId)`: correo en `PLATFORM_ADMIN_EMAILS` (env, separado por comas, en minúsculas) **y** cuenta de Google vinculada.
- **clubs:** `findClubMembership` también devuelve `clubId`; nuevo `listAllClubs()`; slug `plataforma` reservado.
- **Solo lectura (HU-35):**
  - Nuevo `requireOrganizerToEdit(clubSlug, permission)` = `requireOrganizer` + `isClubWritable`. Reemplaza a `requireOrganizer` en todas las server actions de `app/admin/[club]/**` y en `api/mercado-pago/connect` y `callback`. Las páginas siguen con `requireOrganizer`.
  - `publishDueOccurrences` no publica fechas recurrentes de clubes en solo lectura.
  - No se bloquea lo que hace el jugador, el webhook de Mercado Pago ni `/plataforma`.
  - Banner de estado en `/admin/[club]` y página `/admin/[club]/suscripcion` con el precio y `BILLING_PAYMENT_INSTRUCTIONS` (env opcional).
  - `app/club/nuevo/actions.ts` llama a `startTrial`.
- **HU-36 · panel del dueño:** `/plataforma?mes=AAAA-MM`. Tabla de clubes con estado, vencimiento, convocatorias e inscritos del mes. Acciones "Registrar pago (S/ 49)" y "Suspender"/"Reactivar". `lib/lima-time.ts` suma `limaMonthRange` y `currentLimaMonth`.
- **HU-34 · finanzas:** `/admin/[club]/finanzas?mes=AAAA-MM` (`manage_club`). Por convocatoria: inscripciones, tienda, recaudado (pagos `approved`), costo de cancha editable en línea y ganancia. Planes vendidos del mes aparte. Exportar CSV UTF-8 con BOM, celdas entre comillas y neutralización de fórmulas.
- **HU-38 · check-in:** `Registration.checkedInAt`. Botón "Asistió"/"Deshacer" en la convocatoria y contador. QR en `/inscripcion/[registration]` que apunta a `/admin/[club]/convocatorias/[event]/asistencia/[registration]` (solo organizador, el GET no marca).
- **HU-37 · flyer:** `convocatorias/[event]/flyer` devuelve un PNG 1080×1920 con `next/og`: fecha, lugar, precio, cupos y link. Botón descargar/compartir en la convocatoria.

## Decisiones a aprobar

1. **Cobro manual de la suscripción:** el club paga a Convoley por Yape o transferencia y el dueño registra el pago en `/plataforma`. Cada pago suma 30 días desde `max(vencimiento, hoy)`. Mercado Pago con la cuenta de Convoley queda para después; `SubscriptionPayment` ya lo permite.
2. **Dueño de Convoley:** correo en `PLATFORM_ADMIN_EMAILS` y cuenta de Google. Sin permiso, 404.
3. **Prueba:** 30 días desde la creación del club; los clubes existentes, 30 días desde la migración. Sin días de gracia.
4. **Aviso antes de vencer:** banner en `/admin/[club]` desde 7 días antes. Sin correos ni WhatsApp.
5. **Solo lectura:** se bloquean todas las escrituras del organizador. Lo del jugador sigue funcionando en lo ya publicado.
6. **Suspender** fuerza solo lectura aunque esté pagado. Reactivar solo quita la suspensión.
7. **Finanzas:** recaudado = pagos aprobados de inscripciones y pedidos (con cargo por servicio, sin descontar comisión de Mercado Pago). Convocatorias por `startsAt` en Lima; planes por fecha de pago. Costo de cancha solo desde Finanzas.
8. **Check-in:** se puede marcar en cualquier momento y deshacer.
9. **Flyer:** privado del organizador, solo 9:16, con los cupos del momento.

## Avance

- [x] HU-35 · Suscripción con prueba gratis y solo lectura
- [x] HU-36 · Panel del dueño de Convoley
- [x] HU-34 · Finanzas
- [x] HU-38 · Check-in con QR
- [x] HU-37 · Flyer 9:16

## Riesgos

- **Pago registrado dos veces:** `FOR UPDATE` + `expectedPaidUntil`.
- **Olvidar el guard en una acción nueva:** convención `requireOrganizerToEdit` en toda server action del admin; el `reviewer` lo busca.
- **Zona horaria:** meses con `limaMonthRange` (UTC−5 fijo).
- **CSV en Excel:** BOM para tildes; con separador `;` regional puede abrirse en una columna.
- **Superadmin:** sin el chequeo de Google, alguien podría registrarse con el correo del dueño.
- **QR sin `uqr`:** HU-38 sale solo con check-in manual.

## Decisiones tomadas sin consultar

- **Doble pago de suscripción**: en vez de `FOR UPDATE`, un `UPDATE ... WHERE paidUntil = <el que vio el formulario>` dentro de la transacción. Si no actualiza ninguna fila, no se registra el pago. El efecto es el mismo con menos código.
- **Suscripción perezosa**: si un club no tiene fila de `Subscription`, se crea con 30 días de prueba la primera vez que se consulta. Los clubes nuevos la crean al registrarse.
- **Sin enlace a Finanzas para el ayudante**: Finanzas y Suscripción requieren `manage_club`.
- **Recaudado (HU-34)**: suma los pagos `approved` aunque la inscripción se haya cancelado después. Si el jugador cancela, el dinero se convierte en saldo a favor o se devuelve por fuera de Convoley, y eso no se refleja aquí.
- **Reporte de finanzas en `app/`** (`finanzas/finance-report.ts`): combina lecturas de cuatro módulos, sin reglas de dominio propias. El reviewer sugirió moverlo a un caso de uso; se dejó así para no crear puertos con una sola implementación.
- **Check-in en solo lectura**: un club en solo lectura tampoco puede marcar asistencia. Es coherente con HU-35. Si molesta el día del partido, basta con cambiar `checkInAction` a `requireOrganizer`.
- **QR**: lo ve el jugador mientras ocupa cupo (pendiente, en revisión o pagado), si la convocatoria no está cancelada.
- **Flyer**: se muestra solo en convocatorias publicadas o llenas.
- **Pendiente anotado**: `SubscriptionPayment` → `Subscription` usa `RESTRICT`. Si algún día se borran clubes con pagos registrados, habrá que ajustarlo. Un `clubId` manipulado en `/plataforma` da error 500; solo afecta al dueño.
- **Dependencias**: se instaló `uqr` (aprobado). La worktree no tenía `node_modules`: se corrió `npm ci` con el lockfile.
