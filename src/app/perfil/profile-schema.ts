import { z } from "zod";
import { PhoneNumber } from "@/modules/registrations";

const NAME_MAX_LENGTH = 60;

/** The phone is optional (organizers may not have one); when present it must be Peruvian. */
const phoneField = z
  .string()
  .trim()
  .transform((raw, ctx) => {
    if (!raw) return null;
    try {
      return PhoneNumber.parse(raw).value;
    } catch {
      ctx.addIssue({ code: "custom", message: "Escribe un celular peruano de 9 dígitos." });
      return z.NEVER;
    }
  });

export const profileSchema = z.object({
  firstName: z
    .string()
    .trim()
    .min(1, "Escribe tu nombre.")
    .max(NAME_MAX_LENGTH, "Tu nombre es muy largo."),
  lastName: z.string().trim().max(NAME_MAX_LENGTH, "Tu apellido es muy largo."),
  phone: phoneField,
});
