"use client";

import { useActionState } from "react";
import { fieldClass, FormMessage } from "@/components/form";
import { Button } from "@/components/ui/button";
import {
  createCommunityAction,
  deleteCommunityAction,
  renameCommunityAction,
  type CommunityActionState,
} from "./actions";

const IDLE: CommunityActionState = { status: "idle" };

export function NewCommunityForm({ clubSlug }: { clubSlug: string }) {
  const [state, action, pending] = useActionState(createCommunityAction, IDLE);
  return (
    <form action={action} className="flex flex-col gap-2">
      <input type="hidden" name="clubSlug" value={clubSlug} />
      <label className="flex flex-col gap-1.5 text-sm font-medium">
        Nueva comunidad o nivel
        <div className="flex gap-2">
          <input name="name" required placeholder="Amateur, Competitivo…" className={fieldClass} />
          <Button type="submit" className="h-11" disabled={pending}>
            Crear
          </Button>
        </div>
      </label>
      {state.status === "error" && <FormMessage tone="error">{state.message}</FormMessage>}
    </form>
  );
}

export function CommunityRow(props: { clubSlug: string; id: string; name: string }) {
  const [renameState, rename, renaming] = useActionState(renameCommunityAction, IDLE);
  const [deleteState, remove, removing] = useActionState(deleteCommunityAction, IDLE);
  const error = [renameState, deleteState].find((state) => state.status === "error");
  const pending = renaming || removing;

  return (
    <li className="flex flex-col gap-2 py-3">
      <div className="flex gap-2">
        <form action={rename} className="flex flex-1 gap-2">
          <input type="hidden" name="clubSlug" value={props.clubSlug} />
          <input type="hidden" name="communityId" value={props.id} />
          <input
            name="name"
            required
            defaultValue={props.name}
            aria-label={`Nombre de ${props.name}`}
            className={fieldClass}
          />
          <Button type="submit" variant="outline" className="h-11" disabled={pending}>
            Guardar
          </Button>
        </form>
        <form action={remove}>
          <input type="hidden" name="clubSlug" value={props.clubSlug} />
          <input type="hidden" name="communityId" value={props.id} />
          <Button
            type="submit"
            variant="ghost"
            className="h-11"
            disabled={pending}
            aria-label={`Eliminar ${props.name}`}
          >
            Eliminar
          </Button>
        </form>
      </div>
      {error?.status === "error" && <FormMessage tone="error">{error.message}</FormMessage>}
    </li>
  );
}
