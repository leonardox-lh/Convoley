import type { RegistrationStatus } from "@/modules/registrations";

/** How each registration status reads to players and organizers. */
export const REGISTRATION_STATUS_LABELS: Record<RegistrationStatus, string> = {
  pending_payment: "Pendiente de pago",
  in_review: "En revisión",
  paid: "Pagado",
  cancelled: "Cancelado",
};

export const REGISTRATION_STATUS_BADGE_CLASSES: Record<RegistrationStatus, string> = {
  pending_payment: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
  in_review: "bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300",
  paid: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
  cancelled: "bg-zinc-100 text-zinc-600 dark:bg-zinc-900 dark:text-zinc-400",
};
