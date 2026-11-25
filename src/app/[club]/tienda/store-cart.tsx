"use client";

import { useActionState, useState } from "react";
import { fieldClass, FormMessage, submitKeepingValues, TextField } from "@/components/form";
import { Button } from "@/components/ui/button";
import { formatSoles } from "@/lib/money";
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
  const add = (variantId: string, stock: number) =>
    setCart((current) => ({
      ...current,
      [variantId]: Math.min((current[variantId] ?? 0) + 1, stock, props.maxQuantity),
    }));
  const remove = (variantId: string) =>
    setCart((current) => ({ ...current, [variantId]: Math.max((current[variantId] ?? 0) - 1, 0) }));

  return (
    <div className="flex flex-col gap-6">
      <ul className="flex flex-col gap-4">
        {props.products.map((product) => (
          <li
            key={product.id}
            className="flex flex-col gap-2 rounded-lg border border-zinc-200 p-3 dark:border-zinc-800"
          >
            {product.photoUrls.length > 0 && (
              <div className="flex snap-x gap-2 overflow-x-auto">
                {product.photoUrls.map((url) => (
                  // eslint-disable-next-line @next/next/no-img-element -- served by our own route
                  <img
                    key={url}
                    src={url}
                    alt={product.name}
                    className="aspect-square w-40 shrink-0 snap-start rounded-lg object-cover"
                  />
                ))}
              </div>
            )}
            <div>
              <p className="font-medium">{product.name}</p>
              <p className="text-sm text-zinc-500">{formatSoles(product.priceCents)}</p>
              {product.description && <p className="text-sm">{product.description}</p>}
            </div>
            <div className="flex flex-wrap gap-2">
              {product.variants.map((variant) => (
                <Button
                  key={variant.id}
                  type="button"
                  variant="outline"
                  className="h-11"
                  disabled={variant.stock === 0}
                  onClick={() => add(variant.id, variant.stock)}
                >
                  {variant.stock === 0
                    ? `${variant.size ?? "Agotado"}${variant.size ? " · agotado" : ""}`
                    : `Agregar${variant.size ? ` ${variant.size}` : ""}`}
                </Button>
              ))}
            </div>
          </li>
        ))}
      </ul>

      <section aria-labelledby="cart-heading" className="flex flex-col gap-3">
        <h2 id="cart-heading" className="text-lg font-semibold">
          Tu carrito
        </h2>
        {lines.length === 0 ? (
          <p className="text-sm text-zinc-500">Agrega productos para hacer tu pedido.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {lines.map(([id, quantity]) => {
              const variant = variants.find((candidate) => candidate.id === id)!;
              return (
                <li key={id} className="flex items-center justify-between gap-2 text-sm">
                  <span>
                    {quantity} × {variant.product.name}
                    {variant.size && ` (${variant.size})`}
                  </span>
                  <span className="flex items-center gap-2">
                    {formatSoles(quantity * variant.product.priceCents)}
                    <Button type="button" variant="ghost" size="sm" onClick={() => remove(id)}>
                      Quitar uno
                    </Button>
                  </span>
                </li>
              );
            })}
            <li className="flex justify-between font-semibold">
              <span>Total</span>
              <span>{formatSoles(totalCents)}</span>
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
            <label className="flex flex-col gap-1.5 text-sm font-medium">
              ¿En qué convocatoria lo recoges?
              <select name="pickupEventId" required defaultValue="" className={fieldClass}>
                <option value="" disabled>
                  Elige una convocatoria
                </option>
                {props.pickupEvents.map((event) => (
                  <option key={event.id} value={event.id}>
                    {event.label}
                  </option>
                ))}
              </select>
            </label>
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
            <Button type="submit" size="lg" className="h-11" disabled={pending}>
              {pending ? "Creando tu pedido…" : "Hacer pedido y pagar"}
            </Button>
          </form>
        )}
      </section>
    </div>
  );
}
