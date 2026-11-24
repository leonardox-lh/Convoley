import { redirect } from "next/navigation";
import { Suspense } from "react";
import { Button } from "@/components/ui/button";
import { currentUserId, SIGN_IN_PATH, signOut } from "@/modules/identity";

// Placeholder: HU-02 adds the club profile form here.
export default function NewClubPage() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 px-4 py-8">
      <Suspense fallback={<p className="text-sm text-zinc-500">Cargando…</p>}>
        <RequireSession />
      </Suspense>
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Crea tu club</h1>
        <p className="text-sm text-zinc-500">
          Todavía no tienes un club. Muy pronto podrás crearlo aquí con su nombre, logo y colores.
        </p>
      </div>
      <form
        action={async () => {
          "use server";
          await signOut({ redirectTo: SIGN_IN_PATH });
        }}
      >
        <Button type="submit" variant="outline" size="lg" className="h-11 w-full">
          Cerrar sesión
        </Button>
      </form>
    </main>
  );
}

async function RequireSession() {
  if (!(await currentUserId())) redirect(SIGN_IN_PATH);
  return null;
}
