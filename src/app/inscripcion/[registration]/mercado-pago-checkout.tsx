"use client";

import Script from "next/script";
import { startTransition, useActionState, useEffect, useRef, useState } from "react";
import { FormMessage, TextField } from "@/components/form";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { payWithMercadoPagoAction, type MercadoPagoPayState } from "./actions";

// Mercado Pago's official browser SDK: card data and the Yape code never touch our server,
// only the one-time token it returns.
const SDK_URL = "https://sdk.mercadopago.com/js/v2";
const CARD_BRICK_ID = "mercado-pago-card";

interface CardFormData {
  token: string;
  payment_method_id: string;
  issuer_id?: string | number;
  installments: number;
  payer?: { email?: string };
}

interface MercadoPagoSdk {
  yape(options: { otp: string; phoneNumber: string }): { create(): Promise<{ id: string }> };
  bricks(): {
    create(
      brick: "cardPayment",
      containerId: string,
      settings: {
        initialization: { amount: number; payer?: { email?: string } };
        customization?: { visual?: { hideFormTitle?: boolean } };
        callbacks: {
          onReady?: () => void;
          onError?: (error: unknown) => void;
          onSubmit: (data: CardFormData) => Promise<void>;
        };
      },
    ): Promise<{ unmount(): void }>;
  };
}

declare global {
  interface Window {
    MercadoPago?: new (publicKey: string, options?: { locale: string }) => MercadoPagoSdk;
  }
}

type Method = "yape" | "card";

/** HU-19: pay with Yape (phone + approval code) or card without leaving the page. */
export function MercadoPagoCheckout(props: {
  registrationId: string;
  publicKey: string;
  amountCents: number;
}) {
  const [method, setMethod] = useState<Method>("yape");
  const [sdkReady, setSdkReady] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [state, formAction, pending] = useActionState<MercadoPagoPayState, FormData>(
    payWithMercadoPagoAction,
    { status: "idle" },
  );

  function pay(fields: Record<string, string>) {
    const formData = new FormData();
    formData.set("registrationId", props.registrationId);
    for (const [key, value] of Object.entries(fields)) formData.set(key, value);
    startTransition(() => formAction(formData));
  }

  const sdk = () =>
    sdkReady &&
    window.MercadoPago &&
    new window.MercadoPago(props.publicKey, {
      locale: "es-PE",
    });

  return (
    <div className="flex flex-col gap-3">
      <Script src={SDK_URL} strategy="afterInteractive" onReady={() => setSdkReady(true)} />
      <div role="tablist" aria-label="Medio de pago" className="grid grid-cols-2 gap-2">
        <MethodTab active={method === "yape"} onClick={() => setMethod("yape")} label="Yape" />
        <MethodTab active={method === "card"} onClick={() => setMethod("card")} label="Tarjeta" />
      </div>

      {method === "yape" ? (
        <YapeForm
          disabled={!sdkReady || pending}
          onPay={async ({ phone, otp, email }) => {
            setLocalError(null);
            const mp = sdk();
            if (!mp) return;
            try {
              const { id } = await mp.yape({ otp, phoneNumber: phone }).create();
              pay({ token: id, paymentMethodId: "yape", installments: "1", payerEmail: email });
            } catch {
              setLocalError("Revisa tu celular y el código de aprobación de Yape.");
            }
          }}
        />
      ) : (
        <CardBrick
          sdk={sdk}
          amountCents={props.amountCents}
          onPay={(data) =>
            pay({
              token: data.token,
              paymentMethodId: data.payment_method_id,
              installments: String(data.installments),
              issuerId: data.issuer_id ? String(data.issuer_id) : "",
              payerEmail: data.payer?.email ?? "",
            })
          }
        />
      )}

      {pending && <p className="text-sm text-zinc-500">Procesando tu pago…</p>}
      {localError && <FormMessage tone="error">{localError}</FormMessage>}
      {state.status === "error" && <FormMessage tone="error">{state.message}</FormMessage>}
      {state.status === "refunded" && <FormMessage tone="error">{state.message}</FormMessage>}
      {state.status === "pending" && (
        <FormMessage tone="ok">
          Mercado Pago está revisando tu pago. Te confirmamos aquí en unos minutos.
        </FormMessage>
      )}
    </div>
  );
}

function MethodTab(props: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={props.active}
      onClick={props.onClick}
      className={cn(
        "h-11 rounded-lg border text-sm font-medium",
        props.active
          ? "border-zinc-900 bg-zinc-900 text-white dark:border-white dark:bg-white dark:text-zinc-900"
          : "border-zinc-300 dark:border-zinc-700",
      )}
    >
      {props.label}
    </button>
  );
}

function YapeForm(props: {
  disabled: boolean;
  onPay: (input: { phone: string; otp: string; email: string }) => Promise<void>;
}) {
  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={async (event) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        await props.onPay({
          phone: String(data.get("phone") ?? "").replace(/\D/g, ""),
          otp: String(data.get("otp") ?? "").trim(),
          email: String(data.get("email") ?? "").trim(),
        });
      }}
    >
      <TextField
        label="Celular de Yape"
        name="phone"
        type="tel"
        inputMode="numeric"
        autoComplete="tel-national"
        pattern="9\d{8}"
        title="9 dígitos, empieza con 9"
        placeholder="987654321"
      />
      <TextField
        label="Código de aprobación"
        name="otp"
        inputMode="numeric"
        autoComplete="one-time-code"
        pattern="\d{6}"
        title="Los 6 dígitos que te muestra Yape"
        placeholder="123456"
      />
      <p className="text-xs text-zinc-500">
        En tu app de Yape entra a &quot;Código de aprobación&quot; y copia los 6 dígitos.
      </p>
      <TextField
        label="Correo para el comprobante"
        name="email"
        type="email"
        autoComplete="email"
      />
      <Button type="submit" size="lg" className="h-11" disabled={props.disabled}>
        Pagar con Yape
      </Button>
    </form>
  );
}

function CardBrick(props: {
  sdk: () => MercadoPagoSdk | false | undefined;
  amountCents: number;
  onPay: (data: CardFormData) => void;
}) {
  const { sdk, amountCents, onPay } = props;
  const onPayRef = useRef(onPay);
  useEffect(() => {
    onPayRef.current = onPay;
  }, [onPay]);
  const mp = sdk();

  useEffect(() => {
    if (!mp) return;
    let brick: { unmount(): void } | undefined;
    let cancelled = false;
    void mp
      .bricks()
      .create("cardPayment", CARD_BRICK_ID, {
        initialization: { amount: amountCents / 100 },
        customization: { visual: { hideFormTitle: true } },
        callbacks: { onSubmit: async (data) => onPayRef.current(data) },
      })
      .then((created) => {
        if (cancelled) created.unmount();
        else brick = created;
      });
    return () => {
      cancelled = true;
      brick?.unmount();
    };
    // The SDK instance changes every render; mounting once per amount is enough.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [Boolean(mp), amountCents]);

  if (!mp) return <p className="text-sm text-zinc-500">Cargando el formulario de tarjeta…</p>;
  return <div id={CARD_BRICK_ID} />;
}
