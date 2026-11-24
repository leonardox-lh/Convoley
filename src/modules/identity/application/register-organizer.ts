import { normalizeEmail } from "../domain/email";
import { EmailAlreadyRegisteredError } from "../domain/errors";
import { Password } from "../domain/password";
import type { PasswordHasher, UserAccountRepository } from "./ports";

export type RegisterOrganizerInput = { name: string; email: string; password: string };

export function makeRegisterOrganizer(deps: {
  users: UserAccountRepository;
  hasher: PasswordHasher;
}) {
  return async function registerOrganizer(input: RegisterOrganizerInput): Promise<{ id: string }> {
    const email = normalizeEmail(input.email);
    const password = Password.create(input.password);
    if (await deps.users.findByEmail(email)) throw new EmailAlreadyRegisteredError(email);

    const passwordHash = await deps.hasher.hash(password.value);
    return deps.users.create({ email, name: input.name.trim(), passwordHash });
  };
}
