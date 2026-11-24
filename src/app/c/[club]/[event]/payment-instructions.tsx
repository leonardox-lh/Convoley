/** How to pay the organizer directly (HU-13). Plain props, so client components can use it. */
export interface PaymentInfo {
  priceText: string;
  /** Local 9 digits, as people type it in Yape. */
  phone: string | null;
  holderName: string | null;
  qrUrl: string | null;
}

export function PaymentInstructions({ info }: { info: PaymentInfo }) {
  if (!info.phone && !info.qrUrl) {
    return <p className="text-sm text-zinc-500">Paga al organizador para asegurar tu cupo.</p>;
  }
  return (
    <div className="flex flex-col gap-2 text-sm">
      <p>
        Yapea o plinea <span className="font-semibold">{info.priceText}</span>
        {info.phone && (
          <>
            {" "}
            al <span className="font-semibold">{info.phone}</span>
          </>
        )}
        {info.holderName && <> ({info.holderName})</>}.
      </p>
      {info.qrUrl && (
        // eslint-disable-next-line @next/next/no-img-element -- served by our own route
        <img
          src={info.qrUrl}
          alt="QR para pagar con Yape o Plin"
          className="size-48 self-center rounded-lg border border-zinc-200 object-contain dark:border-zinc-800"
        />
      )}
    </div>
  );
}
