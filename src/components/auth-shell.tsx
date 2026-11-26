import Link from "next/link";
import { Logo } from "./logo";

/** Frame shared by sign-in, sign-up and password recovery: logo, a card and a footer below it. */
export function AuthShell({
  title,
  description,
  footer,
  children,
}: {
  title: string;
  description?: React.ReactNode;
  footer?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <main className="relative flex flex-1 flex-col items-center overflow-hidden px-4 py-10 sm:justify-center">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-72 bg-gradient-to-b from-primary/15 to-transparent"
      />
      <div className="flex w-full max-w-sm flex-col gap-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
        <Link href="/" className="self-center" aria-label="Convoley, ir al inicio">
          <Logo />
        </Link>
        <section className="flex flex-col gap-5 rounded-2xl border bg-card p-6 shadow-lg shadow-primary/5">
          <div className="flex flex-col gap-1 text-center">
            <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
            {description && <p className="text-sm text-muted-foreground">{description}</p>}
          </div>
          {children}
        </section>
        {footer && (
          <div className="flex flex-col gap-2 text-center text-sm text-muted-foreground">
            {footer}
          </div>
        )}
      </div>
    </main>
  );
}

/** A link inside the auth footer or card, in the brand color. */
export function AuthLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="font-medium text-primary underline-offset-4 hover:underline">
      {children}
    </Link>
  );
}
