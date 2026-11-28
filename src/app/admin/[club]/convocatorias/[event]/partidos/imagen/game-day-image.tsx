import { pointDifference, type GameDay } from "@/modules/registrations";
import type { StoredImage } from "../../imagen/image-assets";
import {
  IMAGE_FOOTER_PX,
  ImageFooter,
  ImageHeader,
  imageHeaderHeight,
  type ImageBrand,
} from "../../imagen/image-header";
import { Ball } from "../../flyer/flyer-image";
import { heavy, NIGHT, posterBackground, SOFT_BLUE } from "../../imagen/poster-style";

type Props = ImageBrand & { gameDay: GameDay };

const CARD = "rgba(255,255,255,0.08)";
const CARD_BORDER = "rgba(255,255,255,0.12)";
const LONG_NAME_CHARS = 14;
const IMAGE_WIDTH_PX = 1080;
const PHOTO_SIDE_MARGIN_PX = 56;
const PHOTO_BORDER_PX = 6;
const LINE_HEIGHT = 1.2;
/** Geist's average glyph width in em: to guess where long text wraps. */
const CHAR_EM = 0.56;

/** Lines a text takes at `fontPx` in `widthPx`, to size the image to its content. */
function lineCount(text: string, fontPx: number, widthPx: number, charEm: number) {
  return Math.max(1, Math.ceil((text.length * fontPx * charEm) / widthPx));
}

/** The biggest size that shows the whole photo (never cropping a player) in the space left. */
function fitPhoto(photo: StoredImage, maxHeight: number) {
  const maxWidth = IMAGE_WIDTH_PX - 2 * (PHOTO_SIDE_MARGIN_PX + PHOTO_BORDER_PX);
  const scale = Math.min(maxWidth / photo.width, maxHeight / photo.height);
  return { width: Math.round(photo.width * scale), height: Math.round(photo.height * scale) };
}

const signed = (value: number) => (value > 0 ? `+${value}` : `${value}`);

/** Night poster background lit by the club color, like the flyer. */
// The flyer's ball, dimmed so the table and scores stay easy to read over it.
const BACKDROP_BALL_SIZE_PX = 700;
const BACKDROP_BALL_OPACITY = 0.35;

function Frame(props: ImageBrand & { children: React.ReactNode; clubRowEnd?: React.ReactNode }) {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        position: "relative",
        overflow: "hidden",
        color: "white",
        ...posterBackground(props.primary),
      }}
    >
      <div
        style={{
          position: "absolute",
          top: 0,
          right: 0,
          width: BACKDROP_BALL_SIZE_PX,
          height: BACKDROP_BALL_SIZE_PX,
          display: "flex",
          opacity: BACKDROP_BALL_OPACITY,
        }}
      >
        <Ball size={BACKDROP_BALL_SIZE_PX} primary={props.primary} secondary={props.secondary} />
      </div>
      <ImageHeader {...props} />
      {props.children}
      <ImageFooter />
    </div>
  );
}

const SECTION_TITLE_PX = 26 * LINE_HEIGHT + 8;
const SCHEDULE_BOTTOM_PX = 24;
const MAX_ROW_PX = 124;
const SCHEDULE_SIDE_PADDING_PX = 32;
const ROW_SIDE_PADDING_PX = 20;
const MIN_ROW_PX = 44;
const ROW_GAP_RATIO = 0.16;
// Team names in a match share the row with two scores: past this they'd get cut with "…".
const MAX_MATCH_FONT_PX = 44;

/**
 * Rows as tall as the format allows (6 teams still fit), up to a comfortable maximum; the image
 * then ends right after the last match, so a short game day leaves no empty band.
 */
export function scheduleImageLayout(
  gameDay: GameDay,
  brand: Pick<ImageBrand, "title" | "logo">,
  maxHeight: number,
) {
  const rows = gameDay.standings.length + gameDay.matches.length;
  // The two section titles are children too: one gap after each title and between rows.
  const gaps = rows + 1;
  const fixed =
    imageHeaderHeight(brand) + IMAGE_FOOTER_PX + 2 * SECTION_TITLE_PX + SCHEDULE_BOTTOM_PX;
  const fitting = (maxHeight - fixed) / (rows + gaps * ROW_GAP_RATIO);
  const row = Math.max(MIN_ROW_PX, Math.min(MAX_ROW_PX, Math.floor(fitting)));
  const content = fixed + rows * row + gaps * Math.round(row * ROW_GAP_RATIO);
  return { row, height: Math.min(maxHeight, Math.ceil(content)) };
}

/** Fixed-width cells in one block: the same in the header and in every row, so they line up. */
function StatCells(props: { cells: [string, React.CSSProperties][]; width: number }) {
  return (
    <div style={{ display: "flex" }}>
      {props.cells.map(([text, style], column) => (
        <span
          key={column}
          style={{ display: "flex", justifyContent: "center", width: props.width, ...style }}
        >
          {text}
        </span>
      ))}
    </div>
  );
}

function SectionTitle(props: { children: React.ReactNode; columns?: string[]; statWidth: number }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        padding: `0 ${ROW_SIDE_PADDING_PX}px`,
        marginTop: 8,
      }}
    >
      <span style={{ display: "flex", flex: 1, fontSize: 26, letterSpacing: 6, color: SOFT_BLUE }}>
        {props.children}
      </span>
      {props.columns && (
        <StatCells
          width={props.statWidth}
          cells={props.columns.map((column) => [column, { fontSize: 22, color: SOFT_BLUE }])}
        />
      )}
    </div>
  );
}

/**
 * The game day as it goes: the table on top, then every match in play order with its score, or
 * empty boxes while it hasn't been played. Shared again after each result (Satori: flex everywhere).
 */
export function ScheduleImage(props: Props & { row: number }) {
  const { gameDay, row } = props;
  const nameOf = new Map(gameDay.teams.map((team) => [team.number, team.name]));
  const gap = Math.round(row * ROW_GAP_RATIO);
  const font = Math.round(row * 0.44);
  const matchFont = Math.min(font, MAX_MATCH_FONT_PX);
  const statWidth = Math.round(row * 1.1);
  const groupCount = gameDay.matches.filter((match) => !match.isFinal).length;
  const ellipsis = {
    display: "block",
    overflow: "hidden",
    whiteSpace: "nowrap",
    textOverflow: "ellipsis",
  } as const;
  const scoreBox = (score: number | null, won: boolean) => (
    <span
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: matchFont * 2.2,
        height: row * 0.72,
        borderRadius: row * 0.2,
        fontSize: matchFont * 1.15,
        background:
          score === null ? "transparent" : won ? props.secondary : "rgba(255,255,255,0.14)",
        border: `2px solid ${score === null ? "rgba(255,255,255,0.35)" : "transparent"}`,
        ...heavy(won ? NIGHT : "white"),
      }}
    >
      {score ?? ""}
    </span>
  );

  return (
    <Frame {...props}>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          flex: 1,
          gap,
          padding: `0 ${SCHEDULE_SIDE_PADDING_PX}px 24px`,
        }}
      >
        <SectionTitle statWidth={statWidth} columns={["PJ", "GAN.", "DIF."]}>
          TABLA DE POSICIONES
        </SectionTitle>
        {gameDay.standings.map((standing, index) => {
          const leader = index === 0 && standing.played > 0;
          return (
            <div
              key={standing.teamNumber}
              style={{
                display: "flex",
                alignItems: "center",
                gap: row * 0.25,
                height: row,
                padding: `0 ${ROW_SIDE_PADDING_PX}px`,
                borderRadius: row * 0.26,
                background: leader ? props.primary : CARD,
                border: `1px solid ${leader ? props.primary : CARD_BORDER}`,
                boxShadow: leader ? `0 0 40px ${props.primary}` : "none",
              }}
            >
              <span
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: row * 0.6,
                  height: row * 0.6,
                  borderRadius: 999,
                  fontSize: font * 0.8,
                  background: leader ? props.secondary : "rgba(255,255,255,0.12)",
                  color: leader ? NIGHT : SOFT_BLUE,
                }}
              >
                {index + 1}
              </span>
              <span style={{ ...ellipsis, flex: 1, fontSize: font * 1.05, ...heavy("white") }}>
                {nameOf.get(standing.teamNumber)}
              </span>
              <StatCells
                width={statWidth}
                cells={[
                  [String(standing.played), { fontSize: font, opacity: 0.75 }],
                  [String(standing.won), { fontSize: font, ...heavy("white") }],
                  [signed(pointDifference(standing)), { fontSize: font, opacity: 0.75 }],
                ]}
              />
            </div>
          );
        })}

        <SectionTitle statWidth={statWidth}>PARTIDOS</SectionTitle>
        {gameDay.matches.map((match) => {
          const played = match.homeScore !== null && match.awayScore !== null;
          const homeWon = played && (match.homeScore as number) > (match.awayScore as number);
          const groupIndex = gameDay.matches.filter((other) => !other.isFinal).indexOf(match);
          return (
            <div
              key={match.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: row * 0.2,
                height: row,
                padding: `0 ${ROW_SIDE_PADDING_PX}px`,
                borderRadius: row * 0.26,
                background: match.isFinal ? "rgba(250,204,21,0.12)" : CARD,
                border: `${match.isFinal ? 2 : 1}px solid ${match.isFinal ? props.secondary : CARD_BORDER}`,
              }}
            >
              <span
                style={{
                  display: "flex",
                  width: matchFont * 2.2,
                  fontSize: matchFont * 0.62,
                  letterSpacing: 2,
                  color: match.isFinal ? props.secondary : SOFT_BLUE,
                }}
              >
                {match.isFinal ? "FINAL" : `P${groupIndex + 1}/${groupCount}`}
              </span>
              <span
                style={{
                  ...ellipsis,
                  flex: 1,
                  fontSize: matchFont,
                  ...heavy(played && !homeWon ? "rgba(255,255,255,0.6)" : "white"),
                }}
              >
                {nameOf.get(match.homeTeam)}
              </span>
              {scoreBox(match.homeScore, homeWon)}
              <span style={{ display: "flex", fontSize: matchFont, color: SOFT_BLUE }}>–</span>
              {scoreBox(match.awayScore, played && !homeWon)}
              <span
                style={{
                  ...ellipsis,
                  flex: 1,
                  textAlign: "right",
                  fontSize: matchFont,
                  ...heavy(played && homeWon ? "rgba(255,255,255,0.6)" : "white"),
                }}
              >
                {nameOf.get(match.awayTeam)}
              </span>
            </div>
          );
        })}
      </div>
    </Frame>
  );
}

// Same size as the club name, so the header reads as one line: club on the left, title on the right.
const CHAMPION_LABEL_PX = 52;
const TROPHY_LABEL_PX = 58;
const BANNER_NAME_PX = 72;
const BANNER_LONG_NAME_PX = 54;
const BANNER_PADDING_Y_PX = 22;
const BANNER_HEIGHT_PX = BANNER_NAME_PX * LINE_HEIGHT + 2 * BANNER_PADDING_Y_PX;
const BANNER_DIAMOND_PX = 18;
const BODY_GAP_PX = 28;
const BODY_PADDING_TOP_PX = 12;
const BODY_PADDING_BOTTOM_PX = 36;
const PLAYERS_PX = 32;
const PLAYERS_WIDTH_PX = 900;
const FINAL_PILL_PX = 28 + 32 * LINE_HEIGHT;

type PhotoSize = { width: number; height: number };

/**
 * How tall the champion image is: exactly its content (the team banner over the photo, or the
 * banner, players and final without one), never more than the format.
 */
export function championImageLayout(input: {
  gameDay: GameDay;
  brand: Pick<ImageBrand, "title" | "logo">;
  players: string[];
  photo: StoredImage | null;
  maxHeight: number;
}): { height: number; photoSize: PhotoSize | null } {
  const fixed =
    imageHeaderHeight(input.brand) +
    IMAGE_FOOTER_PX +
    BODY_PADDING_TOP_PX +
    BODY_PADDING_BOTTOM_PX +
    BANNER_HEIGHT_PX;
  if (input.photo) {
    // The banner overlaps the photo's top edge by half its height.
    const chrome = fixed - BANNER_HEIGHT_PX / 2 + 2 * PHOTO_BORDER_PX;
    const photoSize = fitPhoto(input.photo, input.maxHeight - chrome);
    return { photoSize, height: Math.min(input.maxHeight, Math.ceil(chrome + photoSize.height)) };
  }
  const final = input.gameDay.matches.find((match) => match.isFinal);
  const finalScored = final !== undefined && final.homeScore !== null && final.awayScore !== null;
  const playersText = input.players.join(" · ");
  const blocks = [
    ...(playersText
      ? [lineCount(playersText, PLAYERS_PX, PLAYERS_WIDTH_PX, CHAR_EM) * PLAYERS_PX * LINE_HEIGHT]
      : []),
    ...(finalScored ? [FINAL_PILL_PX] : []),
  ];
  const content = fixed + blocks.reduce((total, block) => total + block + BODY_GAP_PX, 0);
  return { photoSize: null, height: Math.min(input.maxHeight, Math.ceil(content)) };
}

/** Top right of the header: the trophy and "CAMPEÓN", as big as the club's name. */
function ChampionLabel(props: { color: string }) {
  return (
    <div
      style={{ display: "flex", alignItems: "center", gap: 12, flexShrink: 0, marginLeft: "auto" }}
    >
      <span style={{ display: "flex", fontSize: TROPHY_LABEL_PX }}>🏆</span>
      <span
        style={{
          display: "flex",
          fontSize: CHAMPION_LABEL_PX,
          letterSpacing: 1,
          ...heavy(props.color, "0 0 24px rgba(250,204,21,0.45)"),
        }}
      >
        CAMPEÓN
      </span>
    </div>
  );
}

/** The team's name on a gold award ribbon with diamonds at both ends. */
function ChampionBanner(props: { name: string; primary: string; secondary: string }) {
  const namePx = props.name.length > LONG_NAME_CHARS ? BANNER_LONG_NAME_PX : BANNER_NAME_PX;
  const diamond = (
    <div
      style={{
        display: "flex",
        width: BANNER_DIAMOND_PX,
        height: BANNER_DIAMOND_PX,
        transform: "rotate(45deg)",
        background: NIGHT,
        flexShrink: 0,
      }}
    />
  );
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 28,
        height: BANNER_HEIGHT_PX,
        padding: `0 40px`,
        borderRadius: 22,
        backgroundImage: `linear-gradient(180deg, #fde68a 0%, ${props.secondary} 45%, #d97706 100%)`,
        border: "3px solid #fff7d6",
        boxShadow: `0 14px 40px rgba(0,0,0,0.55), 0 0 50px ${props.secondary}`,
      }}
    >
      {diamond}
      <span
        style={{
          display: "block",
          overflow: "hidden",
          whiteSpace: "nowrap",
          textOverflow: "ellipsis",
          fontSize: namePx,
          lineHeight: `${BANNER_NAME_PX * LINE_HEIGHT}px`,
          ...heavy(NIGHT),
        }}
      >
        {props.name.toUpperCase()}
      </span>
      {diamond}
    </div>
  );
}

/**
 * The champion: trophy and "CAMPEÓN" next to the club, then the team's photo with its name on a
 * gold ribbon across the top. Without a photo, the ribbon, the players and the final's score.
 */
export function ChampionImage(
  props: Props & { players: string[]; photo: StoredImage | null; photoSize: PhotoSize | null },
) {
  const { gameDay } = props;
  const name = gameDay.champion?.name ?? "";
  const final = gameDay.matches.find((match) => match.isFinal);
  const nameOf = new Map(gameDay.teams.map((team) => [team.number, team.name]));
  const banner = <ChampionBanner name={name} primary={props.primary} secondary={props.secondary} />;
  return (
    <Frame {...props} clubRowEnd={<ChampionLabel color={props.secondary} />}>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          flex: 1,
          alignItems: "center",
          gap: BODY_GAP_PX,
          padding: `${BODY_PADDING_TOP_PX}px ${PHOTO_SIDE_MARGIN_PX}px ${BODY_PADDING_BOTTOM_PX}px`,
          textAlign: "center",
        }}
      >
        {props.photo && props.photoSize ? (
          <div
            style={{
              display: "flex",
              position: "relative",
              justifyContent: "center",
              paddingTop: BANNER_HEIGHT_PX / 2,
            }}
          >
            <div
              style={{
                display: "flex",
                borderRadius: 40,
                overflow: "hidden",
                border: `${PHOTO_BORDER_PX}px solid ${props.secondary}`,
                boxShadow: `0 0 60px ${props.primary}`,
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- rendered by Satori, not the browser */}
              <img
                src={props.photo.src}
                alt=""
                width={props.photoSize.width}
                height={props.photoSize.height}
              />
            </div>
            {/* Later siblings paint on top in Satori: the ribbon overlaps the photo's top edge. */}
            <div
              style={{
                display: "flex",
                position: "absolute",
                top: 0,
                left: 40,
                right: 40,
                justifyContent: "center",
              }}
            >
              {banner}
            </div>
          </div>
        ) : (
          banner
        )}
        {!props.photo && props.players.length > 0 && (
          <span
            style={{
              display: "flex",
              fontSize: PLAYERS_PX,
              opacity: 0.85,
              maxWidth: PLAYERS_WIDTH_PX,
            }}
          >
            {props.players.join(" · ")}
          </span>
        )}
        {!props.photo && final && final.homeScore !== null && final.awayScore !== null && (
          <span
            style={{
              display: "flex",
              padding: "14px 36px",
              borderRadius: 999,
              fontSize: 32,
              background: "rgba(255,255,255,0.12)",
              border: `2px solid ${props.secondary}`,
            }}
          >
            Final · {nameOf.get(final.homeTeam)} {final.homeScore} – {final.awayScore}{" "}
            {nameOf.get(final.awayTeam)}
          </span>
        )}
      </div>
    </Frame>
  );
}
