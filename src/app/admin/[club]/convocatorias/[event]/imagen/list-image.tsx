import type { Roster } from "@/modules/registrations";
import { ImageFooter, ImageHeader, type ImageBrand } from "./image-header";
import type { listImageLayout } from "./image-layout";

const PAID_GREEN = "#16a34a";

interface Line {
  label: string;
  name: string;
  paid: boolean;
  heading?: boolean;
}

/**
 * The list image drawn by Satori (next/og): every element with children uses display flex,
 * and columns are explicit, since Satori has no grid.
 */
export function ListImage(
  props: ImageBrand & { roster: Roster; layout: ReturnType<typeof listImageLayout> },
) {
  const { layout, roster } = props;
  const lines: Line[] = [
    ...roster.players.map((p) => ({ label: `${p.number}.`, name: p.name, paid: p.paid })),
    ...(roster.waitlist.length > 0
      ? [{ label: "", name: "Lista de espera", paid: false, heading: true }]
      : []),
    ...roster.waitlist.map((p) => ({ label: `E${p.number}`, name: p.name, paid: false })),
  ];
  const perColumn = Math.ceil(lines.length / layout.columns) || 1;
  const columns = Array.from({ length: layout.columns }, (_, index) =>
    lines.slice(index * perColumn, (index + 1) * perColumn),
  );

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        background: "white",
        color: "#18181b",
      }}
    >
      <ImageHeader {...props} />
      <div style={{ display: "flex", flex: 1, padding: "24px 56px", gap: 24 }}>
        {columns.map((column, index) => (
          <div key={index} style={{ display: "flex", flexDirection: "column", flex: 1 }}>
            {column.map((line) => (
              <ListLine key={`${line.label}-${line.name}`} line={line} {...props} />
            ))}
          </div>
        ))}
      </div>
      <ImageFooter />
    </div>
  );
}

function ListLine({
  line,
  layout,
  primary,
}: {
  line: Line;
  layout: ReturnType<typeof listImageLayout>;
  primary: string;
}) {
  if (line.heading) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          height: layout.rowPx,
          fontSize: layout.fontPx,
          fontWeight: 700,
          color: primary,
        }}
      >
        {line.name}
      </div>
    );
  }
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 14,
        height: layout.rowPx,
        fontSize: layout.fontPx,
      }}
    >
      <span style={{ display: "flex", width: layout.fontPx * 1.8, opacity: 0.6 }}>
        {line.label}
      </span>
      <span
        style={{
          display: "block",
          flex: 1,
          minWidth: 0,
          overflow: "hidden",
          whiteSpace: "nowrap",
          textOverflow: "ellipsis",
        }}
      >
        {line.name}
      </span>
      {line.paid && (
        <span
          style={{
            display: "flex",
            padding: "2px 12px",
            borderRadius: 999,
            background: PAID_GREEN,
            color: "white",
            fontSize: Math.round(layout.fontPx * 0.6),
            fontWeight: 700,
          }}
        >
          PAGÓ
        </span>
      )}
    </div>
  );
}
