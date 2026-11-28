import type { OrderStatus } from "@/modules/store";

/** How an order's status reads in the interface (HU-24, HU-25). */
export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  pending_payment: "Pendiente de pago",
  in_review: "Pago en revisión",
  paid: "Pagado",
  delivered: "Entregado",
  cancelled: "Cancelado",
};

/** The status pill's colors, the same family as the registrations' (registration-status.ts). */
export const ORDER_STATUS_BADGE_CLASSES: Record<OrderStatus, string> = {
  pending_payment: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
  in_review: "bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300",
  paid: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
  delivered: "bg-primary/10 text-primary",
  cancelled: "bg-zinc-100 text-zinc-600 dark:bg-zinc-900 dark:text-zinc-400",
};
