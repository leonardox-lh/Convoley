"use client";

import { Phone } from "lucide-react";
import { useState } from "react";
import { CopyButton } from "@/components/copy-button";
import { GenderIcon } from "@/components/gender-icon";
import { Modal } from "@/components/modal";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
// Type only: this is a client component and the module index pulls in server code.
import type { PlayerLevel, PlayerPosition } from "@/modules/registrations";
import { LEVEL_LABELS, POSITION_LABELS } from "./player-labels";

const WHATSAPP_PATH =
  "M12.04 2a9.9 9.9 0 0 0-8.5 15l-1.4 5.1 5.2-1.37A9.9 9.9 0 1 0 12.04 2Zm0 18.1a8.2 8.2 0 0 1-4.18-1.15l-.3-.18-3.09.81.83-3.01-.2-.31a8.22 8.22 0 1 1 6.94 3.84Zm4.5-6.15c-.25-.12-1.46-.72-1.69-.8-.23-.08-.39-.12-.55.12-.16.25-.63.8-.78.97-.14.16-.29.18-.53.06a6.7 6.7 0 0 1-3.32-2.9c-.25-.43.25-.4.71-1.33.08-.16.04-.3-.02-.43-.06-.12-.55-1.33-.76-1.82-.2-.48-.4-.41-.55-.42h-.47a.9.9 0 0 0-.65.3 2.74 2.74 0 0 0-.86 2.04 4.76 4.76 0 0 0 1 2.53 10.9 10.9 0 0 0 4.18 3.69c1.55.67 2.16.73 2.94.61.47-.07 1.46-.6 1.66-1.17.2-.58.2-1.07.15-1.17-.06-.1-.22-.16-.47-.28Z";

export interface PlayerDetails {
  name: string;
  gender: string | null;
  position: PlayerPosition | null;
  level: PlayerLevel | null;
  /** Only the organizer gets it (+519XXXXXXXX); players never see each other's numbers. */
  phone?: string | null;
}

/** Wraps a roster row: tapping it opens a card with how the player signed up. */
export function PlayerDetailsTrigger(props: {
  player: PlayerDetails;
  className?: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        aria-haspopup="dialog"
        onClick={() => setOpen(true)}
        className={cn("cursor-pointer text-left", props.className)}
      >
        {props.children}
      </button>
      {open && <PlayerCard player={props.player} onClose={() => setOpen(false)} />}
    </>
  );
}

function PlayerCard({ player, onClose }: { player: PlayerDetails; onClose: () => void }) {
  const rows: [string, string | null][] = [
    ["Posición", player.position && POSITION_LABELS[player.position]],
    ["Nivel", player.level && LEVEL_LABELS[player.level]],
  ];
  const shown = rows.filter((row): row is [string, string] => row[1] !== null);
  const localPhone = player.phone?.replace(/^\+51/, "");

  return (
    <Modal
      title={
        <span className="flex items-center gap-2">
          {player.name}
          <GenderIcon gender={player.gender} className="size-5" />
        </span>
      }
      onClose={onClose}
    >
      {shown.length > 0 ? (
        <dl className="flex flex-col gap-2 text-sm">
          {shown.map(([label, value]) => (
            <div key={label} className="flex justify-between gap-3">
              <dt className="text-muted-foreground">{label}</dt>
              <dd className="font-medium">{value}</dd>
            </div>
          ))}
        </dl>
      ) : (
        <p className="text-sm text-muted-foreground">No indicó posición ni nivel.</p>
      )}
      {player.phone && localPhone && (
        <div className="flex flex-col gap-2 border-t pt-3">
          <div className="flex items-center justify-between gap-3 text-sm">
            <span className="text-muted-foreground">Celular</span>
            <span className="flex items-center gap-1 font-medium">
              {localPhone.replace(/(\d{3})(\d{3})(\d{3})/, "$1 $2 $3")}
              <CopyButton text={localPhone} label="Copiar número" className="-mr-2" />
            </span>
          </div>
          <div className="flex gap-2">
            <a
              href={`https://wa.me/${player.phone.replace("+", "")}`}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(
                buttonVariants({ variant: "outline" }),
                "h-10 flex-1 gap-1.5 border-emerald-600 text-emerald-700 hover:bg-emerald-600/10 hover:text-emerald-700",
              )}
            >
              <svg viewBox="0 0 24 24" aria-hidden className="size-4 fill-current">
                <path d={WHATSAPP_PATH} />
              </svg>
              WhatsApp
            </a>
            <a
              href={`tel:${player.phone}`}
              className={cn(
                buttonVariants({ variant: "outline" }),
                "h-10 flex-1 gap-1.5 border-primary text-primary hover:bg-primary/10 hover:text-primary",
              )}
            >
              <Phone aria-hidden />
              Llamar
            </a>
          </div>
        </div>
      )}
    </Modal>
  );
}
