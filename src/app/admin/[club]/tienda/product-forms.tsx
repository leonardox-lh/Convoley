"use client";

import { useActionState } from "react";
import {
  Field,
  fieldClass,
  floatingFieldClass,
  FormMessage,
  submitKeepingValues,
  TextField,
} from "@/components/form";
import { FileField } from "@/components/file-field";
import { Button } from "@/components/ui/button";
import {
  addPhotoAction,
  removePhotoAction,
  saveProductAction,
  toggleProductAction,
  type ProductActionState,
} from "./actions";

const IDLE: ProductActionState = { status: "idle" };

export interface ProductFormValues {
  productId?: string;
  name: string;
  description: string;
  price: string;
  stock: string;
}

export function ProductForm(props: { clubSlug: string; values?: ProductFormValues }) {
  const [state, action, pending] = useActionState(saveProductAction, IDLE);
  const values = props.values;
  return (
    <form onSubmit={submitKeepingValues(action)} className="flex flex-col gap-4">
      <input type="hidden" name="clubSlug" value={props.clubSlug} />
      {values?.productId && <input type="hidden" name="productId" value={values.productId} />}
      <TextField
        label="Nombre"
        name="name"
        defaultValue={values?.name}
        placeholder="Polo del club"
      />
      <Field label="Descripción (opcional)" float="always">
        <textarea
          name="description"
          rows={2}
          defaultValue={values?.description}
          className={fieldClass}
        />
      </Field>
      <TextField
        label="Precio (S/)"
        name="price"
        inputMode="decimal"
        defaultValue={values?.price}
        placeholder="45.00"
      />
      {values?.stock !== undefined && (
        <input type="hidden" name="loadedStock" value={values.stock} />
      )}
      <Field
        label="Stock"
        hint={<>Por talla: &quot;S:3, M:5&quot;. Si no tiene tallas, solo el número.</>}
      >
        <input
          name="stock"
          required
          defaultValue={values?.stock}
          placeholder="S:3, M:5, L:0  o  10 si es talla única"
          className={floatingFieldClass}
        />
      </Field>
      {!values?.productId && (
        <FileField
          label="Fotos (opcional)"
          name="photos"
          multiple
          accept="image/jpeg,image/png,image/webp"
          hint="Hasta 5 fotos de 2 MB cada una. JPG, PNG o WebP."
        />
      )}
      {state.status === "error" && <FormMessage tone="error">{state.message}</FormMessage>}
      <Button type="submit" size="lg" className="h-11" disabled={pending}>
        {values?.productId ? "Guardar cambios" : "Crear producto"}
      </Button>
    </form>
  );
}

export function ToggleProductForm(props: {
  clubSlug: string;
  productId: string;
  isActive: boolean;
}) {
  const [state, action, pending] = useActionState(toggleProductAction, IDLE);
  return (
    <form action={action} className="flex flex-col gap-2">
      <input type="hidden" name="clubSlug" value={props.clubSlug} />
      <input type="hidden" name="productId" value={props.productId} />
      <input type="hidden" name="isActive" value={String(!props.isActive)} />
      <Button type="submit" variant="outline" className="h-11" disabled={pending}>
        {props.isActive ? "Ocultar de la tienda" : "Publicar en la tienda"}
      </Button>
      {state.status === "error" && <FormMessage tone="error">{state.message}</FormMessage>}
    </form>
  );
}

export function AddPhotoForm(props: { clubSlug: string; productId: string }) {
  const [state, action, pending] = useActionState(addPhotoAction, IDLE);
  return (
    <form action={action} className="flex flex-col gap-2">
      <input type="hidden" name="clubSlug" value={props.clubSlug} />
      <input type="hidden" name="productId" value={props.productId} />
      <FileField
        label="Agregar foto (hasta 2 MB)"
        name="photo"
        accept="image/jpeg,image/png,image/webp"
        required
      />
      {state.status === "error" && <FormMessage tone="error">{state.message}</FormMessage>}
      <Button type="submit" variant="outline" className="h-11" disabled={pending}>
        {pending ? "Subiendo…" : "Subir foto"}
      </Button>
    </form>
  );
}

export function RemovePhotoButton(props: {
  clubSlug: string;
  productId: string;
  photoKey: string;
}) {
  const [state, action, pending] = useActionState(removePhotoAction, IDLE);
  return (
    <form action={action}>
      <input type="hidden" name="clubSlug" value={props.clubSlug} />
      <input type="hidden" name="productId" value={props.productId} />
      <input type="hidden" name="key" value={props.photoKey} />
      <Button type="submit" variant="ghost" size="sm" disabled={pending}>
        Quitar
      </Button>
      {state.status === "error" && <FormMessage tone="error">{state.message}</FormMessage>}
    </form>
  );
}
