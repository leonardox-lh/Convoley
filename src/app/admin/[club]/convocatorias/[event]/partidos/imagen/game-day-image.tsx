import { pointDifference, type GameDay } from "@/modules/registrations";
import { ImageFooter, ImageHeader, type ImageBrand } from "../../imagen/image-header";
import { heavy, NIGHT, posterBackground, SOFT_BLUE } from "../../imagen/poster-style";

type Props = ImageBrand & { gameDay: GameDay };

const CARD = "rgba(255,255,255,0.08)";
const CARD_BORDER = "rgba(255,255,255,0.12)";
const ROW_PX = 120;
const STAT_PX = 150;
const LONG_NAME_CHARS = 14;

const signed = (value: number) => (value > 0 ? `+${value}` : `${value}`);

/** Night poster background lit by the club color, like the flyer. */
function Frame(props: ImageBrand & { children: React.ReactNode }) {
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
      <ImageHeader {...props} />
      {props.children}
      <ImageFooter />
    </div>
  );
}

/** The group table: leader in the club color, few columns, lots of air (Satori: flex everywhere). */
export function StandingsImage(props: Props) {
  const { gameDay } = props;
  const nameOf = new Map(gameDay.teams.map((team) => [team.number, team.name]));
  const stat = (text: string, style: React.CSSProperties = {}) => (
    <span style={{ display: "flex", justifyContent: "center", width: STAT_PX, ...style }}>
      {text}
    </span>
  );
  return (
    <Frame {...props}>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          flex: 1,
          justifyContent: "center",
          gap: 20,
          padding: "40px 64px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", padding: "0 40px" }}>
          <span
            style={{ display: "flex", flex: 1, fontSize: 30, letterSpacing: 6, color: SOFT_BLUE }}
          >
            TABLA DE POSICIONES
          </span>
          {stat("GAN.", { fontSize: 26, color: SOFT_BLUE })}
          {stat("DIF.", { fontSize: 26, color: SOFT_BLUE })}
        </div>
        {gameDay.standings.map((row, index) => {
          const leader = index === 0;
          return (
            <div
              key={row.teamNumber}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 28,
                height: ROW_PX,
                padding: "0 40px",
                borderRadius: 28,
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
                  width: 64,
                  height: 64,
                  borderRadius: 999,
                  fontSize: 34,
                  background: leader ? props.secondary : "rgba(255,255,255,0.12)",
                  color: leader ? NIGHT : SOFT_BLUE,
                }}
              >
                {index + 1}
              </span>
              <span
                style={{
                  display: "block",
                  flex: 1,
                  fontSize: 48,
                  ...heavy("white"),
                  overflow: "hidden",
                  whiteSpace: "nowrap",
                  textOverflow: "ellipsis",
                }}
              >
                {nameOf.get(row.teamNumber)}
              </span>
              {stat(String(row.won), { fontSize: 52, ...heavy("white") })}
              {stat(signed(pointDifference(row)), { fontSize: 40, opacity: 0.8 })}
            </div>
          );
        })}
      </div>
    </Frame>
  );
}

/** The champion on the club color: trophy, name, its players and the final's score. */
export function ChampionImage(props: Props & { players: string[] }) {
  const { gameDay } = props;
  const final = gameDay.matches.find((match) => match.isFinal);
  const nameOf = new Map(gameDay.teams.map((team) => [team.number, team.name]));
  const name = gameDay.champion?.name ?? "";
  return (
    <Frame {...props}>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          gap: 28,
          padding: "40px 64px",
          textAlign: "center",
        }}
      >
        <span style={{ fontSize: 170 }}>🏆</span>
        <span style={{ fontSize: 38, letterSpacing: 14, ...heavy(props.secondary) }}>CAMPEÓN</span>
        <span
          style={{
            display: "flex",
            fontSize: name.length > LONG_NAME_CHARS ? 88 : 124,
            lineHeight: 1.05,
            transform: "skewX(-8deg)",
            ...heavy("white", "0 10px 30px rgba(0,0,0,0.6)"),
          }}
        >
          {name}
        </span>
        {props.players.length > 0 && (
          <span style={{ display: "flex", fontSize: 32, opacity: 0.85, maxWidth: 900 }}>
            {props.players.join(" · ")}
          </span>
        )}
        {final && final.homeScore !== null && final.awayScore !== null && (
          <span
            style={{
              display: "flex",
              marginTop: 12,
              padding: "14px 36px",
              borderRadius: 999,
              fontSize: 32,
              background: props.secondary,
              color: NIGHT,
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
