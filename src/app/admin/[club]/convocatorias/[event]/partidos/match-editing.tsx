"use client";

import { ArrowDown, ArrowUp, Pencil, Plus, Trash2, Trophy } from "lucide-react";
import { useActionState, useRef, useState } from "react";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { SelectPicker } from "@/components/date-time-pickers";
import { FormMessage } from "@/components/form";
import { Modal } from "@/components/modal";
import { Button } from "@/components/ui/button";
import {
  addMatchAction,
  changeMatchTeamsAction,
  createFinalAction,
  deleteMatchAction,
  moveMatchAction,
  type GameDayState,
} from "./actions";
import { TargetFields, type Target } from "./game-day-forms";

const IDLE: GameDayState = { status: "idle" };
const BLUE_OUTLINE = "border-primary text-primary hover:bg-primary/10 hover:text-primary";
const RED_OUTLINE =
  "border-destructive text-destructive hover:bg-destructive/10 hover:text-destructive";

type Team = { number: number; name: string };
type Pairing = { homeTeam: number; awayTeam: number };
type ServerAction = (previous: GameDayState, formData: FormData) => Promise<GameDayState>;

/** Picks the two teams of a match; closes itself once the server accepts it. */
function PairingDialog(
  props: Target & {
    title: string;
    hint?: string;
    submitLabel: string;
    teams: Team[];
    defaults?: Pairing | null;
    matchId?: string;
    action: ServerAction;
    onClose: () => void;
  },
) {
  const { action: serverAction, onClose } = props;
  const [state, action, pending] = useActionState(
    async (previous: GameDayState, formData: FormData) => {
      const result = await serverAction(previous, formData);
      if (result.status !== "error") onClose();
      return result;
    },
    IDLE,
  );
  const options = props.teams.map((team) => ({ value: String(team.number), label: team.name }));
  const [first, second] = props.teams;
  return (
    <Modal title={props.title} onClose={onClose}>
      {props.hint && <p className="text-sm text-muted-foreground">{props.hint}</p>}
      <form action={action} className="flex flex-col gap-3">
        <TargetFields {...props} />
        {props.matchId && <input type="hidden" name="matchId" value={props.matchId} />}
        <SelectPicker
          label="Equipo"
          name="homeTeam"
          options={options}
          defaultValue={String(props.defaults?.homeTeam ?? first?.number ?? "")}
        />
        <p className="text-center text-xs font-semibold text-muted-foreground uppercase">contra</p>
        <SelectPicker
          label="Equipo"
          name="awayTeam"
          options={options}
          defaultValue={String(props.defaults?.awayTeam ?? second?.number ?? "")}
        />
        {state.status === "error" && <FormMessage tone="error">{state.message}</FormMessage>}
        <div className="mt-1 flex gap-2">
          <Button type="button" variant="outline" className="h-11 flex-1" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" className="h-11 flex-1" disabled={pending}>
            {props.submitLabel}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

/** "+ Agregar partido" and, while there is none, "Armar la final". */
export function AddMatchButtons(
  props: Target & { teams: Team[]; hasFinal: boolean; suggestedFinal: Pairing | null },
) {
  const [open, setOpen] = useState<"match" | "final" | null>(null);
  const close = () => setOpen(null);
  return (
    <div className="mt-2 flex flex-col gap-2">
      <Button
        type="button"
        variant="outline"
        className={`h-11 ${BLUE_OUTLINE}`}
        onClick={() => setOpen("match")}
      >
        <Plus aria-hidden />
        Agregar partido
      </Button>
      {!props.hasFinal && (
        <Button type="button" className="h-11" onClick={() => setOpen("final")}>
          <Trophy aria-hidden />
          Armar la final
        </Button>
      )}
      {open === "match" && (
        <PairingDialog
          {...props}
          title="Nuevo partido"
          hint="Se juega antes de la final."
          submitLabel="Agregar"
          action={addMatchAction}
          onClose={close}
        />
      )}
      {open === "final" && (
        <PairingDialog
          {...props}
          title="Armar la final"
          hint="Te sugerimos al 1.º contra el 2.º de la tabla, pero puedes elegir otros equipos."
          submitLabel="Armar final"
          defaults={props.suggestedFinal}
          action={createFinalAction}
          onClose={close}
        />
      )}
    </div>
  );
}

function MoveButton(props: Target & { matchId: string; direction: "up" | "down" }) {
  const [, action, pending] = useActionState(moveMatchAction, IDLE);
  const Icon = props.direction === "up" ? ArrowUp : ArrowDown;
  return (
    <form action={action}>
      <TargetFields {...props} />
      <input type="hidden" name="matchId" value={props.matchId} />
      <input type="hidden" name="direction" value={props.direction} />
      <Button
        type="submit"
        variant="ghost"
        size="icon"
        className="size-9"
        disabled={pending}
        aria-label={props.direction === "up" ? "Jugar antes" : "Jugar después"}
      >
        <Icon aria-hidden />
      </Button>
    </form>
  );
}

/** Order, teams and delete for one match, next to its label. */
export function MatchActions(
  props: Target & {
    matchId: string;
    label: string;
    teams: Team[];
    pairing: Pairing;
    played: boolean;
    canMoveUp: boolean;
    canMoveDown: boolean;
  },
) {
  const [editing, setEditing] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleteState, remove, removing] = useActionState(deleteMatchAction, IDLE);
  const deleteForm = useRef<HTMLFormElement>(null);
  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex items-center gap-1">
        {props.canMoveUp && <MoveButton {...props} direction="up" />}
        {props.canMoveDown && <MoveButton {...props} direction="down" />}
        {!props.played && (
          <Button
            type="button"
            variant="outline"
            size="icon"
            className={`size-9 ${BLUE_OUTLINE}`}
            aria-label={`Cambiar equipos de ${props.label}`}
            onClick={() => setEditing(true)}
          >
            <Pencil aria-hidden />
          </Button>
        )}
        <form ref={deleteForm} action={remove}>
          <TargetFields {...props} />
          <input type="hidden" name="matchId" value={props.matchId} />
          <Button
            type="button"
            variant="outline"
            size="icon"
            className={`size-9 ${RED_OUTLINE}`}
            disabled={removing}
            aria-label={`Eliminar ${props.label}`}
            onClick={() => setConfirmingDelete(true)}
          >
            <Trash2 aria-hidden />
          </Button>
        </form>
      </div>
      {deleteState.status === "error" && (
        <FormMessage tone="error">{deleteState.message}</FormMessage>
      )}
      {editing && (
        <PairingDialog
          {...props}
          title={`Cambiar equipos · ${props.label}`}
          submitLabel="Guardar"
          defaults={props.pairing}
          action={changeMatchTeamsAction}
          onClose={() => setEditing(false)}
        />
      )}
      {confirmingDelete && (
        <ConfirmDialog
          title={
            props.label === "Final"
              ? "¿Eliminar la final?"
              : `¿Eliminar el ${props.label.toLowerCase()}?`
          }
          description={
            props.played
              ? "Se borra el partido con su resultado y la tabla se vuelve a calcular. Esto no se puede deshacer."
              : "Se borra el partido. Esto no se puede deshacer."
          }
          confirmLabel="Eliminar"
          onConfirm={() => {
            setConfirmingDelete(false);
            deleteForm.current?.requestSubmit();
          }}
          onCancel={() => setConfirmingDelete(false)}
        />
      )}
    </div>
  );
}
