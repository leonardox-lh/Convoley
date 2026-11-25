import type { LucideIcon } from "lucide-react";

/** Title block of the admin pages: icon, title and a short explanation. */
export function PageHeading({
  icon: Icon,
  title,
  eyebrow,
  children,
}: {
  icon: LucideIcon;
  title: string;
  eyebrow?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3">
      <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-md">
        <Icon className="size-6" aria-hidden />
      </span>
      <div className="flex min-w-0 flex-col gap-0.5">
        {eyebrow && <p className="text-sm text-muted-foreground">{eyebrow}</p>}
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {children && <p className="text-sm text-muted-foreground">{children}</p>}
      </div>
    </div>
  );
}

/** White card that groups a block of the page (a form, a list). */
export function SectionCard({
  title,
  description,
  children,
}: {
  title?: string;
  description?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-4 rounded-2xl border bg-card p-4 shadow-sm animate-in fade-in slide-in-from-bottom-2 duration-300">
      {(title || description) && (
        <div>
          {title && <h2 className="text-lg font-semibold">{title}</h2>}
          {description && <p className="text-sm text-muted-foreground">{description}</p>}
        </div>
      )}
      {children}
    </section>
  );
}
