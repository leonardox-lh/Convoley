import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { formatInLima } from "@/lib/lima-time";
import { clubLogoPath, findClubBySlug } from "@/modules/clubs";
import { listOpenEvents } from "@/modules/events";
import { listProducts, MAX_QUANTITY_PER_ITEM } from "@/modules/store";
import { StoreCart } from "./store-cart";

type Props = PageProps<"/[club]/tienda">;

export const metadata: Metadata = { title: "Tienda · Convoley" };

/** HU-24: the club's store; orders are picked up at one of its upcoming events. */
export default function PublicStorePage({ params }: Props) {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-4 px-4 py-8">
      <Suspense fallback={<p className="text-sm text-zinc-500">Cargando…</p>}>
        <StoreContent params={params} />
      </Suspense>
    </main>
  );
}

async function StoreContent({ params }: Pick<Props, "params">) {
  const slug = (await params).club;
  const club = await findClubBySlug(slug);
  if (!club) notFound();
  const [products, events] = await Promise.all([
    listProducts(club.id, { onlyActive: true }),
    listOpenEvents(slug),
  ]);

  return (
    <>
      <div>
        <Link
          href={`/${slug}`}
          className="text-sm text-zinc-500 underline-offset-4 hover:underline"
        >
          {club.name}
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight">Tienda</h1>
      </div>
      {products.length === 0 ? (
        <p className="text-sm text-zinc-500">Este club aún no tiene productos a la venta.</p>
      ) : !events?.length ? (
        <p className="text-sm text-zinc-500">
          Los pedidos se recogen en una convocatoria y ahora no hay ninguna abierta. Vuelve pronto.
        </p>
      ) : (
        <StoreCart
          clubSlug={slug}
          maxQuantity={MAX_QUANTITY_PER_ITEM}
          pickupEvents={events.map((event) => ({
            id: event.id,
            label: `${event.title} · ${formatInLima(event.startsAt)}`,
          }))}
          products={products.map((product) => ({
            id: product.id,
            name: product.name,
            description: product.description,
            priceCents: product.priceCents,
            photoUrls: product.imageKeys.map(clubLogoPath),
            variants: product.variants,
          }))}
        />
      )}
    </>
  );
}
