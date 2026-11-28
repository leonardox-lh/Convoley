"use client";

import { ChevronLeft, ChevronRight, Plus, ShoppingBag } from "lucide-react";
import { useRef, useState } from "react";
import { Modal } from "@/components/modal";
import { formatSoles } from "@/lib/money";
import { cn } from "@/lib/utils";
import type { CatalogProduct } from "./store-cart";

type AddToCart = (variantId: string, stock: number | null) => void;

/** One button per size (or a single "Agregar"); a size out of stock is crossed out. */
export function VariantButtons({
  product,
  onAdd,
  className,
}: {
  product: CatalogProduct;
  onAdd: AddToCart;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-wrap gap-1.5", className)}>
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
            onClick={() => onAdd(variant.id, variant.stock)}
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
  );
}

/** The product in detail: every photo (swipe or arrows), the full description and its sizes. */
export function ProductDetail({
  product,
  inCart,
  onAdd,
  onClose,
}: {
  product: CatalogProduct;
  inCart: number;
  onAdd: AddToCart;
  onClose: () => void;
}) {
  return (
    <Modal title={product.name} onClose={onClose} className="max-w-sm">
      <PhotoCarousel name={product.name} urls={product.photoUrls} />
      <div className="flex flex-col gap-1">
        <p className="text-2xl font-extrabold tracking-tight text-primary">
          {formatSoles(product.priceCents)}
        </p>
        {product.stockNote && (
          <p className="text-sm font-medium text-muted-foreground">{product.stockNote}</p>
        )}
        {product.description && (
          // The organizer's own line breaks are kept.
          <p className="max-h-40 overflow-y-auto text-sm whitespace-pre-line text-muted-foreground">
            {product.description}
          </p>
        )}
      </div>
      <VariantButtons product={product} onAdd={onAdd} />
      {inCart > 0 && (
        <p className="text-center text-sm font-medium text-primary">
          Tienes {inCart} en tu carrito
        </p>
      )}
    </Modal>
  );
}

function PhotoCarousel({ name, urls }: { name: string; urls: string[] }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [current, setCurrent] = useState(0);

  if (urls.length === 0) {
    return (
      <div className="flex aspect-square items-center justify-center rounded-2xl bg-primary/10 text-primary">
        <ShoppingBag className="size-14" aria-hidden />
      </div>
    );
  }

  const goTo = (index: number) => {
    const track = trackRef.current!;
    track.scrollTo({ left: index * track.clientWidth, behavior: "smooth" });
  };
  const several = urls.length > 1;

  return (
    <div className="relative">
      <div
        ref={trackRef}
        onScroll={(event) => {
          const track = event.currentTarget;
          setCurrent(Math.round(track.scrollLeft / track.clientWidth));
        }}
        className="flex aspect-square snap-x snap-mandatory overflow-x-auto rounded-2xl bg-muted [scrollbar-width:none]"
      >
        {urls.map((url, index) => (
          // eslint-disable-next-line @next/next/no-img-element -- served by our own route
          <img
            key={url}
            src={url}
            alt={several ? `${name}, foto ${index + 1} de ${urls.length}` : name}
            className="size-full shrink-0 snap-start object-cover"
          />
        ))}
      </div>
      {several && (
        <>
          <CarouselArrow
            label="Foto anterior"
            className="left-2"
            hidden={current === 0}
            onClick={() => goTo(current - 1)}
          >
            <ChevronLeft className="size-5" aria-hidden />
          </CarouselArrow>
          <CarouselArrow
            label="Foto siguiente"
            className="right-2"
            hidden={current === urls.length - 1}
            onClick={() => goTo(current + 1)}
          >
            <ChevronRight className="size-5" aria-hidden />
          </CarouselArrow>
          <div className="absolute inset-x-0 bottom-2 flex justify-center gap-1.5">
            {urls.map((url, index) => (
              <button
                key={url}
                type="button"
                aria-label={`Ver foto ${index + 1}`}
                aria-current={index === current}
                onClick={() => goTo(index)}
                className={cn(
                  "h-2 rounded-full bg-white/70 shadow transition-all",
                  index === current ? "w-5 bg-white" : "w-2",
                )}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function CarouselArrow(props: {
  label: string;
  className: string;
  hidden: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  if (props.hidden) return null;
  return (
    <button
      type="button"
      aria-label={props.label}
      onClick={props.onClick}
      className={cn(
        "absolute top-1/2 flex size-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/85 text-foreground shadow-md transition hover:bg-white",
        props.className,
      )}
    >
      {props.children}
    </button>
  );
}
