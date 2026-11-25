import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { formatSoles } from "@/lib/money";
import { Button } from "@/components/ui/button";
import { findClubBySlug } from "@/modules/clubs";
import { currentUserId, isGoogleSignInEnabled } from "@/modules/identity";
import { listPlans } from "@/modules/plans";
import { planTermsText } from "../../plan-terms";
import { signInToBuyPlanAction } from "./actions";
import { BuyPlanForm } from "./buy-plan-form";

type Props = PageProps<"/[club]/planes">;

export const metadata: Metadata = { title: "Planes · Convoley" };

/** HU-27: the club's active plans; the player buys one and pays it. */
export default function PublicPlansPage({ params }: Props) {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-4 px-4 py-8">
      <Suspense fallback={<p className="text-sm text-zinc-500">Cargando…</p>}>
        <PlansContent params={params} />
      </Suspense>
    </main>
  );
}

async function PlansContent({ params }: Pick<Props, "params">) {
  const slug = (await params).club;
  const club = await findClubBySlug(slug);
  if (!club) notFound();
  const plans = await listPlans(club.id, { onlyActive: true });
  const communityName = new Map(club.communities.map((c) => [c.id, c.name]));
  const signedIn = (await currentUserId()) !== null;

  return (
    <>
      <div>
        <Link
          href={`/${slug}`}
          className="text-sm text-zinc-500 underline-offset-4 hover:underline"
        >
          {club.name}
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight">Planes</h1>
      </div>
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
      {plans.length === 0 && (
        <p className="text-sm text-zinc-500">Este club aún no ofrece planes.</p>
      )}
      <ul className="flex flex-col gap-4">
        {plans.map((plan) => (
          <li
            key={plan.id}
            className="flex flex-col gap-2 rounded-lg border border-zinc-200 p-3 dark:border-zinc-800"
          >
            <p className="font-medium">
              {plan.name} · {formatSoles(plan.priceCents)}
            </p>
            <p className="text-sm text-zinc-500">{planTermsText(plan)}</p>
            <p className="text-sm text-zinc-500">
              Vale para: {plan.communityIds.flatMap((id) => communityName.get(id) ?? []).join(", ")}
            </p>
            {signedIn && (
              <details className="text-sm">
                <summary className="cursor-pointer font-medium">Comprar este plan</summary>
                <div className="mt-3">
                  <BuyPlanForm clubSlug={slug} planId={plan.id} />
                </div>
              </details>
            )}
          </li>
        ))}
      </ul>
    </>
  );
}
