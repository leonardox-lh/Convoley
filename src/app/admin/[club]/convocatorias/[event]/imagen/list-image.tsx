import type { Roster } from "@/modules/registrations";
import type { ImageBrand } from "./image-header";
import type { listImageLayout } from "./image-layout";
import { heavy, NIGHT, posterBackground, SOFT_BLUE } from "./poster-style";

const PAID_GREEN = "#22c55e";
const TILE = "rgba(255,255,255,0.08)";
const TILE_BORDER = "rgba(255,255,255,0.12)";
const ROW_GAP_PX = 8;
const TITLE_GLOW = "0 8px 24px rgba(0,0,0,0.6)";

interface Line {
  label: string;
  name: string;
  paid: boolean;
  waitlist: boolean;
  heading?: boolean;
}

type Layout = ReturnType<typeof listImageLayout>;

/**
 * The list image in the flyer's style, drawn by Satori (next/og): every element with children
 * uses display flex, and columns are explicit, since Satori has no grid.
 */
export function ListImage(props: ImageBrand & { roster: Roster; layout: Layout }) {
  const { layout, roster } = props;
  const lines: Line[] = [
    ...roster.players.map((p) => ({
      label: String(p.number),
      name: p.name,
      paid: p.paid,
      waitlist: false,
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
      <ListHeader {...props} count={roster.players.length} />
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
      <div
        style={{
          display: "flex",
          justifyContent: "flex-end",
          padding: "0 56px 28px",
          fontSize: 22,
          letterSpacing: 4,
          color: SOFT_BLUE,
          opacity: 0.6,
        }}
      >
        CONVOLEY
      </div>
    </div>
  );
}

/** Fits the layout's 260px header band: club, title with the last word in the accent, date. */
function ListHeader(props: ImageBrand & { count: number }) {
  const words = props.title.toUpperCase().split(/\s+/).filter(Boolean);
  const lastWord = words.pop() ?? "";
  const titlePx = props.title.length <= 22 ? 64 : 50;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 28, padding: "48px 56px 28px" }}>
      <div style={{ display: "flex", flexDirection: "column", flex: 1, gap: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          {props.logo && (
            // eslint-disable-next-line @next/next/no-img-element -- rendered by Satori, not the browser
            <img src={props.logo} alt="" width={56} height={56} style={{ borderRadius: 999 }} />
          )}
          <span style={{ display: "flex", fontSize: 26, letterSpacing: 4, color: SOFT_BLUE }}>
            {props.clubName.toUpperCase()}
          </span>
        </div>
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            columnGap: titlePx * 0.22,
            fontSize: titlePx,
            lineHeight: 1,
            transform: "skewX(-8deg)",
          }}
        >
          {words.map((word, index) => (
            <span key={index} style={{ display: "flex", ...heavy("white", 2, TITLE_GLOW) }}>
              {word}
            </span>
          ))}
          <span style={{ display: "flex", ...heavy(props.secondary, 2, TITLE_GLOW) }}>
            {lastWord}
          </span>
        </div>
        <span style={{ display: "flex", fontSize: 26, color: SOFT_BLUE }}>{props.when}</span>
      </div>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          padding: "14px 24px",
          borderRadius: 24,
          background: props.secondary,
          color: NIGHT,
        }}
      >
        <span style={{ display: "flex", fontSize: 60, lineHeight: 1, ...heavy(NIGHT, 1.5) }}>
          {props.count}
        </span>
        <span style={{ display: "flex", fontSize: 18, letterSpacing: 3 }}>INSCRITOS</span>
      </div>
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
          ...heavy(props.secondary, 1),
        }}
      >
        {line.name}
      </div>
    );
  }
  const badgePx = Math.round((layout.rowPx - ROW_GAP_PX) * 0.7);
  return (
    <div style={{ display: "flex", height: layout.rowPx, paddingBottom: ROW_GAP_PX }}>
      <div
        style={{
          display: "flex",
          flex: 1,
          alignItems: "center",
          gap: 14,
          padding: "0 14px 0 10px",
          borderRadius: 14,
          background: TILE,
          border: `1px solid ${TILE_BORDER}`,
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
            background: line.waitlist ? props.secondary : props.primary,
            color: line.waitlist ? NIGHT : "white",
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
