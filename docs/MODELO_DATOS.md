# Modelo de datos

Fuente de verdad: [`prisma/schema.prisma`](../prisma/schema.prisma). Migraciones versionadas en `prisma/migrations/`. Este documento explica el porqué; si cambias el schema, actualiza el diagrama.

## Convenciones

- **Dinero**: `Int` en céntimos de sol, con sufijo `Cents` (`priceCents`, `amountCents`). Nunca `Float`.
- **Fechas**: `DateTime` en UTC. Se muestran en `America/Lima` (UTC−5 todo el año) en la interfaz.
- **Celulares**: guardados normalizados `+519XXXXXXXX`. Un `CHECK` en SQL lo exige en `User`, `Registration` y `Order`.
- **Archivos**: solo la key del bucket (`logoKey`, `imageKeys`, `proofFileKey`), nunca una URL. Los vouchers se leen con URL firmada (HT-04).
- **IDs**: `cuid()` en texto.
- **Borrado**: `Cascade` solo en hijos sin historial (`Account`, `Session`, `PasswordResetToken`, `ClubMember`, `Community`, `ProductVariant`, `OrderItem`). `Restrict` en todo lo que tiene dinero o historial. `SetNull` en los vínculos opcionales a `User`. Los clubes y convocatorias no se borran: se cancelan.

## Diagrama

```mermaid
erDiagram
  User ||--o{ Account : "tiene"
  User ||--o{ Session : "tiene"
  User ||--o{ PasswordResetToken : "recupera contraseña"
  User ||--o{ ClubMember : "es miembro"
  Club ||--o{ ClubMember : "tiene"
  Club ||--o{ Community : "agrupa"
  Club ||--o{ Event : "organiza"
  Community ||--o{ Event : "contiene"
  Event ||--o{ Registration : "recibe"
  User |o--o{ Registration : "opcional (invitado = sin user)"
  Registration ||--o{ Payment : "intentos de pago"
  Order ||--o{ Payment : "intentos de pago"
  Club ||--o{ Payment : "cobra"
  Club ||--o| MercadoPagoConnection : "cobra con"
  User |o--o{ Payment : "revisa voucher"
  Club ||--o{ Product : "vende"
  Product ||--o{ ProductVariant : "tallas"
  Club ||--o{ Order : "recibe"
  User |o--o{ Order : "opcional"
  Event ||--o{ Order : "punto de recojo"
  Order ||--o{ OrderItem : "contiene"
  ProductVariant ||--o{ OrderItem : "vendida en"

  User {
    string id PK
    string email UK
    string phone UK "+519XXXXXXXX"
    string passwordHash "solo organizadores con correo"
  }
  Club {
    string id PK
    string slug UK "convoley.pe/slug"
    string name
    string logoKey
  }
  ClubMember {
    string clubId FK
    string userId FK
    ClubRole role "admin | helper"
  }
  Community {
    string id PK
    string clubId FK
    string name "único por club"
  }
  Event {
    string id PK
    string clubId FK
    string communityId FK
    datetime startsAt "UTC"
    int priceCents
    int capacity
    EventStatus status
    CancellationOutcome cancellationOutcome "refund | balance, al cancelar"
  }
  Registration {
    string id PK
    string eventId FK
    string userId FK "null = invitado"
    string phone "único por evento"
    RegistrationStatus status
    datetime reservedUntil "HU-21: cupo reservado mientras paga con MP"
  }
  MercadoPagoConnection {
    string clubId FK,UK
    string mpUserId UK "cuenta del organizador"
    string accessTokenEncrypted "AES-256-GCM"
    string refreshTokenEncrypted "AES-256-GCM"
    string publicKey "para el SDK del navegador"
    datetime expiresAt
  }
  Payment {
    string id PK
    string registrationId FK "XOR orderId"
    string orderId FK
    int amountCents "precio + cargo por servicio"
    int serviceFeeCents
    PaymentMethod method
    PaymentStatus status
    string providerPaymentId UK "idempotencia webhook"
    string proofFileKey "voucher privado"
    CancellationOutcome cancellationOutcome "marca, no mueve dinero"
  }
  Product {
    string id PK
    string clubId FK
    int priceCents
    string[] imageKeys "máx 5"
  }
  ProductVariant {
    string id PK
    string productId FK
    string size "null = sin talla"
    int stock
  }
  Order {
    string id PK
    string clubId FK
    string pickupEventId FK
    int totalCents
    OrderStatus status
  }
  OrderItem {
    string orderId FK
    string variantId FK
    int quantity
    int unitPriceCents "precio congelado"
  }
```

`VerificationToken` (Auth.js) no tiene relaciones, no se usa todavía y se omite del diagrama. Recuperar la contraseña usa `PasswordResetToken`.

## Tablas por módulo

| Módulo | Tablas | Historias |
|---|---|---|
| `identity` | `User`, `Account`, `Session`, `VerificationToken`, `PasswordResetToken` | HU-01, HU-48 |
| `clubs` | `Club`, `ClubMember`, `Community` | HU-01, HU-02, HU-09, HU-33 |
| `events` | `Event` | HU-03, HU-04, HU-05 |
| `registrations` | `Registration` | HU-06, HU-07, HU-08, HU-48 |
| `payments` | `Payment`, `MercadoPagoConnection` | HU-08, HU-14, HU-15, HU-18, HU-19, HU-20 |
| `store` | `Product`, `ProductVariant`, `Order`, `OrderItem` | HU-23, HU-24, HU-25 |
| `plans` | `Plan` | HU-26 |

Cada módulo solo lee y escribe sus propias tablas (ver `docs/ARQUITECTURA.md`). `Event.clubId` se repite aunque se pueda sacar de la comunidad, para que `events` filtre por club sin consultar tablas de `clubs`.

## Decisiones

- **Invitado**: una `Registration` con `userId = null`. No hay tabla de invitados. En HU-48 se vincula por `phone`.
- **Inscripción duplicada**: `@@unique([eventId, phone])` la rechaza en la base incluso si llegan dos a la vez. Si alguien cancela y vuelve, se reactiva la misma fila.
- **Pagos**: una tabla para inscripciones y pedidos; un `CHECK` exige exactamente uno de `registrationId` u `orderId`. Una fila por intento: un voucher rechazado queda como historial y el siguiente es otra fila.
- **Recuperar contraseña (HU-01)**: `PasswordResetToken` guarda solo el sha256 del token del link (`tokenHash @unique`), vence en 1 hora y es de un solo uso: `usedAt` se marca con un `UPDATE ... WHERE usedAt IS NULL` en la misma transacción que cambia `passwordHash`. Pedir otro link borra los anteriores sin usar.
- **Webhook idempotente**: `providerPaymentId @unique`. Un pago en estado final (`approved`, `rejected`, `refunded`) no se vuelve a liquidar; `refund_pending` reintenta la devolución.
- **Mercado Pago por organizador (HU-18)**: `MercadoPagoConnection` guarda los tokens OAuth cifrados con `MP_TOKEN_ENCRYPTION_KEY`. Una cuenta de MP solo puede estar conectada a un club (`mpUserId @unique`). Desconectar borra la fila y conserva los pagos.
- **Cargo por servicio (HU-22)**: `Club.serviceFeeFixedCents` o `Club.serviceFeePercentBps` (puntos básicos), nunca los dos; un `CHECK` limita a S/ 50 o 20 %. Solo se suma en pagos con Mercado Pago y queda en `Payment.serviceFeeCents`; `amountCents` ya lo incluye.
- **Reserva de cupo (HU-21)**: con MP conectado, una inscripción `pending_payment` guarda `reservedUntil` (10 minutos). Vencida, no cuenta como cupo; la siguiente escritura del evento la pasa a `cancelled` y el cupo va a la lista de espera. Cualquier cambio de estado borra `reservedUntil`.
- **Planes (HU-26)**: `Plan` tiene `creditCount` (fechas; `null` = ilimitadas), `validityDays` (`null` = sin vencimiento) o ambos; un `CHECK` exige al menos uno, positivos, y precio > 0. `communityIds` es un arreglo de ids de `Community`: el plan solo vale en esas comunidades. Un plan no se edita, solo se desactiva (`isActive`), para no cambiar las condiciones de quien ya lo compró.
- **Convoley no retiene dinero**: no hay saldos ni cuentas internas; `Payment` solo registra lo que pasó en la cuenta de Mercado Pago del organizador.
- **Cancelar una convocatoria (HU-05)**: el organizador elige `refund` (devolución) o `balance` (saldo a favor). Se guarda en `Event.cancellationOutcome` (lo que ven los inscritos) y en cada `Payment` `approved` o `in_review` aún sin marcar, en la misma transacción. Es solo una marca: la devolución la hace el organizador en Mercado Pago. HU-14 debe marcar igual un pago que se apruebe después de la cancelación.
- **Confirmados**: las inscripciones que ocupan cupo son las que no están `cancelled` (pagadas o no). Los cupos no pueden bajar de ese número.
- **Estado `full`**: se guarda en `Event.status` (HU-04). Editar los cupos lo recalcula (HU-05). El caso de uso de inscripción (HU-06) debe contar y crear dentro de una transacción que bloquee la fila del evento (`SELECT ... FOR UPDATE`), para no sobrepasar el cupo.
- **CHECKs a mano**: formato de celular y XOR de pago al final de `*_init`; montos, cupo, stock y cantidades no negativos en `*_range_checks`. Prisma no los administra, así que las migraciones futuras no los borran.
- **Consistencia entre clubes**: la base no impide que `Payment.clubId` difiera del club de su inscripción o pedido, ni que `Order.pickupEventId` sea de otro club. Lo validan los casos de uso que crean esas filas (HU-08, HU-24).

## Pendiente: lo agrega la historia que lo usa

| Qué | Historia |
|---|---|
| Posición y nivel del jugador | HU-10 |
| Lista de espera (`WaitlistEntry`) | HU-12 |
| Configuración de Yape / QR | HU-13 |
| Planes y créditos | HU-26, HU-27 |
| Convocatorias recurrentes | HU-28 |
| Token de cancelación | HU-29 |
| Política de cancelación y saldo a favor | HU-30 |
| Equipos | HU-31 |
| Costo de cancha | HU-34 |
| Suscripción de Convoley | HU-35 |
| Check-in | HU-38 |

## Comandos

- `npx prisma migrate dev --name <nombre>` · nueva migración (luego `npx prisma generate`)
- `npx prisma db seed` · datos de prueba (idempotente; no corre en producción)
- `npm run test:integration` · migra y siembra una base `convoley_test` vacía
