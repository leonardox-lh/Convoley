import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { formatSoles } from "@/lib/money";
import { findClubBySlug } from "@/modules/clubs";
import { listPlans } from "@/modules/plans";
import { planTermsText } from "../../../plan-terms";
import { requireOrganizer } from "../require-organizer";
import { NewPlanForm, TogglePlanForm } from "./plan-forms";

type Props = PageProps<"/admin/[club]/planes">;

/** HU-26: the club's plans or packages and the form to create one. */
export default function PlansPage(props: Props) {
  return (
    <main className="mx-auto w-full max-w-md flex-1 px-4 py-8">
      <Suspense fallback={<p className="text-sm text-zinc-500">Cargando…</p>}>
        <PlansContent {...props} />
      </Suspense>
    </main>
  );
}

async function PlansContent({ params }: Pick<Props, "params">) {
  const clubSlug = (await params).club;
  if ((await requireOrganizer(clubSlug))?.role !== "admin") notFound();
  const club = await findClubBySlug(clubSlug);
  if (!club) notFound();
  const plans = await listPlans(club.id, { onlyActive: false });
  const communityName = new Map(club.communities.map((c) => [c.id, c.name]));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link
          href={`/${clubSlug}/planes`}
          className="text-sm text-zinc-500 underline-offset-4 hover:underline"
        >
          Ver planes públicos
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight">Planes</h1>
        <p className="text-sm text-zinc-500">
          Paquetes de fechas o mensualidades para asegurar ingresos fijos.
        </p>
      </div>
      <ul
        aria-label="Planes"
        className="flex flex-col divide-y divide-zinc-200 dark:divide-zinc-800"
      >
        {plans.map((plan) => (
          <li key={plan.id} className="flex items-start justify-between gap-3 py-3">
            <div className="min-w-0">
              <p className="font-medium">
                {plan.name} · {formatSoles(plan.priceCents)}
                {!plan.isActive && <span className="text-sm text-zinc-500"> · no se ofrece</span>}
              </p>
              <p className="text-sm text-zinc-500">{planTermsText(plan)}</p>
              <p className="text-sm text-zinc-500">
                Vale para:{" "}
                {plan.communityIds
                  .map((id) => communityName.get(id) ?? "comunidad eliminada")
                  .join(", ")}
              </p>
            </div>
            <TogglePlanForm clubSlug={clubSlug} planId={plan.id} isActive={plan.isActive} />
          </li>
        ))}
        {plans.length === 0 && (
          <li className="py-3 text-sm text-zinc-500">Aún no tienes planes.</li>
        )}
      </ul>
      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Nuevo plan</h2>
        <NewPlanForm clubSlug={clubSlug} communities={club.communities} />
      </section>
    </div>
  );
}
