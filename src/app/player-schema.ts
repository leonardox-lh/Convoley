import { z } from "zod";

const NAME_MAX_LENGTH = 60;

/** Player name field, shared by guest sign-up and the organizer's manual add. */
export const nameField = (missing: string) =>
  z.string().trim().min(1, missing).max(NAME_MAX_LENGTH, "Ese nombre es muy largo.");

export const PHONE_FORMAT_MESSAGE = "Escribe un celular peruano de 9 dígitos que empiece con 9.";
