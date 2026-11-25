# Sprint 4 · Tienda y planes

Rama: `feat/sprint-4-tienda-planes` (sale de `main`, que ya tiene el Sprint 3, commit `bb56668`).
Orden: HU-23 → HU-24 → HU-25 → HU-26 → HU-27. Un commit por historia, un test por criterio y revisión del `reviewer` al final.
Modo: rápido, como en el Sprint 3 (sin aprobación por historia), una vez aprobado este plan. **Plan pendiente de aprobación.**

## Plan propuesto

- **Sin librerías npm nuevas.** Las fotos de productos usan el mismo bucket y patrón que los logos (`clubs/infrastructure/s3-logo-storage.ts` + `/logos/[key]`). El pago reutiliza el gateway, el webhook y el voucher de MP del Sprint 3.
- **Estado actual:** `Product`, `ProductVariant`, `Order` (con `OrderStatus`), `OrderItem` y `Payment.orderId` ya existen en el esquema desde HT-03, junto con el CHECK XOR de `Payment` y los CHECKs de stock/cantidad ≥ 0. Los módulos `store` y `plans` todavía no existen. "Comunidad" ya existe: es `Community` (módulo `clubs`) y `Event.communityId` apunta a ella.
- **Datos (2 migraciones):**
  - HU-23, HU-24 y HU-25: **ninguna**. Ya está todo en el esquema.
  - HU-26 `add_plans`: `Plan { id, clubId, name, priceCents, creditCount?, validityDays?, communityIds String[], isActive @default(true), createdAt, updatedAt }`. CHECKs: `priceCents > 0`, `creditCount > 0` o null, `validityDays > 0` o null, al menos uno de los dos no null.
  - HU-27 `add_plan_purchases`: `enum PlanPurchaseStatus { pending_payment, in_review, active, cancelled }`. `PlanPurchase { id, clubId, planId, userId?, firstName, lastName, phone, status, priceCents (congelado), creditsRemaining? (null = sin límite), validityDays? (congelado), paidAt?, expiresAt?, timestamps }` con CHECK de celular y `creditsRemaining >= 0`, índices `[clubId, phone]` y `[userId]`. `CreditUse { id, planPurchaseId, registrationId @unique, createdAt }`. `Payment.planPurchaseId?` y el CHECK XOR cubre los 3 dueños. Actualizar `docs/MODELO_DATOS.md`.
- **payments (generalizar, no duplicar):**
  - `recordMercadoPagoPayment`, `recordVoucherPayment`, `findVoucherInReview`, `listVouchersInReview` y `findLastVoucherRejection` reciben un `PaymentOwner = { registrationId } | { orderId } | { planPurchaseId }`.
  - `mercadoPagoGatewayAdapter` (con `toReport` y `ChargeReport`) pasa de `registrations/infrastructure` a `payments` como `mercadoPagoGateway`.
  - `settleMercadoPagoNotification` pasa a `payments/application/resolve-notification.ts`: `resolveMercadoPagoNotification({ providerPaymentId, mpUserId })` → `{ clubId, report, owner: "registration" | "order" | "plan_purchase" } | null`, con un solo `GET /v1/payments/{id}`.
  - `external_reference` sigue siendo `Payment.id`, sin prefijo: la fila ya dice quién es el dueño.
  - El webhook resuelve y despacha con un `switch` a `settleMercadoPagoPayment` (registrations), `settleOrderPayment` (store) o `settlePlanPurchasePayment` (plans). Firma, Zod y respuesta 200/500 no cambian.
- **store (HU-23..25):**
  - domain: `product.ts` (máx. 5 fotos, precio > 0; una variante con `size = null` o todas con talla, tallas únicas, stock ≥ 0), `cart.ts` (cantidad 1–`MAX_QUANTITY_PER_ITEM = 10`, total = Σ cantidad × `unitPriceCents`), `order.ts` (`pending_payment → in_review → paid → delivered`, `cancelled`), `order-settlement.ts` (función pura → `mark_paid | out_of_stock_refund | refund | mark_rejected | keep_pending | ignore`), `errors.ts`.
  - application: `createProduct`, `updateProduct` (no se borran variantes con ventas: stock 0), `addProductPhoto`, `removeProductPhoto`, `setProductActive`, `listStoreProducts`, `createOrder`, `startOrderMercadoPagoPayment`, `settleOrderPayment`, `submitOrderVoucher`, `approveOrderVoucher`, `rejectOrderVoucher`, `listOrders(status?)`, `markOrderDelivered`.
  - Puertos: `ProductRepository`, `OrderRepository` (con `lockForPayment` y `lockVariants` `FOR UPDATE ORDER BY id`), `ProductImageStorage`, `PickupEvents`, `MercadoPagoGateway`, `PaymentRecords`, `ServiceFees`, `TransactionRunner`.
  - infrastructure: repositorios Prisma, `s3-product-image-storage` y adaptadores a `events`, `payments` y `clubs` (solo vía `index.ts`).
- **plans (HU-26, HU-27):**
  - domain: `plan.ts`, `credit.ts` (`pickPurchaseForCredit(purchases, { communityId, eventStartsAt })`: compra activa, comunidad incluida, `eventStartsAt < expiresAt`, créditos > 0 o sin límite; primero la que vence antes), `errors.ts`.
  - application: `createPlan`, `setPlanActive`, `listClubPlans`, `buyPlan`, `startPlanMercadoPagoPayment`, `settlePlanPurchasePayment`, `submitPlanVoucher`, `approvePlanVoucher`, `rejectPlanVoucher` (activar = `paidAt = ahora`, `expiresAt = paidAt + validityDays`), `getCreditBalance`, `consumeCredit(input, tx)`, `restoreCredit(registrationId, tx)`, `restoreCreditsForEvent(registrationIds, tx)`.
- **registrations:** `payWithCredit(registrationId)` en transacción: bloquear evento → liberar reservas vencidas → `assertAwaitingPayment` → `Credits.consume(...)` → `setStatus(paid)`. No crea `Payment` (no entra dinero nuevo). `removeRegistration` llama a `Credits.restore`.
- **events:** `cancelEvent` también llama a `restoreCreditsForEvent` en la misma transacción.
- **app:**
  - Organizador: `/admin/[club]/tienda` (productos; fotos una por llamada por el `bodySizeLimit` de 6 MB), `/admin/[club]/pedidos` (filtro `?estado=`, voucher con URL firmada, aprobar/rechazar, "Marcar como entregado"), `/admin/[club]/planes` (crear, activar/desactivar, vouchers por revisar).
  - Jugador: `/fotos/[key]` (público, como `/logos`), `/[club]/tienda` (catálogo + carrito en estado React, convocatoria de recojo, nombre y celular), `/pedido/[order]` (checkout), `/[club]/planes`, `/plan/[purchase]` (checkout y créditos restantes).
  - El checkout de `/inscripcion/[registration]` (Yape | Tarjeta + voucher) se extrae a un componente que recibe las server actions por props y se reutiliza en `/pedido` y `/plan`.
  - En `/inscripcion/[registration]`: "Tienes N créditos · Usar crédito". En `/mis-inscripciones`: créditos restantes del jugador con Google.

## Decisiones a aprobar

1. `Payment` polimórfico con `planPurchaseId?` y CHECK XOR de 3. `external_reference = Payment.id` sin prefijo. El webhook resuelve el dueño en `payments` y despacha a la liquidación del módulo dueño.
2. El stock **no se reserva** mientras se paga; se descuenta al liquidar, bloqueando pedido y variantes. Si se agotó: con MP, devolución automática y pedido `cancelled`; con voucher no se puede aprobar ("Agotado: rechaza el voucher y devuélvele el dinero por Yape"), porque Convoley no mueve dinero.
3. Carrito en el cliente (estado React, sin persistencia) y de un solo club. Precios y totales se recalculan en el servidor y quedan congelados en `OrderItem`.
4. El cargo por servicio de HU-22 también se aplica a pedidos y planes pagados con MP. El voucher no lleva cargo.
5. Recojo: solo en convocatorias del mismo club, `published` o `full` y futuras. Si esa convocatoria se cancela, el pedido no cambia.
6. "Aplica a ciertas comunidades" = `Plan.communityIds` (al menos una). El crédito vale si `Event.communityId` está en la lista.
7. Un plan tiene número de fechas, vigencia en días o los dos. Sin número de fechas es ilimitado durante la vigencia (mensualidad). La vigencia cuenta desde el pago. Los planes no se editan, solo se desactivan.
8. Identidad: la compra guarda el celular normalizado (obligatorio) y `userId` si entró con Google. El crédito vale para una inscripción con el mismo celular o `userId`. Riesgo aceptado: sin códigos, alguien con tu celular podría usar tu crédito; el saldo nunca se muestra en una búsqueda por celular.
9. El crédito vuelve si el organizador quita la inscripción o cancela la convocatoria (si el plan ya venció, vuelve pero no se puede usar).
10. "Marcar como entregado": admin y ayudante. Productos y planes: solo admin.

## Avance

- [ ] HU-23 · Publicar productos
- [ ] HU-24 · Comprar con carrito y pagar
- [ ] HU-25 · Gestionar pedidos
- [ ] HU-26 · Crear planes
- [ ] HU-27 · Comprar plan y usar créditos

## Decisiones tomadas sin consultar

- HU-23 a HU-25 sin migración: el esquema de la tienda ya existe desde HT-03.
- Los pedidos `pending_payment` abandonados se quedan así (no descuentan stock); "Pendiente" en HU-25 reúne `pending_payment` e `in_review`. Sin cancelación manual de pedidos (no se pidió).
- Un segundo pago MP aprobado de un pedido o plan ya pagado se devuelve automáticamente, igual que en inscripciones.
- Tallas: texto libre corto (máx. 10 caracteres); `size = null` = talla única.
- Mover `settleMercadoPagoNotification` a `payments` toca el webhook del Sprint 3: sus tests se mueven y deben seguir en verde antes de agregar pedidos.
