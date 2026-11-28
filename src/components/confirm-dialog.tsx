"use client";

import { Button } from "@/components/ui/button";
import { Modal } from "./modal";

/** Asks before something that can't be undone; Escape or a tap outside cancels. */
export function ConfirmDialog(props: {
  title: string;
  description: string;
  confirmLabel: string;
  pending?: boolean;
  error?: string | null;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <Modal role="alertdialog" title={props.title} onClose={props.onCancel}>
      <p className="text-sm text-muted-foreground">{props.description}</p>
      {props.error && <p className="text-sm text-destructive">{props.error}</p>}
      <div className="mt-2 flex gap-2">
        <Button type="button" variant="outline" className="h-11 flex-1" onClick={props.onCancel}>
          Cancelar
        </Button>
        <Button
          type="button"
          variant="destructive"
          className="h-11 flex-1"
          disabled={props.pending}
          onClick={props.onConfirm}
        >
          {props.confirmLabel}
        </Button>
      </div>
    </Modal>
  );
}
