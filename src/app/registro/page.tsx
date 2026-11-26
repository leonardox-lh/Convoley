import { Suspense } from "react";
import { AuthLink, AuthShell } from "@/components/auth-shell";
import { PASSWORD_MIN_LENGTH } from "@/modules/identity";
import { GoogleSignInButton } from "../ingresar/google-sign-in-button";
import { RETURN_PATH_PARAM, safeReturnPath } from "../ingresar/sign-in-with-password";
import { SignUpForm } from "./sign-up-form";

export default function SignUpPage({ searchParams }: PageProps<"/registro">) {
  return (
    <AuthShell
      title="Crea tu cuenta"
      description="Luego creas tu club y publicas tu primera convocatoria."
    >
      <Suspense>
        <SignUpWithReturn searchParams={searchParams} />
      </Suspense>
      <p className="border-t pt-4 text-center text-sm text-muted-foreground">
        ¿Ya tienes cuenta? <AuthLink href="/ingresar">Ingresa</AuthLink>
      </p>
    </AuthShell>
  );
}

async function SignUpWithReturn({
  searchParams,
}: {
  searchParams: PageProps<"/registro">["searchParams"];
}) {
  const returnPath = safeReturnPath((await searchParams)[RETURN_PATH_PARAM]);
  return (
    <>
      <GoogleSignInButton returnPath={returnPath} />
      <SignUpForm passwordMinLength={PASSWORD_MIN_LENGTH} returnPath={returnPath} />
    </>
  );
}
