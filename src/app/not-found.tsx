import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center gap-3 px-4 py-16 text-center">
      <h1 className="text-2xl font-semibold tracking-tight">No encontramos esta página</h1>
      <p className="text-sm text-zinc-500">Revisa el link o pídele uno nuevo al organizador.</p>
      <Link href="/" className="text-sm font-medium underline">
        Ir al inicio
      </Link>
    </main>
  );
}
