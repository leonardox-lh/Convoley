import { ShoppingBag } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { VolleyballLoader } from "@/components/volleyball";
import { formatInLima } from "@/lib/lima-time";
import { clubLogoPath, findClubBySlug } from "@/modules/clubs";
import { listOpenEvents } from "@/modules/events";
import { listProducts, MAX_QUANTITY_PER_ITEM } from "@/modules/store";
import { EmptyTab } from "../empty-tab";
import { StoreCart } from "./store-cart";

type Props = PageProps<"/[club]/tienda">;

export const metadata: Metadata = { title: "Tienda · Convoley" };

/** HU-24: the club's store; orders are picked up at one of its upcoming events. */
export default function PublicStorePage({ params }: Props) {
  return (
    <main className="flex flex-col gap-4 p-4">
      <Suspense fallback={<VolleyballLoader />}>
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
      <h1 className="sr-only">Tienda</h1>
      {products.length === 0 ? (
        <EmptyTab icon={ShoppingBag}>Este club aún no tiene productos a la venta.</EmptyTab>
      ) : !events?.length ? (
        <EmptyTab icon={ShoppingBag}>
          Los pedidos se recogen en una convocatoria y ahora no hay ninguna abierta. Vuelve pronto.
        </EmptyTab>
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
            stockNote: product.stockNote,
          }))}
        />
      )}
    </>
  );
}
