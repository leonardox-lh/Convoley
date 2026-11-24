/** Mercado Pago status_detail → what the player can do about it (HU-19). */
const REJECTION_MESSAGES: Record<string, string> = {
  cc_rejected_insufficient_amount:
    "No tienes saldo suficiente. Prueba con otra tarjeta o con Yape.",
  cc_rejected_bad_filled_security_code: "El código de seguridad (CVV) no es correcto.",
  cc_rejected_bad_filled_date: "La fecha de vencimiento de la tarjeta no es correcta.",
  cc_rejected_bad_filled_card_number: "Revisa el número de tu tarjeta.",
  cc_rejected_bad_filled_other: "Revisa los datos e inténtalo de nuevo.",
  cc_rejected_call_for_authorize:
    "Tu banco pide que autorices este pago. Llámalos o prueba con otro medio.",
  cc_rejected_card_disabled: "Tu tarjeta no está activa. Actívala con tu banco o usa otra.",
  cc_rejected_duplicated_payment: "Ya hiciste un pago igual hace un momento. Revisa tu estado.",
  cc_rejected_high_risk: "Mercado Pago rechazó el pago por seguridad. Prueba con otro medio.",
  cc_rejected_max_attempts: "Llegaste al límite de intentos. Prueba con otro medio de pago.",
  cc_rejected_card_type_not_allowed: "Ese medio de pago no está permitido. Prueba con otro.",
  cc_amount_rate_limit_exceeded: "Superaste el monto máximo de Yape. Prueba con tarjeta.",
  cc_rejected_form_error: "El código de Yape no es correcto o ya venció. Genera uno nuevo.",
};

const GENERIC_REJECTION = "No se pudo completar el pago. Revisa tus datos o prueba con otro medio.";

export function rejectionMessage(statusDetail: string | null): string {
  return (statusDetail && REJECTION_MESSAGES[statusDetail]) || GENERIC_REJECTION;
}
