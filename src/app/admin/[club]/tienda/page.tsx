import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { formatSoles } from "@/lib/money";
import { findClubBySlug } from "@/modules/clubs";
import { listProducts } from "@/modules/store";
import { requireOrganizer } from "../require-organizer";
import { ProductForm } from "./product-forms";
import { stockInputText } from "./stock-input";

type Props = PageProps<"/admin/[club]/tienda">;

/** HU-23: the club's products and the form to publish a new one. */
export default function StorePage({ params }: Props) {
  return (
    <main className="mx-auto w-full max-w-md flex-1 px-4 py-8">
      <Suspense fallback={<p className="text-sm text-zinc-500">Cargando…</p>}>
        <StoreContent params={params} />
      </Suspense>
    </main>
  );
}

async function StoreContent({ params }: Pick<Props, "params">) {
  const clubSlug = (await params).club;
  if ((await requireOrganizer(clubSlug))?.role !== "admin") notFound();
  const club = await findClubBySlug(clubSlug);
  if (!club) notFound();
  const products = await listProducts(club.id, { onlyActive: false });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link
          href={`/admin/${clubSlug}/pedidos`}
          className="text-sm text-zinc-500 underline-offset-4 hover:underline"
        >
          Pedidos
        </Link>
        {" · "}
        <Link
          href={`/${clubSlug}/tienda`}
          className="text-sm text-zinc-500 underline-offset-4 hover:underline"
        >
          Ver tienda pública
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight">Tienda</h1>
      </div>
      <ul
        aria-label="Productos"
        className="flex flex-col divide-y divide-zinc-200 dark:divide-zinc-800"
      >
        {products.map((product) => (
          <li key={product.id} className="py-3">
            <Link href={`/admin/${clubSlug}/tienda/${product.id}`} className="flex flex-col">
              <span className="font-medium">
                {product.name}
                {!product.isActive && <span className="text-sm text-zinc-500"> · oculto</span>}
              </span>
              <span className="text-sm text-zinc-500">
                {formatSoles(product.priceCents)} · Stock {stockInputText(product.variants)} ·{" "}
                {product.imageKeys.length} fotos
              </span>
            </Link>
          </li>
        ))}
        {products.length === 0 && (
          <li className="py-3 text-sm text-zinc-500">Aún no tienes productos.</li>
        )}
      </ul>
      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Nuevo producto</h2>
        <ProductForm clubSlug={clubSlug} />
      </section>
    </div>
  );
}
