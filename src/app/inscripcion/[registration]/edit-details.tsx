"use client";

import { Pencil } from "lucide-react";
import { useActionState, useState } from "react";
import { FormMessage, OptionalSelect } from "@/components/form";
import { Modal } from "@/components/modal";
import { Toast } from "@/components/toast";
import { Button } from "@/components/ui/button";
import type { EditablePlayerDetails } from "@/modules/registrations";
import { GenderSelect } from "../../gender-select";
import { LEVEL_LABELS, POSITION_LABELS } from "../../player-labels";
import { editDetailsAction, type EditDetailsState } from "./edit-details-action";

const BLUE_OUTLINE = "border-primary text-primary hover:bg-primary/10 hover:text-primary";

/** "Editar mis datos": until the teams are built, the player fixes or adds what they play. */
export function EditDetailsButton(props: {
  registrationId: string;
  details: EditablePlayerDetails;
  isMixed: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [saved, setSaved] = useState(0);
  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="lg"
        className={`h-11 gap-1.5 ${BLUE_OUTLINE}`}
        onClick={() => setOpen(true)}
      >
        <Pencil aria-hidden />
        Editar mis datos
      </Button>
      {open && (
        <EditDetailsModal
          {...props}
          onClose={() => setOpen(false)}
          onSaved={() => {
            setOpen(false);
            setSaved((count) => count + 1);
          }}
        />
      )}
      {saved > 0 && <Toast key={saved}>Listo, guardamos tus datos.</Toast>}
    </>
  );
}

function EditDetailsModal(props: {
  registrationId: string;
  details: EditablePlayerDetails;
  isMixed: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [state, action, pending] = useActionState(
    async (previous: EditDetailsState, formData: FormData) => {
      const next = await editDetailsAction(previous, formData);
      if (next.status === "saved") props.onSaved();
      return next;
    },
    { status: "idle" },
  );
  return (
    <Modal title="Editar mis datos" onClose={props.onClose}>
      <form action={action} className="flex flex-col gap-3">
        <input type="hidden" name="registrationId" value={props.registrationId} />
        <p className="text-sm text-muted-foreground">
          Puedes cambiarlos hasta que el organizador arme los equipos.
        </p>
        <OptionalSelect
          label="Posición"
          name="position"
          options={POSITION_LABELS}
          defaultValue={props.details.position}
        />
        <OptionalSelect
          label="Nivel"
          name="level"
          options={LEVEL_LABELS}
          defaultValue={props.details.level}
        />
        {props.isMixed && <GenderSelect defaultValue={props.details.gender} />}
        {state.status === "error" && <FormMessage tone="error">{state.message}</FormMessage>}
        <Button
          type="submit"
          variant="outline"
          size="lg"
          className={`h-11 ${BLUE_OUTLINE}`}
          disabled={pending}
        >
          {pending ? "Guardando…" : "Guardar"}
        </Button>
      </form>
    </Modal>
  );
}
