import Link from "next/link";
import { RequestResetForm } from "./request-reset-form";

export default function RequestResetPage() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 px-4 py-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Recupera tu contraseña</h1>
        <p className="text-sm text-zinc-500">
          Escribe el correo de tu cuenta y te enviamos un link.
        </p>
      </div>
      <RequestResetForm />
      <Link href="/ingresar" className="text-center text-sm underline underline-offset-4">
        Volver a ingresar
      </Link>
    </main>
  );
}
