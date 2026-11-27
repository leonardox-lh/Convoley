import type { EventTeam } from "@/modules/registrations";
import { POSITION_LABELS } from "../../../../../../player-labels";
import { ImageFooter, ImageHeader, type ImageBrand } from "../../imagen/image-header";
import { heavy, NAVY, posterBackground, SOFT_BLUE } from "../../imagen/poster-style";

const WIDTH_PX = 1080;
const SIDE_PADDING_PX = 56;
const CONTENT_PADDING_PX = 12;
const FOOTER_PX = 56;
const CARD_PADDING_PX = 24;
const CARD_TOP_BORDER_PX = 10;
const CARD_GAP_PX = 20;
const MAX_TEAMS_PER_ROW = 3;
/** The "VS" badge between the teams of a row: a match-up poster, not just a list. */
const VS_PX = 64;

const MAX_NAME_PX = 32;
const MIN_NAME_PX = 18;
/** Geist's average glyph width, in em: used to shrink the text until full names fit one line. */
const CHAR_EM = 0.56;
/** Team names are in Geist Bold, whose glyphs run wider. */
const BOLD_CHAR_EM = 0.64;
const TITLE_SCALE = 1.25;
const POSITION_SCALE = 0.7;
const COUNT_SCALE = 0.7;
const LINE_HEIGHT = 1.2;
const PLAYER_GAP_PX = 10;
const COUNT_GAP_PX = 14;

// Mirrors ImageHeader's sizes, so the image is exactly as tall as its content.
const HEADER_PADDING_PX = 48 + 28;
const HEADER_GAPS_PX = 10 * 2;
const HEADER_LOGO_PX = 76;
const HEADER_CLUB_PX = 32;
const HEADER_WHEN_PX = 32;
const LONG_TITLE_CHARS = 14;
const TITLE_LINE_CHARS = 23;

const CARD = "rgba(255,255,255,0.08)";
const CARD_BORDER = "rgba(255,255,255,0.12)";

type Player = EventTeam["players"][number];

/**
 * One card per team, up to 3 per row, each player with their position below (HU-32). The image
 * is as tall as its content: no empty bands above or below the cards.
 */
export function teamsImageLayout(teams: EventTeam[], brand: Pick<ImageBrand, "title" | "logo">) {
  const perRow = Math.min(Math.max(teams.length, 1), MAX_TEAMS_PER_ROW);
  const cardTextPx =
    (WIDTH_PX - SIDE_PADDING_PX * 2 - (perRow - 1) * (VS_PX + CARD_GAP_PX * 2)) / perRow -
    CARD_PADDING_PX * 2;
  // Full names on one line: shrink the font to the widest name (anything longer gets "…").
  const longest = (texts: string[]) => Math.max(1, ...texts.map((text) => text.length));
  const nameChars = longest(teams.flatMap((team) => team.players.map(fullName)));
  const titleChars =
    (longest(teams.map((team) => team.name)) * TITLE_SCALE * BOLD_CHAR_EM) / CHAR_EM;
  const fitPx = Math.floor(cardTextPx / (Math.max(nameChars, titleChars) * CHAR_EM));
  const namePx = Math.max(MIN_NAME_PX, Math.min(MAX_NAME_PX, fitPx));

  const sizes = {
    namePx,
    titlePx: Math.round(namePx * TITLE_SCALE),
    positionPx: Math.round(namePx * POSITION_SCALE),
    countPx: Math.round(namePx * COUNT_SCALE),
  };
  const playerPx = (sizes.namePx + sizes.positionPx) * LINE_HEIGHT + PLAYER_GAP_PX;
  const cardPx = (players: number) =>
    CARD_TOP_BORDER_PX +
    CARD_PADDING_PX * 2 +
    (sizes.titlePx + sizes.countPx) * LINE_HEIGHT +
    COUNT_GAP_PX +
    players * playerPx;
  const rows = chunk(teams, perRow);
  const rowsPx = rows.reduce(
    (total, row) => total + cardPx(Math.max(0, ...row.map((team) => team.players.length))),
    0,
  );
  const height = Math.ceil(
    headerPx(brand) +
      CONTENT_PADDING_PX * 2 +
      rowsPx +
      Math.max(0, rows.length - 1) * CARD_GAP_PX +
      FOOTER_PX,
  );
  return { width: WIDTH_PX, height, perRow, ...sizes };
}

function headerPx(brand: Pick<ImageBrand, "title" | "logo">) {
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

function chunk<T>(items: T[], size: number): T[][] {
  return Array.from({ length: Math.ceil(items.length / size) }, (_, index) =>
    items.slice(index * size, (index + 1) * size),
  );
}

function fullName(player: Player) {
  return `${player.firstName} ${player.lastName}`;
}

const oneLine = {
  display: "block",
  overflow: "hidden",
  whiteSpace: "nowrap",
  textOverflow: "ellipsis",
} as const;

/** The teams image, in the flyer's poster style like the list image (Satori: flex everywhere). */
export function TeamsImage(
  props: ImageBrand & { teams: EventTeam[]; layout: ReturnType<typeof teamsImageLayout> },
) {
  const { layout, teams } = props;
  const line = (px: number) => ({
    fontSize: px,
    height: px * LINE_HEIGHT,
    lineHeight: `${px * LINE_HEIGHT}px`,
  });
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
      <ImageHeader {...props} badge={{ value: String(teams.length), label: "EQUIPOS" }} />
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: CARD_GAP_PX,
          padding: `${CONTENT_PADDING_PX}px ${SIDE_PADDING_PX}px`,
        }}
      >
        {chunk(teams, layout.perRow).map((row, rowIndex) => (
          <div key={rowIndex} style={{ display: "flex", gap: CARD_GAP_PX }}>
            {row.flatMap((team, index) => [
              ...(index > 0
                ? [<VersusBadge key={`vs-${team.number}`} color={props.secondary} />]
                : []),
              <div
                key={team.number}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  flex: 1,
                  minWidth: 0,
                  padding: CARD_PADDING_PX,
                  borderRadius: 28,
                  background: CARD,
                  border: `1px solid ${CARD_BORDER}`,
                  borderTop: `${CARD_TOP_BORDER_PX}px solid ${props.secondary}`,
                }}
              >
                <span style={{ ...oneLine, ...line(layout.titlePx), ...heavy(props.secondary) }}>
                  {team.name}
                </span>
                <span
                  style={{
                    display: "flex",
                    ...line(layout.countPx),
                    marginBottom: COUNT_GAP_PX,
                    color: SOFT_BLUE,
                  }}
                >
                  {`${team.players.length} ${team.players.length === 1 ? "jugador" : "jugadores"}`}
                </span>
                {team.players.map((player) => (
                  <div
                    key={player.id}
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      marginBottom: PLAYER_GAP_PX,
                    }}
                  >
                    <span style={{ ...oneLine, ...line(layout.namePx) }}>{fullName(player)}</span>
                    <span style={{ ...oneLine, ...line(layout.positionPx), color: SOFT_BLUE }}>
                      {player.position ? POSITION_LABELS[player.position] : "Sin posición"}
                    </span>
                  </div>
                ))}
              </div>,
            ])}
          </div>
        ))}
      </div>
      <ImageFooter />
    </div>
  );
}

function VersusBadge(props: { color: string }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        alignSelf: "center",
        flexShrink: 0,
        width: VS_PX,
        height: VS_PX,
        borderRadius: VS_PX,
        background: props.color,
        boxShadow: `0 0 28px ${props.color}`,
      }}
    >
      <span style={{ display: "flex", fontSize: Math.round(VS_PX * 0.4), ...heavy(NAVY) }}>VS</span>
    </div>
  );
}
