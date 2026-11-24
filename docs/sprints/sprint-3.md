# Sprint 3 · Pago automático con Mercado Pago

Rama: `feat/sprint-3-mercado-pago` (sale de `feat/sprint-2-mvp-pilot`). Plan aprobado por el usuario el 2026-11-24 en modo rápido: sin aprobación por historia.
Orden: HT-05 → HU-18 → HU-19 → HU-20 → HU-21 → HU-22. Un commit por historia, un test por criterio, revisión del `reviewer` al final.

## Plan aprobado

- **Sin librerías npm nuevas.** Servidor: `fetch` a `api.mercadopago.com` con el access token OAuth del organizador, `X-Idempotency-Key`, céntimos → soles solo en el gateway, se rechaza moneda distinta de PEN. Navegador: SDK JS v2 desde `https://sdk.mercadopago.com/js/v2` con `next/script` (Card Payment Brick para tarjeta; `mp.yape({ phoneNumber, otp }).create()` para Yape).
- **Datos (4 migraciones, una por historia):**
  - HU-18: `MercadoPagoConnection` (módulo `payments`): `clubId @unique`, `mpUserId @unique`, `accessTokenEncrypted`, `refreshTokenEncrypted`, `publicKey`, `expiresAt`, `liveMode`, `connectedByUserId`. Tokens cifrados con AES-256-GCM (`node:crypto`) y `MP_TOKEN_ENCRYPTION_KEY`.
  - HU-19/20: `PaymentStatus` + `refund_pending`, `refunded`; `Payment.serviceFeeCents Int @default(0)`, `Payment.providerStatusDetail String?`; `amountCents` = precio + cargo.
  - HU-21: `Registration.reservedUntil DateTime?`.
  - HU-22: `Club.serviceFeeFixedCents`, `Club.serviceFeePercentBps` (como máximo uno distinto de 0; límite S/ 50 fijo o 20 %; redondeo hacia arriba al céntimo).
- **payments:** dominio `service-fee.ts`, `mercado-pago-status.ts`, errores; puertos `MercadoPagoGateway` (exchangeCode, refreshToken, createPayment, getPayment, refund) y `MercadoPagoConnectionRepository`; casos de uso connect / disconnect / valid-access-token (renueva si faltan menos de 7 días) con fakes; infraestructura: gateway HTTP, `token-cipher`, repositorio Prisma, `oauth-state` (HMAC con `AUTH_SECRET` sobre clubId:userId:exp, 10 min, como `voucher-url.ts`), `webhook-signature` (`x-signature` `ts=…,v1=…` + `x-request-id`, manifest `id:<data.id en minúsculas>;request-id:<id>;ts:<ts>;`, HMAC-SHA256 con `MP_WEBHOOK_SECRET`, `timingSafeEqual`).
- **registrations (orquesta los cupos):** `RESERVATION_MINUTES = 10`; función pura `settlementDecision` → `mark_paid | take_free_seat | refund_to_waitlist | refund | ignore`; `application/seats.ts` (`releaseExpiredReservations` + `fillFreedSeats`, y `remove-registration` lo reutiliza; actualizar el estado del evento en memoria tras reabrir).
  - `startMercadoPagoPayment`: en transacción bloquea el evento, libera vencidas, exige `pending_payment`, monto = precio del evento bloqueado + cargo del club, crea `Payment` pendiente. Fuera de la transacción: crea el pago en MP con `external_reference = Payment.id`, idempotencia = `Payment.id`, **sin** `application_fee` ni `marketplace_fee`; luego guarda el id de MP y liquida con la respuesta del servidor.
  - `settleMercadoPagoPayment`: busca por `providerPaymentId` o `external_reference`; la verdad sale de `GET /v1/payments/{id}`; valida club, monto exacto y PEN; en transacción bloquea, libera vencidas y es idempotente si el pago ya está en estado final. Devoluciones fuera de la transacción con `POST /v1/payments/{id}/refunds` (clave `refund-<Payment.id>`); si fallan, 500 para que MP reintente.
  - Los conteos de cupos excluyen `pending_payment` con `reservedUntil <= ahora`; `setStatus` siempre limpia `reservedUntil`; `registerGuest` pone `reservedUntil` solo si el club tiene MP conectado.
- **clubs:** cargo por servicio en la configuración de pagos (solo admin).
- **app:** `/admin/[club]/pagos` (conectar, "Conectado como…", desconectar con aviso de revocar también en MP, formulario del cargo); route handlers `api/mercado-pago/connect`, `api/mercado-pago/callback` y `api/webhooks/mercado-pago` (Zod `type=payment` y `data.id`; firma inválida → 401; 200 o 500); checkout en `/inscripcion/[registration]` con precio + cargo + total, pestañas Yape | Tarjeta, hora límite de la reserva en Lima y voucher como opción secundaria; `payWithMercadoPagoAction` con Zod (celular de 9 dígitos que empieza con 9 vía `PhoneNumber`, código de 6 dígitos, correo) y mensajes en español por `status_detail`. `src/lib/env.ts` + `.env.example`: `MP_CLIENT_ID`, `MP_CLIENT_SECRET`, `MP_WEBHOOK_SECRET`, `MP_TOKEN_ENCRYPTION_KEY` (obligatorias solo en producción; en desarrollo la app arranca sin ellas).

## Decisiones aprobadas

1. Sin librerías npm nuevas.
2. Tokens del organizador cifrados con `MP_TOKEN_ENCRYPTION_KEY`, separada de `AUTH_SECRET`.
3. Se confirma con la respuesta directa de MP y con el webhook, con el mismo caso de uso idempotente.
4. Si llega el pago y ya no hay cupo: devolución automática y el jugador pasa al final de la lista de espera.
5. Reserva de 10 minutos solo en clubes con MP; no para altas manuales ni para quien sube de la espera.
6. Se pide correo al jugador al pagar (MP lo exige; con Google se completa solo).
7. Cargo por servicio por club, solo para pagos con MP. El voucher sigue disponible. Desconectar conserva el historial. Un pago aprobado después de cancelar la convocatoria se devuelve automáticamente. Clubes sin MP funcionan igual que en el Sprint 2.

## Credenciales que crea el usuario (HT-05)

1. En el panel de desarrolladores de Mercado Pago Perú: crear una aplicación (Checkout API / pagos online, con OAuth) → `MP_CLIENT_ID` y `MP_CLIENT_SECRET`.
2. Crear 2–3 usuarios de prueba de Perú: vendedor (organizador), comprador, integrador opcional. Guardarlos fuera del repo.
3. URL de redirección: `<APP_URL>/api/mercado-pago/callback` (si no acepta localhost, usar la URL del túnel).
4. Webhooks en modo prueba: `<APP_URL>/api/webhooks/mercado-pago`, evento "Pagos" → `MP_WEBHOOK_SECRET`.
5. `MP_TOKEN_ENCRYPTION_KEY`: `openssl rand -base64 32`.
6. Túnel para recibir webhooks en local: `cloudflared tunnel --url http://localhost:3000`.

Todo va en `.env.local` (no versionado), nunca en el chat ni en el repo.

## Por confirmar en el sandbox

- Valores exactos de prueba de Yape.
- Si MP acepta `localhost` como URL de redirección.
- Si los webhooks de pagos creados con el token del vendedor llegan firmados al webhook de la app.

## Avance

- [ ] HT-05 · Credenciales de prueba en variables de entorno
- [ ] HU-18 · Conectar Mercado Pago
- [ ] HU-19 · Pagar con Yape o tarjeta
- [ ] HU-20 · Webhook marca pagado
- [ ] HU-21 · Reserva de 10 minutos
- [ ] HU-22 · Cargo por servicio

## Decisiones tomadas sin consultar
