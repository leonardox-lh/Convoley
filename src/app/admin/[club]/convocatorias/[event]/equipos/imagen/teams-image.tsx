import type { EventTeam } from "@/modules/registrations";
import { ImageFooter, ImageHeader, type ImageBrand } from "../../imagen/image-header";
import { LIST_IMAGE_FORMATS, type ListImageFormat } from "../../imagen/image-layout";
import { heavy, posterBackground, SOFT_BLUE } from "../../imagen/poster-style";

const HEADER_PX = 260;
const FOOTER_PX = 80;
const OUTER_PADDING_PX = 48;
const CARD_PADDING_PX = 28;
const CARD_GAP_PX = 24;
const MAX_TEAMS_PER_ROW = 3;
const STACKED_MAX_TEAMS = 4;
const MAX_ROW_PX = 60;
const MIN_ROW_PX = 22;
const ROW_TO_FONT = 0.62;
/** The team name line is taller than a player line. */
const TITLE_ROWS = 2;

const CARD = "rgba(255,255,255,0.08)";
const CARD_BORDER = "rgba(255,255,255,0.12)";

/** One card per team, up to 3 per row, sized so every name fits (HU-32). */
export function teamsImageLayout(format: ListImageFormat, teams: EventTeam[]) {
  const { width, height } = LIST_IMAGE_FORMATS[format];
  // Stories are tall: stack the cards, two per row once there are many teams.
  const maxPerRow =
    format === "historia" ? (teams.length <= STACKED_MAX_TEAMS ? 1 : 2) : MAX_TEAMS_PER_ROW;
  const perRow = Math.min(Math.max(teams.length, 1), maxPerRow);
  const teamRows = Math.ceil(Math.max(teams.length, 1) / perRow);
  const linesPerCard = Math.max(1, ...teams.map((team) => team.players.length)) + TITLE_ROWS;
  const available =
    height -
    HEADER_PX -
    FOOTER_PX -
    OUTER_PADDING_PX * 2 -
    teamRows * (CARD_PADDING_PX * 2 + CARD_GAP_PX);
  const rowPx = Math.max(
    MIN_ROW_PX,
    Math.min(MAX_ROW_PX, Math.floor(available / (teamRows * linesPerCard))),
  );
  return { width, height, perRow, rowPx, fontPx: Math.round(rowPx * ROW_TO_FONT) };
}

/** The teams image, in the flyer's poster style like the list image (Satori: flex everywhere). */
export function TeamsImage(
  props: ImageBrand & { teams: EventTeam[]; layout: ReturnType<typeof teamsImageLayout> },
) {
  const { layout, teams } = props;
  const rows = Array.from({ length: Math.ceil(teams.length / layout.perRow) }, (_, index) =>
    teams.slice(index * layout.perRow, (index + 1) * layout.perRow),
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
      <ImageHeader {...props} badge={{ value: String(teams.length), label: "EQUIPOS" }} />
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          flex: 1,
          justifyContent: "center",
          gap: CARD_GAP_PX,
          padding: `${OUTER_PADDING_PX}px 56px`,
        }}
      >
        {rows.map((row, rowIndex) => (
          <div key={rowIndex} style={{ display: "flex", gap: CARD_GAP_PX }}>
            {row.map((team) => (
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
                  borderTop: `10px solid ${props.secondary}`,
                }}
              >
                <span
                  style={{
                    display: "block",
                    fontSize: Math.round(layout.fontPx * 1.3),
                    ...heavy(props.secondary, 1.2),
                    overflow: "hidden",
                    whiteSpace: "nowrap",
                    textOverflow: "ellipsis",
                  }}
                >
                  {team.name}
                </span>
                <span
                  style={{
                    display: "flex",
                    marginBottom: Math.round(layout.rowPx * 0.4),
                    fontSize: Math.round(layout.fontPx * 0.75),
                    color: SOFT_BLUE,
                  }}
                >
                  {team.players.length} jugadores
                </span>
                {team.players.map((player) => (
                  <span
                    key={player.id}
                    style={{
                      display: "block",
                      height: layout.rowPx,
                      lineHeight: `${layout.rowPx}px`,
                      fontSize: layout.fontPx,
                      overflow: "hidden",
                      whiteSpace: "nowrap",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {player.firstName} {player.lastName.charAt(0)}.
                  </span>
                ))}
              </div>
            ))}
          </div>
        ))}
      </div>
      <ImageFooter />
    </div>
  );
}
