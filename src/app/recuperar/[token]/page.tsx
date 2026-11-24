import type { Metadata } from "next";
import { Suspense } from "react";
import { PASSWORD_MIN_LENGTH } from "@/modules/identity";
import { ResetPasswordForm } from "./reset-password-form";

type Props = PageProps<"/recuperar/[token]">;

// The token is in the URL: never send it to other sites as the Referer.
export const metadata: Metadata = { referrer: "no-referrer" };

export default function ResetPasswordPage({ params }: Props) {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 px-4 py-8">
      <h1 className="text-2xl font-semibold tracking-tight">Crea una nueva contraseña</h1>
      <Suspense>
        <ResetPasswordContent params={params} />
      </Suspense>
    </main>
  );
}

async function ResetPasswordContent({ params }: { params: Props["params"] }) {
  const { token } = await params;
  return <ResetPasswordForm token={token} passwordMinLength={PASSWORD_MIN_LENGTH} />;
}
