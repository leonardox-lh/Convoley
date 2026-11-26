import { pointDifference, type GameDay } from "@/modules/registrations";
import { ImageFooter, ImageHeader, type ImageBrand } from "../../imagen/image-header";

type Props = ImageBrand & { gameDay: GameDay };

const ROW_PX = 96;
const COLUMN_PX = 120;

const frame = {
  width: "100%",
  height: "100%",
  display: "flex",
  flexDirection: "column",
  background: "white",
  color: "#18181b",
} as const;

const signed = (value: number) => (value > 0 ? `+${value}` : `${value}`);

/** The group table: one row per team, in order (Satori: flex everywhere). */
export function StandingsImage(props: Props) {
  const { gameDay } = props;
  const nameOf = new Map(gameDay.teams.map((team) => [team.number, team.name]));
  const cell = (text: string, bold = false) => (
    <span
      style={{
        display: "flex",
        justifyContent: "center",
        width: COLUMN_PX,
        fontWeight: bold ? 700 : 400,
      }}
    >
      {text}
    </span>
  );
  return (
    <div style={frame}>
      <ImageHeader {...props} />
      <div style={{ display: "flex", flexDirection: "column", flex: 1, padding: "24px 56px" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            height: 64,
            fontSize: 30,
            color: "#71717a",
            borderBottom: "2px solid #e4e4e7",
          }}
        >
          <span style={{ display: "flex", flex: 1 }}>Tabla de posiciones</span>
          {cell("PJ")}
          {cell("PG")}
          {cell("Dif")}
        </div>
        {gameDay.standings.map((row, index) => (
          <div
            key={row.teamNumber}
            style={{
              display: "flex",
              alignItems: "center",
              height: ROW_PX,
              fontSize: 44,
              borderBottom: "2px solid #f4f4f5",
            }}
          >
            <span
              style={{
                display: "block",
                flex: 1,
                overflow: "hidden",
                whiteSpace: "nowrap",
                textOverflow: "ellipsis",
                fontWeight: 700,
                color: index === 0 ? props.primary : "#18181b",
              }}
            >
              {index + 1}. {nameOf.get(row.teamNumber)}
            </span>
            {cell(String(row.played))}
            {cell(String(row.won), true)}
            {cell(signed(pointDifference(row)))}
          </div>
        ))}
      </div>
      <ImageFooter />
    </div>
  );
}

/** The champion, big, with the final's score. */
export function ChampionImage(props: Props) {
  const { gameDay } = props;
  const final = gameDay.matches.find((match) => match.isFinal);
  const nameOf = new Map(gameDay.teams.map((team) => [team.number, team.name]));
  return (
    <div style={frame}>
      <ImageHeader {...props} />
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          gap: 24,
          padding: "24px 56px",
          textAlign: "center",
        }}
      >
        <span style={{ fontSize: 140 }}>🏆</span>
        <span style={{ fontSize: 40, letterSpacing: 8, color: "#71717a" }}>CAMPEÓN</span>
        <span style={{ fontSize: 96, fontWeight: 800, color: props.primary }}>
          {gameDay.champion?.name}
        </span>
        {final && final.homeScore !== null && final.awayScore !== null && (
          <span style={{ fontSize: 40, color: "#3f3f46" }}>
            Final: {nameOf.get(final.homeTeam)} {final.homeScore} – {final.awayScore}{" "}
            {nameOf.get(final.awayTeam)}
          </span>
        )}
      </div>
      <ImageFooter />
    </div>
  );
}
