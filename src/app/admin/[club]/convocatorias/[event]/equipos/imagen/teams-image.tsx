import type { EventTeam } from "@/modules/registrations";
import { ImageFooter, ImageHeader, type ImageBrand } from "../../imagen/image-header";
import { LIST_IMAGE_FORMATS, type ListImageFormat } from "../../imagen/image-layout";

const HEADER_PX = 260;
const FOOTER_PX = 80;
const MAX_TEAMS_PER_ROW = 4;
const MAX_ROW_PX = 56;
const MIN_ROW_PX = 22;
const ROW_TO_FONT = 0.62;

/** One column per team, up to 4 per row, sized so every name fits (HU-32). */
export function teamsImageLayout(format: ListImageFormat, teams: EventTeam[]) {
  const { width, height } = LIST_IMAGE_FORMATS[format];
  const perRow = Math.min(Math.max(teams.length, 1), MAX_TEAMS_PER_ROW);
  const teamRows = Math.ceil(Math.max(teams.length, 1) / perRow);
  // Each team block: a title line plus its players.
  const linesPerBlock = Math.max(1, ...teams.map((team) => team.players.length)) + 1;
  const available = height - HEADER_PX - FOOTER_PX;
  const rowPx = Math.max(
    MIN_ROW_PX,
    Math.min(MAX_ROW_PX, Math.floor(available / (teamRows * linesPerBlock))),
  );
  return { width, height, perRow, rowPx, fontPx: Math.round(rowPx * ROW_TO_FONT) };
}

/** The teams image, in the same style as the list image (Satori: flex everywhere). */
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
        background: "white",
        color: "#18181b",
      }}
    >
      <ImageHeader {...props} />
      <div style={{ display: "flex", flexDirection: "column", flex: 1, padding: "24px 56px" }}>
        {rows.map((row, rowIndex) => (
          <div key={rowIndex} style={{ display: "flex", gap: 24 }}>
            {row.map((team) => (
              <div key={team.number} style={{ display: "flex", flexDirection: "column", flex: 1 }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    height: layout.rowPx,
                    fontSize: layout.fontPx,
                    fontWeight: 700,
                    color: props.primary,
                  }}
                >
                  Equipo {team.number}
                </div>
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
