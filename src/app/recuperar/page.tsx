import { AuthLink, AuthShell } from "@/components/auth-shell";
import { RequestResetForm } from "./request-reset-form";

export default function RequestResetPage() {
  return (
    <AuthShell
      title="Recupera tu contraseña"
      description="Escribe el correo de tu cuenta y te enviamos un link."
    >
      <RequestResetForm />
      <p className="border-t pt-4 text-center text-sm text-muted-foreground">
        ¿La recordaste? <AuthLink href="/ingresar">Vuelve a ingresar</AuthLink>
      </p>
    </AuthShell>
  );
}
