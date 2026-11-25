import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { centsToSolesText } from "@/lib/money";
import { clubLogoPath, findClubBySlug } from "@/modules/clubs";
import { findProduct, MAX_PRODUCT_PHOTOS } from "@/modules/store";
import { requireOrganizer } from "../../require-organizer";
import { AddPhotoForm, ProductForm, RemovePhotoButton, ToggleProductForm } from "../product-forms";
import { stockInputText } from "../stock-input";

type Props = PageProps<"/admin/[club]/tienda/[product]">;

/** HU-23: edit a product, its stock per size and up to 5 photos. */
export default function ProductPage({ params }: Props) {
  return (
    <main className="mx-auto w-full max-w-md flex-1 px-4 py-8">
      <Suspense fallback={<p className="text-sm text-zinc-500">Cargando…</p>}>
        <ProductContent params={params} />
      </Suspense>
    </main>
  );
}

async function ProductContent({ params }: Pick<Props, "params">) {
  const { club: clubSlug, product: productId } = await params;
  if ((await requireOrganizer(clubSlug))?.role !== "admin") notFound();
  const club = await findClubBySlug(clubSlug);
  const product = club && (await findProduct(club.id, productId));
  if (!product) notFound();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link
          href={`/admin/${clubSlug}/tienda`}
          className="text-sm text-zinc-500 underline-offset-4 hover:underline"
        >
          Tienda
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight">{product.name}</h1>
      </div>
      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">
          Fotos ({product.imageKeys.length}/{MAX_PRODUCT_PHOTOS})
        </h2>
        <ul className="grid grid-cols-3 gap-2">
          {product.imageKeys.map((key) => (
            <li key={key} className="flex flex-col items-center gap-1">
              {/* eslint-disable-next-line @next/next/no-img-element -- served by our own route */}
              <img
                src={clubLogoPath(key)}
                alt=""
                className="aspect-square w-full rounded-lg object-cover"
              />
              <RemovePhotoButton clubSlug={clubSlug} productId={product.id} photoKey={key} />
            </li>
          ))}
        </ul>
        {product.imageKeys.length < MAX_PRODUCT_PHOTOS && (
          <AddPhotoForm clubSlug={clubSlug} productId={product.id} />
        )}
      </section>
      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Datos</h2>
        <ProductForm
          clubSlug={clubSlug}
          values={{
            productId: product.id,
            name: product.name,
            description: product.description ?? "",
            price: centsToSolesText(product.priceCents),
            stock: stockInputText(product.variants),
          }}
        />
      </section>
      <ToggleProductForm clubSlug={clubSlug} productId={product.id} isActive={product.isActive} />
    </div>
  );
}
