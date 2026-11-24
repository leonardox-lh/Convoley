import { ImageResponse } from "next/og";
import { formatInLima } from "@/lib/lima-time";
import { formatSoles } from "@/lib/money";
import { getClubProfile } from "@/modules/clubs";
import { loadEventPreview, seatsText } from "./event-preview";

export const alt = "Convocatoria de vóley";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const DEFAULT_PRIMARY = "#18181b";
const DEFAULT_ACCENT = "#facc15";

/** The card WhatsApp shows for a shared event link (HU-11), in the club's colors. */
export default async function EventOpenGraphImage({
  params,
}: {
  params: Promise<{ club: string; event: string }>;
}) {
  const { club: clubSlug, event: eventId } = await params;
  const [event, club] = await Promise.all([
    loadEventPreview(clubSlug, eventId),
    getClubProfile(clubSlug),
  ]);
  const primary = club?.primaryColor ?? DEFAULT_PRIMARY;
  const accent = club?.secondaryColor ?? DEFAULT_ACCENT;
  const when = event ? formatInLima(event.startsAt) : "";

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: 64,
        background: primary,
        color: "white",
      }}
    >
      <div style={{ display: "flex", fontSize: 36, opacity: 0.85 }}>
        {event?.clubName ?? "Convoley"}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={{ display: "flex", fontSize: 72, fontWeight: 700, lineHeight: 1.1 }}>
          {event?.title ?? "Convocatoria"}
        </div>
        {event && (
          <div style={{ display: "flex", fontSize: 36 }}>
            {when.charAt(0).toUpperCase() + when.slice(1)}
          </div>
        )}
        {event && (
          <div style={{ display: "flex", fontSize: 32, opacity: 0.85 }}>
            {event.venueName} · {formatSoles(event.priceCents)}
          </div>
        )}
      </div>
      {event && (
        <div
          style={{
            display: "flex",
            alignSelf: "flex-start",
            padding: "12px 28px",
            borderRadius: 999,
            background: accent,
            color: primary,
            fontSize: 40,
            fontWeight: 700,
          }}
        >
          {seatsText(event)}
        </div>
      )}
    </div>,
    size,
  );
}
