"use client";

import { Images, LogIn, Minus, Plus, ShoppingBag, ShoppingCart } from "lucide-react";
import Link from "next/link";
import { useActionState, useState } from "react";
import { SelectPicker } from "@/components/date-time-pickers";
import { FormMessage, submitKeepingValues, TextField } from "@/components/form";
import { Button, buttonVariants } from "@/components/ui/button";
import { formatSoles } from "@/lib/money";
import { cn } from "@/lib/utils";
import type { PlayerProfile } from "@/modules/identity";
import { placeOrderAction, type OrderState } from "./actions";
import { ProductDetail, VariantButtons } from "./product-detail";

export interface CatalogProduct {
  id: string;
  name: string;
  description: string | null;
  priceCents: number;
  photoUrls: string[];
  /** null = not tracked: it never runs out. */
  variants: { id: string; size: string | null; stock: number | null }[];
  stockNote: string | null;
}

type Cart = Record<string, number>;

/**
 * HU-24: catalog plus a simple cart kept in the page (lost on reload). The server recalculates
 * prices and checks the stock; the browser only sends ids and quantities.
 */
export function StoreCart(props: {
  clubSlug: string;
  products: CatalogProduct[];
  pickupEvents: { id: string; label: string }[];
  maxQuantity: number;
  profile: PlayerProfile | null;
  /** Set when nobody is signed in: buying needs an account, so the order shows in Mis pedidos. */
  signInHref: string | null;
}) {
  const [cart, setCart] = useState<Cart>({});
  const [askSignIn, setAskSignIn] = useState(false);
  const [openProductId, setOpenProductId] = useState<string | null>(null);
  const openProduct = props.products.find((product) => product.id === openProductId);
  const [state, action, pending] = useActionState<OrderState, FormData>(placeOrderAction, {
    status: "idle",
  });
  const variants = props.products.flatMap((product) =>
    product.variants.map((variant) => ({ ...variant, product })),
  );
  const lines = Object.entries(cart).filter(([, quantity]) => quantity > 0);
  const totalCents = lines.reduce(
    (total, [id, quantity]) =>
      total + quantity * (variants.find((variant) => variant.id === id)?.product.priceCents ?? 0),
    0,
  );
  const itemCount = lines.reduce((total, [, quantity]) => total + quantity, 0);
  const inCart = (product: CatalogProduct) =>
    product.variants.reduce((total, variant) => total + (cart[variant.id] ?? 0), 0);
  const add = (variantId: string, stock: number | null) => {
    if (props.signInHref) {
      setOpenProductId(null);
      setAskSignIn(true);
      return;
    }
    setCart((current) => ({
      ...current,
      [variantId]: Math.min(
        (current[variantId] ?? 0) + 1,
        stock ?? props.maxQuantity,
        props.maxQuantity,
      ),
    }));
  };
  const remove = (variantId: string) =>
    setCart((current) => ({ ...current, [variantId]: Math.max((current[variantId] ?? 0) - 1, 0) }));

  return (
    <div className="flex flex-col gap-6">
      <ul aria-label="Productos" className="grid grid-cols-2 gap-3">
        {props.products.map((product) => (
          <li
            key={product.id}
            className="relative flex flex-col overflow-hidden rounded-2xl border bg-card shadow-sm"
          >
            <button
              type="button"
              aria-label={`Ver ${product.name}`}
              onClick={() => setOpenProductId(product.id)}
              className="relative flex aspect-square items-center justify-center bg-primary/10 text-primary"
            >
              {product.photoUrls[0] ? (
                // eslint-disable-next-line @next/next/no-img-element -- served by our own route
                <img src={product.photoUrls[0]} alt="" className="size-full object-cover" />
              ) : (
                <ShoppingBag className="size-10" aria-hidden />
              )}
              {product.photoUrls.length > 1 && (
                <span className="absolute bottom-2 left-2 flex items-center gap-1 rounded-full bg-black/55 px-2 py-0.5 text-xs font-semibold text-white">
                  <Images className="size-3.5" aria-hidden />
                  {product.photoUrls.length}
                </span>
              )}
            </button>
            {inCart(product) > 0 && (
              <span className="absolute top-2 right-2 flex h-6 min-w-6 items-center justify-center rounded-full bg-primary px-1.5 text-xs font-bold text-primary-foreground shadow">
                {inCart(product)}
              </span>
            )}
            <div className="flex flex-1 flex-col gap-2 p-3">
              <div className="flex flex-col gap-0.5">
                <button
                  type="button"
                  onClick={() => setOpenProductId(product.id)}
                  className="text-left leading-tight font-semibold first-letter:uppercase hover:underline"
                >
                  {product.name}
                </button>
                <p className="text-lg font-extrabold tracking-tight text-primary">
                  {formatSoles(product.priceCents)}
                </p>
                {product.stockNote && (
                  <p className="text-xs font-medium text-muted-foreground">{product.stockNote}</p>
                )}
                {product.description && (
                  <button
                    type="button"
                    onClick={() => setOpenProductId(product.id)}
                    className="text-left text-xs text-muted-foreground"
                  >
                    <span className="line-clamp-2">{product.description}</span>
                    <span className="font-semibold text-primary">Ver más</span>
                  </button>
                )}
              </div>
              <VariantButtons product={product} onAdd={add} className="mt-auto" />
            </div>
          </li>
        ))}
      </ul>
      {openProduct && (
        <ProductDetail
          product={openProduct}
          inCart={inCart(openProduct)}
          onAdd={add}
          onClose={() => setOpenProductId(null)}
        />
      )}

      <section
        id="carrito"
        aria-labelledby="cart-heading"
        className="flex scroll-mt-4 flex-col gap-4"
      >
        <h2 id="cart-heading" className="flex items-center gap-2 text-lg font-semibold">
          <ShoppingCart className="size-5 text-primary" aria-hidden />
          Tu carrito
          {itemCount > 0 && (
            <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-sm font-semibold text-primary">
              {itemCount}
            </span>
          )}
        </h2>
        {lines.length === 0 ? (
          <p className="rounded-xl border border-dashed p-4 text-center text-sm text-muted-foreground">
            Toca + en un producto para agregarlo.
          </p>
        ) : (
          <ul className="flex flex-col divide-y">
            {lines.map(([id, quantity]) => {
              const variant = variants.find((candidate) => candidate.id === id)!;
              return (
                <li key={id} className="flex items-center gap-3 py-2.5 text-sm">
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium first-letter:uppercase">
                      {variant.product.name}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {variant.size ? `Talla ${variant.size} · ` : ""}
                      {formatSoles(variant.product.priceCents)} c/u
                    </span>
                  </span>
                  <span className="flex items-center rounded-full border">
                    <button
                      type="button"
                      aria-label="Quitar uno"
                      onClick={() => remove(id)}
                      className="flex size-8 items-center justify-center rounded-full text-primary hover:bg-secondary"
                    >
                      <Minus className="size-4" aria-hidden />
                    </button>
                    <span className="w-6 text-center font-semibold">{quantity}</span>
                    <button
                      type="button"
                      aria-label="Agregar uno"
                      onClick={() => add(id, variant.stock)}
                      className="flex size-8 items-center justify-center rounded-full text-primary hover:bg-secondary"
                    >
                      <Plus className="size-4" aria-hidden />
                    </button>
                  </span>
                  <span className="w-16 text-right font-semibold">
                    {formatSoles(quantity * variant.product.priceCents)}
                  </span>
                </li>
              );
            })}
            <li className="flex justify-between pt-3 text-base font-extrabold">
              <span>Total</span>
              <span className="text-primary">{formatSoles(totalCents)}</span>
            </li>
          </ul>
        )}
        {lines.length > 0 && (
          <form onSubmit={submitKeepingValues(action)} className="flex flex-col gap-3">
            <input type="hidden" name="clubSlug" value={props.clubSlug} />
            <input
              type="hidden"
              name="cart"
              value={JSON.stringify(
                lines.map(([variantId, quantity]) => ({ variantId, quantity })),
              )}
            />
            <SelectPicker
              label="¿En qué convocatoria lo recoges?"
              name="pickupEventId"
              options={props.pickupEvents.map((event) => ({ value: event.id, label: event.label }))}
            />
            <TextField
              label="Nombre"
              name="firstName"
              autoComplete="given-name"
              defaultValue={props.profile?.firstName}
            />
            <TextField
              label="Apellido"
              name="lastName"
              autoComplete="family-name"
              defaultValue={props.profile?.lastName}
            />
            <TextField
              label="Celular"
              name="phone"
              type="tel"
              inputMode="numeric"
              autoComplete="tel-national"
              placeholder="987654321"
              defaultValue={props.profile?.phone?.replace(/^\+51/, "")}
            />
            {state.status === "error" && <FormMessage tone="error">{state.message}</FormMessage>}
            <Button
              type="submit"
              variant="outline"
              size="lg"
              className="h-12 border-primary bg-transparent text-base text-primary hover:bg-primary/10 hover:text-primary"
              disabled={pending}
            >
              {pending ? "Creando tu pedido…" : `Hacer pedido y pagar · ${formatSoles(totalCents)}`}
            </Button>
          </form>
        )}
      </section>

      {askSignIn && props.signInHref && (
        <div
          role="alert"
          className="sticky bottom-4 z-10 flex items-center gap-3 rounded-2xl border bg-card p-3 shadow-lg animate-in fade-in slide-in-from-bottom-2"
        >
          <LogIn className="size-5 shrink-0 text-primary" aria-hidden />
          <p className="flex-1 text-sm font-medium">Debes iniciar sesión para comprar.</p>
          <Link href={props.signInHref} className={cn(buttonVariants(), "shrink-0")}>
            Iniciar sesión
          </Link>
        </div>
      )}

      {itemCount > 0 && (
        // Keeps the cart one tap away while the player scrolls the catalog.
        <a
          href="#carrito"
          className="sticky bottom-4 z-10 flex h-12 items-center justify-between rounded-full bg-primary px-5 font-semibold text-primary-foreground shadow-lg shadow-primary/30"
        >
          <span className="flex items-center gap-2">
            <ShoppingCart className="size-5" aria-hidden />
            Ver carrito ({itemCount})
          </span>
          {formatSoles(totalCents)}
        </a>
      )}
    </div>
  );
}
