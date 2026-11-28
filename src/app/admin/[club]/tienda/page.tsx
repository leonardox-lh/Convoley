import { PageHeading, PageHeadingLoading } from "@/components/page-heading";
import { ShoppingBag } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { formatSoles } from "@/lib/money";
import { clubLogoPath, findClubBySlug } from "@/modules/clubs";
import { listProducts } from "@/modules/store";
import { requireOrganizer } from "../require-organizer";
import { ProductForm } from "./product-forms";
import { stockInputText } from "./stock-input";

type Props = PageProps<"/admin/[club]/tienda">;

/** HU-23: the club's products and the form to publish a new one. */
export default function StorePage({ params }: Props) {
  return (
    <main className="mx-auto w-full max-w-md flex-1 px-4 pt-4 pb-8">
      <Suspense fallback={<PageHeadingLoading />}>
        <StoreContent params={params} />
      </Suspense>
    </main>
  );
}

async function StoreContent({ params }: Pick<Props, "params">) {
  const clubSlug = (await params).club;
  if (!(await requireOrganizer(clubSlug, "manage_club"))) notFound();
  const club = await findClubBySlug(clubSlug);
  if (!club) notFound();
  const products = await listProducts(club.id, { onlyActive: false });

  return (
    <div className="flex flex-col gap-6">
      <PageHeading
        footer={
          <>
            <Link
              href={`/admin/${clubSlug}/pedidos`}
              className="font-semibold text-white underline-offset-4 hover:underline"
            >
              Pedidos
            </Link>
            {" · "}
            <Link
              href={`/${clubSlug}/tienda`}
              className="font-semibold text-white underline-offset-4 hover:underline"
            >
              Ver tienda pública
            </Link>
          </>
        }
        icon={ShoppingBag}
        eyebrow="Gestiona tu club"
        title="Tienda"
      />
      <ul aria-label="Productos" className="flex flex-col gap-2">
        {products.map((product) => (
          <li key={product.id}>
            <Link
              href={`/admin/${clubSlug}/tienda/${product.id}`}
              className="card-interactive flex items-center gap-3 p-3"
            >
              <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="truncate font-medium">
                  {product.name}
                  {!product.isActive && (
                    <span className="text-sm text-muted-foreground"> · oculto</span>
                  )}
                </span>
                <span className="text-sm text-muted-foreground">
                  {formatSoles(product.priceCents)} · Stock {stockInputText(product.variants)}
                </span>
                <span className="text-sm text-muted-foreground">
                  {product.imageKeys.length} {product.imageKeys.length === 1 ? "foto" : "fotos"}
                </span>
              </span>
              {product.imageKeys[0] ? (
                // eslint-disable-next-line @next/next/no-img-element -- served by our own route
                <img
                  src={clubLogoPath(product.imageKeys[0])}
                  alt=""
                  className="size-20 shrink-0 rounded-xl object-cover"
                />
              ) : (
                <span className="flex size-20 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <ShoppingBag className="size-8" aria-hidden />
                </span>
              )}
            </Link>
          </li>
        ))}
        {products.length === 0 && (
          <li className="rounded-2xl border border-dashed p-6 text-center text-sm text-muted-foreground">
            Aún no tienes productos.
          </li>
        )}
      </ul>
      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Nuevo producto</h2>
        <ProductForm clubSlug={clubSlug} />
      </section>
    </div>
  );
}
