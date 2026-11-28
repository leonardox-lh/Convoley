import { Suspense } from "react";
import { AuthLink, AuthShell } from "@/components/auth-shell";
import { GoogleSignInButton } from "./google-sign-in-button";
import { SignInForm } from "./sign-in-form";
import { RETURN_PATH_PARAM, safeReturnPath } from "./sign-in-with-password";

// Errors Auth.js puts in ?error= when it redirects back here (Google sign-in).
const REDIRECT_ERRORS: Record<string, string> = {
  OAuthAccountNotLinked:
    "Ese correo ya tiene una cuenta con contraseña. Ingresa con tu correo y contraseña, o recupérala.",
};
const GENERIC_REDIRECT_ERROR = "No pudimos iniciar tu sesión. Vuelve a intentarlo.";

type SearchParams = PageProps<"/ingresar">["searchParams"];

export default function SignInPage({ searchParams }: PageProps<"/ingresar">) {
  return (
    <AuthShell title="Ingresa a tu cuenta" description="Qué bueno verte de nuevo.">
      <Suspense>
        <SignInOptions searchParams={searchParams} />
      </Suspense>
    </AuthShell>
  );
}

async function SignInOptions({ searchParams }: { searchParams: SearchParams }) {
  const { error, [RETURN_PATH_PARAM]: returnParam } = await searchParams;
  const code = typeof error === "string" ? error : undefined;
  const returnPath = safeReturnPath(returnParam);
  const signUpHref =
    typeof returnParam === "string"
      ? `/registro?${new URLSearchParams({ [RETURN_PATH_PARAM]: returnPath })}`
      : "/registro";
  return (
    <>
      <GoogleSignInButton returnPath={returnPath} />

      <SignInForm
        initialError={code && (REDIRECT_ERRORS[code] ?? GENERIC_REDIRECT_ERROR)}
        returnPath={returnPath}
      />

      <p className="-mt-1 text-center text-sm">
        <AuthLink href="/recuperar">¿Olvidaste tu contraseña?</AuthLink>
      </p>
      <p className="border-t pt-4 text-center text-sm text-muted-foreground">
        ¿No tienes cuenta? <AuthLink href={signUpHref}>Regístrate</AuthLink>
      </p>
    </>
  );
}
