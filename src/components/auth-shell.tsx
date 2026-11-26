import { CalendarCheck, Image as ImageIcon, Wallet } from "lucide-react";
import Link from "next/link";
import { BackButton } from "./back-button";
import { Logo } from "./logo";
import { VolleyballIcon } from "./volleyball";

const HIGHLIGHTS = [
  { icon: CalendarCheck, text: "Convocatorias e inscripciones en un link" },
  { icon: Wallet, text: "Cobros con Yape o tarjeta, directo a tu cuenta" },
  { icon: ImageIcon, text: "La lista lista para WhatsApp e Instagram" },
];

/**
 * Frame shared by sign-in, sign-up and password recovery. Phones: a blue brand band on top
 * with the form sheet rising over it. Desktop: brand panel on the left, form on the right.
 */
export function AuthShell({
  title,
  description,
  children,
}: {
  title: string;
  description?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <main data-has-back className="flex flex-1 flex-col bg-card lg:grid lg:grid-cols-2">
      <BrandPanel />
      <div className="relative -mt-8 flex flex-1 flex-col items-center rounded-t-[2rem] bg-card px-6 pt-8 pb-10 lg:mt-0 lg:justify-center lg:rounded-none">
        <div className="flex w-full max-w-sm flex-col gap-5 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="flex flex-col gap-1">
            <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
            {description && <p className="text-sm text-muted-foreground">{description}</p>}
          </div>
          {children}
        </div>
      </div>
    </main>
  );
}

function BrandPanel() {
  return (
    <div className="relative isolate flex min-h-[34vh] flex-col justify-between overflow-hidden bg-gradient-to-br from-primary via-primary to-blue-900 px-6 pt-8 pb-14 text-primary-foreground lg:min-h-full lg:p-12">
      {/* Decorative balls and glow: depth without competing with the text. */}
      <VolleyballIcon className="pointer-events-none absolute -right-16 -bottom-10 -z-10 size-64 opacity-15 lg:size-[28rem]" />
      <div
        aria-hidden
        className="pointer-events-none absolute -top-24 -left-24 -z-10 size-72 rounded-full bg-white/10 blur-3xl"
      />

      <div className="-ml-2 flex items-center gap-1 self-start">
        <BackButton />
        <Link
          href="/"
          aria-label="Convoley, ir al inicio"
          data-ball-on-dark
          className="[&_[data-logo-accent]]:text-sky-200"
        >
          <Logo />
        </Link>
      </div>

      <div className="flex flex-col gap-3">
        <p className="max-w-md text-2xl leading-tight font-semibold tracking-tight lg:text-4xl">
          Tu vóley de la semana, sin el caos del chat.
        </p>
        <ul className="hidden flex-col gap-3 pt-4 lg:flex">
          {HIGHLIGHTS.map(({ icon: Icon, text }) => (
            <li key={text} className="flex items-center gap-3 text-primary-foreground/90">
              <span className="flex size-9 items-center justify-center rounded-xl bg-white/15">
                <Icon className="size-4" aria-hidden />
              </span>
              {text}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

/** A link inside the auth card, in the brand color. */
export function AuthLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="font-medium text-primary underline-offset-4 hover:underline">
      {children}
    </Link>
  );
}
