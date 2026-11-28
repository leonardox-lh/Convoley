"use client";

import { Users } from "lucide-react";
import { useState } from "react";
import { GenderIcon } from "@/components/gender-icon";
import { Modal } from "@/components/modal";
import { Button } from "@/components/ui/button";

export interface TeamPlayer {
  id: string;
  name: string;
  gender: string | null;
  /** "Armador", "Líbero"… or null when the player didn't say. */
  position: string | null;
}

/** A team's name in the standings; tapping it shows who plays in that team. */
export function TeamPlayersButton(props: { name: string; players: TeamPlayer[] }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex min-w-0 items-center gap-1.5 text-left font-semibold underline-offset-4 hover:text-primary hover:underline"
      >
        <span className="truncate">{props.name}</span>
        <Users className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
      </button>
      {open && (
        <Modal title={props.name} onClose={() => setOpen(false)} className="max-w-sm">
          {props.players.length === 0 ? (
            <p className="text-sm text-muted-foreground">Este equipo todavía no tiene jugadores.</p>
          ) : (
            <ol className="flex max-h-[60vh] flex-col divide-y overflow-y-auto">
              {props.players.map((player, index) => (
                <li key={player.id} className="flex items-center gap-3 py-2.5 text-sm">
                  <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                    {index + 1}
                  </span>
                  <span className="min-w-0 flex-1 truncate font-medium">{player.name}</span>
                  {player.position && (
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {player.position}
                    </span>
                  )}
                  <GenderIcon gender={player.gender} />
                </li>
              ))}
            </ol>
          )}
          <Button type="button" variant="outline" onClick={() => setOpen(false)}>
            Cerrar
          </Button>
        </Modal>
      )}
    </>
  );
}
