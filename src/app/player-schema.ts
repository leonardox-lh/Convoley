import { z } from "zod";
import { PLAYER_GENDERS, PLAYER_LEVELS, PLAYER_POSITIONS } from "@/modules/registrations";

const NAME_MAX_LENGTH = 60;

/** Player name field, shared by guest sign-up and the organizer's manual add. */
export const nameField = (missing: string) =>
  z.string().trim().min(1, missing).max(NAME_MAX_LENGTH, "Ese nombre es muy largo.");

export const PHONE_FORMAT_MESSAGE = "Escribe un celular peruano de 9 dígitos que empiece con 9.";

// An empty <select> sends "": that means "no answer", not an invalid value.
const emptyAsUndefined = (value: unknown) => (value === "" ? undefined : value);

/** Optional position and level of the sign-up form (HU-10). */
export const positionField = z.preprocess(emptyAsUndefined, z.enum(PLAYER_POSITIONS).optional());
export const levelField = z.preprocess(emptyAsUndefined, z.enum(PLAYER_LEVELS).optional());
/** HU-31: asked only in mixed events, where the form makes it required. */
export const genderField = z.preprocess(emptyAsUndefined, z.enum(PLAYER_GENDERS).optional());
