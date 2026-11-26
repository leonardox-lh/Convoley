import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthShell } from "@/components/auth-shell";
import { PASSWORD_MIN_LENGTH } from "@/modules/identity";
import { ResetPasswordForm } from "./reset-password-form";

type Props = PageProps<"/recuperar/[token]">;

// The token is in the URL: never send it to other sites as the Referer.
export const metadata: Metadata = { referrer: "no-referrer" };

export default function ResetPasswordPage({ params }: Props) {
  return (
    <AuthShell title="Crea una nueva contraseña" description="Elige una que no uses en otro sitio.">
      <Suspense>
        <ResetPasswordContent params={params} />
      </Suspense>
    </AuthShell>
  );
}

async function ResetPasswordContent({ params }: { params: Props["params"] }) {
  const { token } = await params;
  return <ResetPasswordForm token={token} passwordMinLength={PASSWORD_MIN_LENGTH} />;
}
