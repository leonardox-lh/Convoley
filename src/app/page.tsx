import { CalendarCheck, ImageIcon, Wallet } from "lucide-react";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";

const FEATURES = [
  {
    icon: CalendarCheck,
    title: "Inscripciones sin enredos",
    text: "Tus jugadores se anotan desde el link de WhatsApp, sin crear cuenta.",
  },
  {
    icon: Wallet,
    title: "Cobros directos",
    text: "Yape o tarjeta con Mercado Pago. El dinero va directo a tu cuenta.",
  },
  {
    icon: ImageIcon,
    title: "La lista lista para compartir",
    text: "Imagen de la lista, equipos y flyer para tus historias.",
  },
] as const;

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-8 px-4 py-16">
      <div className="flex flex-col gap-3">
        <span className="flex size-12 items-center justify-center rounded-2xl bg-zinc-900 text-2xl text-white dark:bg-white dark:text-zinc-900">
          🏐
        </span>
        <h1 className="text-4xl font-semibold tracking-tight">Convoley</h1>
        <p className="text-lg text-zinc-600 dark:text-zinc-400">
          Organiza las convocatorias de tu club de vóley: inscripciones, pagos y la lista lista para
          WhatsApp.
        </p>
      </div>
      <ul className="flex flex-col gap-4">
        {FEATURES.map(({ icon: Icon, title, text }) => (
          <li key={title} className="flex gap-3">
            <Icon className="mt-0.5 size-5 shrink-0 text-zinc-500" aria-hidden />
            <div>
              <p className="font-medium">{title}</p>
              <p className="text-sm text-zinc-500">{text}</p>
            </div>
          </li>
        ))}
      </ul>
      <div className="flex flex-col gap-2">
        <Link href="/registro" className={buttonVariants({ size: "lg", className: "h-12" })}>
          Crea tu club gratis
        </Link>
        <Link
          href="/ingresar"
          className={buttonVariants({ variant: "outline", size: "lg", className: "h-12" })}
        >
          Ya tengo cuenta: ingresar
        </Link>
      </div>
    </main>
  );
}
