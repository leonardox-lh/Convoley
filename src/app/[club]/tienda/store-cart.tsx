"use client";

import { Minus, Plus, ShoppingBag, ShoppingCart } from "lucide-react";
import { useActionState, useState } from "react";
import { SelectPicker } from "@/components/date-time-pickers";
import { FormMessage, submitKeepingValues, TextField } from "@/components/form";
import { Button } from "@/components/ui/button";
import { formatSoles } from "@/lib/money";
import { cn } from "@/lib/utils";
import { placeOrderAction, type OrderState } from "./actions";

export interface CatalogProduct {
  id: string;
  name: string;
  description: string | null;
  priceCents: number;
  photoUrls: string[];
  variants: { id: string; size: string | null; stock: number }[];
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
}) {
  const [cart, setCart] = useState<Cart>({});
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
  const add = (variantId: string, stock: number) =>
    setCart((current) => ({
      ...current,
      [variantId]: Math.min((current[variantId] ?? 0) + 1, stock, props.maxQuantity),
    }));
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
            {product.photoUrls.length > 0 ? (
              <div className="flex aspect-square snap-x snap-mandatory overflow-x-auto [scrollbar-width:none]">
                {product.photoUrls.map((url) => (
                  // eslint-disable-next-line @next/next/no-img-element -- served by our own route
                  <img
                    key={url}
                    src={url}
                    alt={product.name}
                    className="size-full shrink-0 snap-start object-cover"
                  />
                ))}
              </div>
            ) : (
              <div className="flex aspect-square items-center justify-center bg-primary/10 text-primary">
                <ShoppingBag className="size-10" aria-hidden />
              </div>
            )}
            {inCart(product) > 0 && (
              <span className="absolute top-2 right-2 flex h-6 min-w-6 items-center justify-center rounded-full bg-primary px-1.5 text-xs font-bold text-primary-foreground shadow">
                {inCart(product)}
              </span>
            )}
            <div className="flex flex-1 flex-col gap-2 p-3">
              <div className="flex flex-col gap-0.5">
                <p className="leading-tight font-semibold first-letter:uppercase">{product.name}</p>
                <p className="text-lg font-extrabold tracking-tight text-primary">
                  {formatSoles(product.priceCents)}
                </p>
                {product.description && (
                  <p className="line-clamp-2 text-xs text-muted-foreground">
                    {product.description}
                  </p>
                )}
              </div>
              <div className="mt-auto flex flex-wrap gap-1.5">
                {product.variants.map((variant) => {
                  const soldOut = variant.stock === 0;
                  return (
                    <button
                      key={variant.id}
                      type="button"
                      disabled={soldOut}
                      aria-label={
                        soldOut
                          ? `${variant.size ?? product.name} agotado`
                          : `Agregar${variant.size ? ` ${variant.size}` : ""}`
                      }
                      onClick={() => add(variant.id, variant.stock)}
                      className={cn(
                        "flex h-9 items-center justify-center gap-1 rounded-full px-3 text-sm font-semibold transition",
                        variant.size ? "min-w-12" : "flex-1",
                        soldOut
                          ? "bg-muted text-muted-foreground line-through"
                          : "bg-primary text-primary-foreground hover:bg-primary/85 active:scale-95",
                      )}
                    >
                      {!soldOut && <Plus className="size-3.5" aria-hidden />}
                      {variant.size ?? (soldOut ? "Agotado" : "Agregar")}
                    </button>
                  );
                })}
              </div>
            </div>
          </li>
        ))}
      </ul>

      <section
        id="carrito"
        aria-labelledby="cart-heading"
        className="flex scroll-mt-4 flex-col gap-4 rounded-2xl border bg-card p-4 shadow-sm"
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
            <TextField label="Nombre" name="firstName" autoComplete="given-name" />
            <TextField label="Apellido" name="lastName" autoComplete="family-name" />
            <TextField
              label="Celular"
              name="phone"
              type="tel"
              inputMode="numeric"
              autoComplete="tel-national"
              placeholder="987654321"
            />
            {state.status === "error" && <FormMessage tone="error">{state.message}</FormMessage>}
            <Button type="submit" size="lg" className="h-12 text-base" disabled={pending}>
              {pending ? "Creando tu pedido…" : `Hacer pedido y pagar · ${formatSoles(totalCents)}`}
            </Button>
          </form>
        )}
      </section>

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
