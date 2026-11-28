import { Ticket } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { VolleyballLoader } from "@/components/volleyball";
import { formatDateInLima } from "@/lib/lima-time";
import { formatSoles } from "@/lib/money";
import { Button } from "@/components/ui/button";
import { findClubBySlug } from "@/modules/clubs";
import { currentUserId, getPlayerProfile, isGoogleSignInEnabled } from "@/modules/identity";
import { Toast } from "@/components/toast";
import { cn } from "@/lib/utils";
import { listPlans, listPlayerPlanPurchases } from "@/modules/plans";
import { REGISTRATION_STATUS_BADGE_CLASSES } from "../../registration-status";
import { planTermsText } from "../../plan-terms";
import { signInToBuyPlanAction } from "./actions";
import { BuyPlanForm } from "./buy-plan-form";
import { EmptyTab } from "../empty-tab";

type Props = PageProps<"/[club]/planes">;

export const metadata: Metadata = { title: "Planes · Convoley" };

/** HU-27: the club's active plans; the player buys one and pays it. */
export default function PublicPlansPage({ params, searchParams }: Props) {
  return (
    <main className="flex flex-col gap-4 p-4">
      <Suspense fallback={<VolleyballLoader />}>
        <PlansContent params={params} searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function PlansContent({ params, searchParams }: Props) {
  const slug = (await params).club;
  const club = await findClubBySlug(slug);
  if (!club) notFound();
  const plans = await listPlans(club.id, { onlyActive: true });
  const communityName = new Map(club.communities.map((c) => [c.id, c.name]));
  const userId = await currentUserId();
  const signedIn = userId !== null;
  // Signed-in buyers get their name and phone already filled in from Mi perfil.
  const profile = userId ? await getPlayerProfile(userId) : null;
  const purchases = userId ? await listPlayerPlanPurchases({ clubId: club.id, userId }) : [];
  // Plans whose screenshot the organizer still has to review: no second purchase meanwhile.
  const inReview = new Set(
    purchases.filter((purchase) => purchase.status === "in_review").map((p) => p.planId),
  );
  // What the player can still use: active and not expired (null means no limit).
  const now = new Date();
  const myPlans = purchases.filter(
    (purchase) =>
      purchase.status === "active" && (purchase.expiresAt === null || purchase.expiresAt > now),
  );
  const { enviado } = await searchParams;

  return (
    <>
      <h1 className="sr-only">Planes</h1>
      {enviado && <Toast>Solicitud enviada al organizador.</Toast>}
      {myPlans.length > 0 && (
        <section aria-labelledby="my-plan-title" className="flex flex-col gap-2">
          <h2 id="my-plan-title" className="font-semibold">
            Mi plan
          </h2>
          {myPlans.map((purchase, index) => (
            <div
              key={index}
              className="flex flex-col gap-1 rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-sm dark:border-emerald-900 dark:bg-emerald-950/40"
            >
              <div className="flex items-start justify-between gap-2">
                <p className="font-medium">{purchase.plan.name}</p>
                <span className="shrink-0 rounded-full bg-emerald-600 px-2.5 py-0.5 text-xs font-semibold text-white">
                  Activo
                </span>
              </div>
              <p>
                {purchase.creditsRemaining === null
                  ? "Fechas ilimitadas"
                  : `Te ${purchase.creditsRemaining === 1 ? "queda" : "quedan"} ${purchase.creditsRemaining} ${purchase.creditsRemaining === 1 ? "fecha" : "fechas"}`}
              </p>
              {purchase.expiresAt && (
                <p className="text-muted-foreground">
                  Vence el {formatDateInLima(purchase.expiresAt)}
                </p>
              )}
            </div>
          ))}
        </section>
      )}
      {plans.length > 0 && !signedIn && (
        <section className="flex flex-col gap-2 rounded-lg border border-zinc-200 p-3 text-sm dark:border-zinc-800">
          <p>
            Para comprar un plan entra con tu cuenta de Google: así solo tú puedes usar tus fechas.
          </p>
          {isGoogleSignInEnabled && (
            <form action={signInToBuyPlanAction} className="flex flex-col">
              <input type="hidden" name="clubSlug" value={slug} />
              <Button type="submit" variant="outline">
                Entrar con Google
              </Button>
            </form>
          )}
        </section>
      )}
      {plans.length === 0 && <EmptyTab icon={Ticket}>Este club aún no ofrece planes.</EmptyTab>}
      <ul className="flex flex-col gap-4">
        {plans.map((plan) => (
          <li
            key={plan.id}
            className="flex flex-col gap-2 rounded-lg border border-zinc-200 p-3 dark:border-zinc-800"
          >
            <div className="flex items-start justify-between gap-2">
              <p className="font-medium">
                {plan.name} · {formatSoles(plan.priceCents)}
              </p>
              {inReview.has(plan.id) && (
                <span
                  className={cn(
                    "shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold",
                    REGISTRATION_STATUS_BADGE_CLASSES.in_review,
                  )}
                >
                  En revisión
                </span>
              )}
            </div>
            <p className="text-sm text-zinc-500">{planTermsText(plan)}</p>
            <p className="text-sm text-zinc-500">
              Vale para: {plan.communityIds.flatMap((id) => communityName.get(id) ?? []).join(", ")}
            </p>
            {signedIn && !inReview.has(plan.id) && (
              <details className="text-sm">
                <summary className="cursor-pointer font-medium">Comprar este plan</summary>
                <div className="mt-3">
                  <BuyPlanForm clubSlug={slug} planId={plan.id} profile={profile} />
                </div>
              </details>
            )}
          </li>
        ))}
      </ul>
    </>
  );
}
