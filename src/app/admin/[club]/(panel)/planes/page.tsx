import { Ticket } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { formatInLima } from "@/lib/lima-time";
import { formatSoles } from "@/lib/money";
import { cn } from "@/lib/utils";
import { findClubBySlug } from "@/modules/clubs";
import { listVouchersInReview, signVoucherPath } from "@/modules/payments";
import { listPlanPurchases, listPlans } from "@/modules/plans";
import { PLAN_PURCHASE_STATUS_LABELS, planTermsText } from "../../../../plan-terms";
import { VolleyballLoader } from "@/components/volleyball";
import { requireOrganizer } from "../../require-organizer";
import { NewPlanForm, TogglePlanForm } from "./plan-forms";
import { PlanVoucherReview } from "./voucher-review";

type Props = PageProps<"/admin/[club]/planes">;

/** HU-26: the club's plans and the form to create one. HU-27: who bought them. */
export default function PlansPage(props: Props) {
  return (
    <Suspense fallback={<VolleyballLoader />}>
      <PlansContent {...props} />
    </Suspense>
  );
}

async function PlansContent({ params }: Pick<Props, "params">) {
  const clubSlug = (await params).club;
  if (!(await requireOrganizer(clubSlug, "manage_club"))) notFound();
  const club = await findClubBySlug(clubSlug);
  if (!club) notFound();
  const [plans, purchases] = await Promise.all([
    listPlans(club.id, { onlyActive: false }),
    listPlanPurchases(club.id),
  ]);
  const vouchers = await listVouchersInReview(
    purchases.filter((purchase) => purchase.status === "in_review").map((purchase) => purchase.id),
    "planPurchaseId",
  );
  const communityName = new Map(club.communities.map((c) => [c.id, c.name]));

  return (
    <div className="flex flex-col gap-6">
      <p className="text-sm text-muted-foreground">
        Paquetes de fechas o mensualidades para asegurar ingresos fijos.{" "}
        <Link
          href={`/${clubSlug}/planes`}
          className="font-semibold text-primary underline-offset-4 hover:underline"
        >
          Ver planes públicos
        </Link>
      </p>
      <ul aria-label="Planes" className="flex flex-col gap-2">
        {plans.map((plan) => (
          <li
            key={plan.id}
            className={cn(
              "flex flex-col gap-3 rounded-2xl border bg-card p-4 shadow-sm",
              !plan.isActive && "opacity-70",
            )}
          >
            <div className="flex items-start gap-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-secondary text-secondary-foreground">
                <Ticket className="size-5" aria-hidden />
              </span>
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <p className="font-medium">
                  {plan.name}
                  {!plan.isActive && (
                    <span className="text-sm font-normal text-muted-foreground">
                      {" "}
                      · no se ofrece
                    </span>
                  )}
                </p>
                <p className="text-sm text-muted-foreground">{planTermsText(plan)}</p>
                <p className="text-sm text-muted-foreground">
                  Vale para:{" "}
                  {plan.communityIds
                    .map((id) => communityName.get(id) ?? "comunidad eliminada")
                    .join(", ")}
                </p>
              </div>
              <p className="shrink-0 text-lg font-extrabold">{formatSoles(plan.priceCents)}</p>
            </div>
            <div className="flex justify-end border-t pt-3">
              <TogglePlanForm clubSlug={clubSlug} planId={plan.id} isActive={plan.isActive} />
            </div>
          </li>
        ))}
        {plans.length === 0 && (
          <li className="rounded-2xl border border-dashed p-6 text-center text-sm text-muted-foreground">
            Aún no tienes planes.
          </li>
        )}
      </ul>
      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Compras</h2>
        <ul
          aria-label="Compras de planes"
          className="flex flex-col divide-y divide-zinc-200 dark:divide-zinc-800"
        >
          {purchases.map((purchase) => {
            const voucher = vouchers.get(purchase.id);
            return (
              <li key={purchase.id} className="flex flex-col gap-2 py-3 text-sm">
                <p>
                  <span className="font-medium">
                    {purchase.firstName} {purchase.lastName}
                  </span>{" "}
                  · {purchase.plan.name} · {PLAN_PURCHASE_STATUS_LABELS[purchase.status]}
                </p>
                {purchase.status === "active" && (
                  <p className="text-zinc-500">
                    {purchase.creditsRemaining === null
                      ? "Fechas ilimitadas"
                      : `Le quedan ${purchase.creditsRemaining} fechas`}
                    {purchase.expiresAt && ` · vence el ${formatInLima(purchase.expiresAt)}`}
                  </p>
                )}
                {voucher && (
                  <PlanVoucherReview
                    clubSlug={clubSlug}
                    purchaseId={purchase.id}
                    imageUrl={voucher.proofFileKey ? signVoucherPath(voucher.proofFileKey) : null}
                    securityCode={voucher.yapeSecurityCode}
                    note={voucher.payerNote}
                  />
                )}
              </li>
            );
          })}
          {purchases.length === 0 && (
            <li className="py-3 text-sm text-zinc-500">Aún nadie compró un plan.</li>
          )}
        </ul>
      </section>
      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Nuevo plan</h2>
        <NewPlanForm clubSlug={clubSlug} communities={club.communities} />
      </section>
    </div>
  );
}
