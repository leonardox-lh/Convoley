import { FormMessage } from "@/components/form";
import { Button, buttonVariants } from "@/components/ui/button";
import { getMercadoPagoStatus, isMercadoPagoConfigured } from "@/modules/payments";
import { disconnectMercadoPagoAction } from "./actions";

const RESULT_MESSAGES = {
  conectado: { tone: "ok", text: "¡Listo! Tu cuenta de Mercado Pago quedó conectada." },
  desconectado: { tone: "ok", text: "Desconectaste Mercado Pago." },
  error: {
    tone: "error",
    text: "No se pudo conectar Mercado Pago. Vuelve a intentarlo; si esa cuenta ya está en otro club, desconéctala allá primero.",
  },
} as const;

/** HU-18: connect the organizer's own Mercado Pago account by OAuth, or disconnect it. */
export async function MercadoPagoSection(props: {
  clubSlug: string;
  clubId: string;
  result: string | undefined;
}) {
  // Without the app credentials (HT-05) this deployment can't offer Mercado Pago at all.
  if (!isMercadoPagoConfigured()) return null;
  const status = await getMercadoPagoStatus(props.clubId);
  const message = RESULT_MESSAGES[props.result as keyof typeof RESULT_MESSAGES];

  return (
    <section className="flex flex-col gap-3 rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
      <h2 className="font-semibold">Cobro automático con Mercado Pago</h2>
      {message && <FormMessage tone={message.tone}>{message.text}</FormMessage>}
      {status ? (
        <>
          <p className="text-sm">
            Conectado a la cuenta {status.mpUserId}
            {!status.liveMode && " (modo prueba)"}. Los jugadores pagan con Yape o tarjeta y el
            dinero entra directo a tu cuenta: Convoley nunca lo retiene.
          </p>
          <form action={disconnectMercadoPagoAction}>
            <input type="hidden" name="clubSlug" value={props.clubSlug} />
            <Button type="submit" variant="outline" className="h-11 w-full">
              Desconectar Mercado Pago
            </Button>
          </form>
          <p className="text-xs text-zinc-500">
            Al desconectar, los jugadores vuelven a pagar por captura. También puedes quitarle el
            acceso a Convoley desde tu cuenta de Mercado Pago.
          </p>
        </>
      ) : (
        <>
          <p className="text-sm">
            Conecta tu cuenta y los jugadores pagan con Yape o tarjeta dentro de Convoley. Se marca
            &quot;pagado&quot; solo, y el dinero entra directo a tu cuenta. No compartes tu
            contraseña.
          </p>
          <a
            href={`/api/mercado-pago/connect?club=${encodeURIComponent(props.clubSlug)}`}
            className={buttonVariants({ size: "lg", className: "h-11 w-full" })}
          >
            Conectar Mercado Pago
          </a>
        </>
      )}
    </section>
  );
}
