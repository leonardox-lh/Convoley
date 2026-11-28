import type { Roster } from "@/modules/registrations";
import { ImageFooter, ImageHeader, type ImageBrand } from "./image-header";
import type { listImageLayout } from "./image-layout";
import { heavy, NIGHT, posterBackground } from "./poster-style";

const PAID_GREEN = "#22c55e";
const TILE = "rgba(255,255,255,0.08)";
const TILE_BORDER = "rgba(255,255,255,0.12)";
const FREE_TEXT = "rgba(255,255,255,0.45)";
const ROW_GAP_PX = 8;
const MAX_ROW_STRETCH = 1.25;

interface Line {
  label: string;
  name: string;
  paid: boolean;
  waitlist: boolean;
  /** An open seat: drawn dimmed so players see how many are left. */
  free?: boolean;
  heading?: boolean;
}

type Layout = ReturnType<typeof listImageLayout>;

/**
 * The list image in the flyer's style, drawn by Satori (next/og): every element with children
 * uses display flex, and columns are explicit, since Satori has no grid.
 */
export function ListImage(
  props: ImageBrand & { roster: Roster; capacity: number; layout: Layout },
) {
  const { layout, roster } = props;
  const freeSeats = Math.max(0, props.capacity - roster.players.length);
  const lines: Line[] = [
    ...roster.players.map((p) => ({
      label: String(p.number),
      name: p.name,
      paid: p.paid,
      waitlist: false,
    })),
    ...Array.from({ length: freeSeats }, (_, index) => ({
      label: String(roster.players.length + index + 1),
      name: "Cupo libre",
      paid: false,
      waitlist: false,
      free: true,
    })),
    ...(roster.waitlist.length > 0
      ? [{ label: "", name: "EN ESPERA", paid: false, waitlist: true, heading: true }]
      : []),
    ...roster.waitlist.map((p) => ({
      label: `E${p.number}`,
      name: p.name,
      paid: false,
      waitlist: true,
    })),
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
        color: "white",
        ...posterBackground(props.primary),
      }}
    >
      <ImageHeader
        {...props}
        badge={{ value: String(roster.players.length), label: "INSCRITOS" }}
      />
      <div style={{ display: "flex", flex: 1, padding: "8px 56px", gap: 20 }}>
        {columns.map((column, index) => (
          <div key={index} style={{ display: "flex", flexDirection: "column", flex: 1 }}>
            {column.map((line) => (
              <ListLine
                key={`${line.label}-${line.name}`}
                line={line}
                layout={layout}
                primary={props.primary}
                secondary={props.secondary}
              />
            ))}
          </div>
        ))}
      </div>
      <ImageFooter />
    </div>
  );
}

function ListLine(props: { line: Line; layout: Layout; primary: string; secondary: string }) {
  const { line, layout } = props;
  if (line.heading) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "flex-end",
          height: layout.rowPx,
          paddingBottom: ROW_GAP_PX + 4,
          fontSize: Math.round(layout.fontPx * 0.85),
          letterSpacing: 4,
          ...heavy(props.secondary),
        }}
      >
        {line.name}
      </div>
    );
  }
  const badgePx = Math.round((layout.rowPx - ROW_GAP_PX) * 0.7);
  return (
    // Rows stretch a little into space the header estimate left over, so no empty band remains.
    <div
      style={{
        display: "flex",
        flexGrow: 1,
        minHeight: layout.rowPx,
        maxHeight: Math.round(layout.rowPx * MAX_ROW_STRETCH),
        paddingBottom: ROW_GAP_PX,
      }}
    >
      <div
        style={{
          display: "flex",
          flex: 1,
          alignItems: "center",
          gap: 14,
          padding: "0 14px 0 10px",
          borderRadius: 14,
          background: line.free ? "transparent" : TILE,
          border: line.free ? `2px dashed ${TILE_BORDER}` : `1px solid ${TILE_BORDER}`,
          color: line.free ? FREE_TEXT : "white",
          fontSize: layout.fontPx,
        }}
      >
        <span
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            minWidth: badgePx,
            height: badgePx,
            padding: "0 6px",
            borderRadius: 999,
            background: line.free ? TILE : line.waitlist ? props.secondary : props.primary,
            color: line.waitlist ? NIGHT : line.free ? FREE_TEXT : "white",
            fontSize: Math.round(badgePx * 0.5),
          }}
        >
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
              color: NIGHT,
              fontSize: Math.round(layout.fontPx * 0.55),
              letterSpacing: 2,
            }}
          >
            PAGÓ
          </span>
        )}
      </div>
    </div>
  );
}
