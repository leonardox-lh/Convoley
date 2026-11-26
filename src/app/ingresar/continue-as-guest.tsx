import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { safeReturnPath } from "./sign-in-with-password";

// Guests have no panel: send them back where they came from (an event), never to /admin.
function guestPath(returnParam: unknown): string {
  if (typeof returnParam !== "string") return "/";
  const path = safeReturnPath(returnParam);
  return path.startsWith("/admin") ? "/" : path;
}

/** Players can sign up for events without an account, so the auth screens offer a way out. */
export function ContinueAsGuest({ returnParam }: { returnParam: unknown }) {
  return (
    <Link
      href={guestPath(returnParam)}
      className="group inline-flex items-center justify-center gap-1.5 self-center text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
    >
      Continuar como invitado
      <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
    </Link>
  );
}
