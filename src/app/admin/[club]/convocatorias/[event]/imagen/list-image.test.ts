import { ImageResponse } from "next/og";
import { createElement } from "react";
import { describe, expect, it } from "vitest";
import { buildRoster } from "@/modules/registrations/domain/roster";
import { listImageLayout, type ListImageFormat } from "./image-layout";
import { ListImage } from "./list-image";

const PNG_SIGNATURE = [137, 80, 78, 71];

const registrations = Array.from({ length: 22 }, (_, index) => ({
  firstName: `Jugadora${index + 1}`,
  lastName: "Pérez",
  status:
    index < 18
      ? index % 3 === 0
        ? ("paid" as const)
        : ("pending_payment" as const)
      : ("waitlisted" as const),
  createdAt: new Date(Date.UTC(2026, 11, 1, 10, index)),
}));

async function render(format: ListImageFormat) {
  const roster = buildRoster(registrations);
  const layout = listImageLayout(format, roster.players.length + roster.waitlist.length + 1);
  const response = new ImageResponse(
    createElement(ListImage, {
      clubName: "Vóley Miraflores",
      title: "Martes mixto",
      when: "Martes, 1 de diciembre de 2026, 8:00 p. m.",
      primary: "#1d4ed8",
      secondary: "#facc15",
      logo: null,
      roster,
      layout,
    }),
    { width: layout.width, height: layout.height },
  );
  return new Uint8Array(await response.arrayBuffer());
}

describe("HU-16: la imagen de la lista se genera como PNG", () => {
  it.each(["cuadrado", "historia"] as const)("HU-16: formato %s", async (format) => {
    const png = await render(format);
    expect([...png.slice(0, 4)]).toEqual(PNG_SIGNATURE);
  });
});
