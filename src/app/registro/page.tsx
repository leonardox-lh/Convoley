import Link from "next/link";
import { PASSWORD_MIN_LENGTH } from "@/modules/identity";
import { SignUpForm } from "./sign-up-form";

export default function SignUpPage() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 px-4 py-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Crea tu cuenta de organizador</h1>
        <p className="text-sm text-zinc-500">
          Luego creas tu club y publicas tu primera convocatoria.
        </p>
      </div>
      <SignUpForm passwordMinLength={PASSWORD_MIN_LENGTH} />
      <p className="text-center text-sm">
        ¿Ya tienes cuenta?{" "}
        <Link href="/ingresar" className="underline underline-offset-4">
          Ingresa
        </Link>
      </p>
    </main>
  );
}
