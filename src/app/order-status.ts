import type { OrderStatus } from "@/modules/store";

/** How an order's status reads in the interface (HU-24, HU-25). */
export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  pending_payment: "Pendiente de pago",
  in_review: "Pago en revisión",
  paid: "Pagado",
  delivered: "Entregado",
  cancelled: "Cancelado",
};
