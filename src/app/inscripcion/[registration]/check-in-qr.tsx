import { renderSVG } from "uqr";
import { appUrl } from "@/lib/app-url";

/**
 * HU-38: the player shows this at the court; the organizer scans it with the phone camera and
 * lands on the attendance page, which only a signed-in organizer of the club can open.
 */
export async function CheckInQr(props: {
  clubSlug: string;
  eventId: string;
  registrationId: string;
}) {
  const url = `${await appUrl()}/admin/${props.clubSlug}/convocatorias/${props.eventId}/asistencia/${props.registrationId}`;
  const svg = Buffer.from(renderSVG(url)).toString("base64");
  return (
    <section className="flex flex-col items-center gap-2 rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
      <h2 className="font-medium">Tu QR para la cancha</h2>
      {/* eslint-disable-next-line @next/next/no-img-element -- inline SVG data, nothing to optimize */}
      <img
        src={`data:image/svg+xml;base64,${svg}`}
        alt="QR de asistencia"
        width={200}
        height={200}
        className="bg-white p-2"
      />
      <p className="text-center text-sm text-zinc-500">
        Muéstraselo al organizador al llegar para marcar tu asistencia.
      </p>
    </section>
  );
}
