"use client";

import { QrCode } from "lucide-react";
import { useState } from "react";
import { CopyButton } from "@/components/copy-button";
import type { PaymentApp } from "@/modules/clubs";

export const PAYMENT_APP_LABELS: Record<PaymentApp, string> = { yape: "Yape", plin: "Plin" };

const PAY_VERBS: Record<PaymentApp, string> = { yape: "Yapea", plin: "Plinea" };

/** The app's official icon (public/payment-apps), so the player spots which one to open. */
function PaymentAppBadge({ app }: { app: PaymentApp }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- a tiny static icon
    <img
      src={`/payment-apps/${app}.png`}
      alt={PAYMENT_APP_LABELS[app]}
      width={44}
      height={44}
      className="size-11 shrink-0 rounded-xl object-contain"
    />
  );
}

/** How to pay the organizer directly (HU-13). Plain props, so client components can use it. */
export interface PaymentInfo {
  priceText: string;
  /** Null for clubs that set up their number before choosing the app. */
  app: PaymentApp | null;
  /** Local 9 digits, as people type it in Yape. */
  phone: string | null;
  holderName: string | null;
  qrUrl: string | null;
}

export function PaymentInstructions({ info }: { info: PaymentInfo }) {
  const [qrOpen, setQrOpen] = useState(false);
  if (!info.phone && !info.qrUrl) {
    return <p className="text-sm text-zinc-500">Paga al organizador para asegurar tu cupo.</p>;
  }
  return (
    <div className="flex flex-col gap-2 text-sm">
      <div className="flex items-center gap-3">
        <div className="flex shrink-0 gap-1.5">
          {(info.app ? [info.app] : (Object.keys(PAYMENT_APP_LABELS) as PaymentApp[])).map(
            (app) => (
              <PaymentAppBadge key={app} app={app} />
            ),
          )}
        </div>
        <p>
          {info.app ? PAY_VERBS[info.app] : "Yapea o plinea"}{" "}
          <span className="font-semibold">{info.priceText}</span>
          {info.phone && (
            <>
              {" "}
              al <span className="font-semibold">{info.phone}</span>
            </>
          )}
          {info.holderName && (
            <>
              {" "}
              a nombre de <span className="font-semibold">{info.holderName}</span>
            </>
          )}
          .
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {info.phone && <CopyButton text={info.phone} label="Copiar número" showLabel />}
        {info.qrUrl && (
          <button
            type="button"
            aria-expanded={qrOpen}
            onClick={() => setQrOpen((open) => !open)}
            className="flex h-9 shrink-0 items-center gap-1.5 rounded-xl border px-3 font-medium transition-colors hover:bg-secondary hover:text-primary"
          >
            <QrCode className="size-4" aria-hidden />
            {qrOpen ? "Ocultar QR" : "Ver QR"}
          </button>
        )}
      </div>
      {info.qrUrl && qrOpen && (
        // eslint-disable-next-line @next/next/no-img-element -- served by our own route
        <img
          src={info.qrUrl}
          alt={`QR para pagar con ${info.app ? PAYMENT_APP_LABELS[info.app] : "Yape o Plin"}`}
          className="mx-auto size-56 rounded-lg border border-zinc-200 object-contain dark:border-zinc-800"
        />
      )}
    </div>
  );
}
