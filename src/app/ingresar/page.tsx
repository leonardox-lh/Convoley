import Link from "next/link";
import { Suspense } from "react";
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
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 px-4 py-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Ingresa a Convoley</h1>
        <p className="text-sm text-zinc-500">Para organizar las convocatorias de tu club.</p>
      </div>

      <Suspense>
        <SignInOptions searchParams={searchParams} />
      </Suspense>
    </main>
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

      <div className="flex flex-col gap-2 text-center text-sm">
        <Link href="/recuperar" className="underline underline-offset-4">
          Olvidé mi contraseña
        </Link>
        <p>
          ¿No tienes cuenta?{" "}
          <Link href={signUpHref} className="underline underline-offset-4">
            Regístrate
          </Link>
        </p>
      </div>
    </>
  );
}
