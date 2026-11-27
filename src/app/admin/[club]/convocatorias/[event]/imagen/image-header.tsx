import { heavy, NIGHT, SOFT_BLUE } from "./poster-style";

/** Club header and footer shared by the list, teams and game-day images, for Satori. */
export interface ImageBrand {
  clubName: string;
  title: string;
  when: string;
  primary: string;
  secondary: string;
  logo: string | null;
}

const TITLE_GLOW = "0 8px 24px rgba(0,0,0,0.6)";
const CLUB_GLOW = "0 4px 14px rgba(0,0,0,0.6)";
export const CLUB_LOGO_PX = 120;
export const CLUB_NAME_PX = 48;
// Past this the title drops to the smaller size so it stays on one or two short lines.
const LONG_TITLE_CHARS = 14;

/**
 * The flyer's look in a ~310px band: club, title with the last word in the accent, date, and an
 * optional yellow badge on the right ("18 INSCRITOS").
 */
export function ImageHeader(props: ImageBrand & { badge?: { value: string; label: string } }) {
  const words = props.title.toUpperCase().split(/\s+/).filter(Boolean);
  const lastWord = words.pop() ?? "";
  const titlePx = props.title.length <= LONG_TITLE_CHARS ? 64 : 50;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 28, padding: "48px 56px 28px" }}>
      <div style={{ display: "flex", flexDirection: "column", flex: 1, gap: 10 }}>
        {/* Logo and name as big as the event flyer's badge: the club is who's inviting. */}
        <div style={{ display: "flex", alignItems: "center", gap: 22 }}>
          {props.logo && (
            // eslint-disable-next-line @next/next/no-img-element -- rendered by Satori, not the browser
            <img
              src={props.logo}
              alt=""
              width={CLUB_LOGO_PX}
              height={CLUB_LOGO_PX}
              style={{
                borderRadius: 999,
                border: "5px solid white",
                boxShadow: "0 10px 28px rgba(0,0,0,0.45)",
              }}
            />
          )}
          <span
            style={{
              display: "flex",
              maxWidth: 620,
              fontSize: CLUB_NAME_PX,
              lineHeight: 1.05,
              letterSpacing: 3,
              ...heavy("white", CLUB_GLOW),
            }}
          >
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
            <span key={index} style={{ display: "flex", ...heavy("white", TITLE_GLOW) }}>
              {word}
            </span>
          ))}
          <span style={{ display: "flex", ...heavy(props.secondary, TITLE_GLOW) }}>{lastWord}</span>
        </div>
        <span style={{ display: "flex", fontSize: 26, color: SOFT_BLUE }}>{props.when}</span>
      </div>
      {props.badge && (
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
          <span style={{ display: "flex", fontSize: 60, lineHeight: 1, ...heavy(NIGHT) }}>
            {props.badge.value}
          </span>
          <span style={{ display: "flex", fontSize: 18, letterSpacing: 3 }}>
            {props.badge.label}
          </span>
        </div>
      )}
    </div>
  );
}

// Mirrors ImageHeader's sizes, so images can be exactly as tall as their content.
const HEADER_PADDING_PX = 48 + 28;
const HEADER_GAPS_PX = 10 * 2;
const HEADER_LOGO_PX = CLUB_LOGO_PX + 10;
const HEADER_CLUB_PX = Math.ceil(CLUB_NAME_PX * 1.05);
const HEADER_WHEN_PX = 32;
const TITLE_LINE_CHARS = 23;
/** ImageFooter: its text line and bottom padding. */
export const IMAGE_FOOTER_PX = 56;

/** How tall ImageHeader draws, so an image can end right after its content. */
export function imageHeaderHeight(brand: Pick<ImageBrand, "title" | "logo">) {
  const titleLines = Math.max(1, Math.ceil(brand.title.length / TITLE_LINE_CHARS));
  const titlePx = brand.title.length <= LONG_TITLE_CHARS ? 64 : 50 * titleLines;
  return (
    HEADER_PADDING_PX +
    HEADER_GAPS_PX +
    (brand.logo ? HEADER_LOGO_PX : HEADER_CLUB_PX) +
    titlePx +
    HEADER_WHEN_PX
  );
}

export function ImageFooter() {
  return (
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
  );
}
