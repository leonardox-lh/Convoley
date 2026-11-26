export interface FlyerDetails {
  title: string;
  /** "Viernes 27 de noviembre de 2026". */
  date: string;
  /** "7:00 p. m. – 8:00 p. m.". */
  time: string;
  venue: string;
  price: string;
  /** "¡Quedan 6 cupos!", or the waitlist call when it's full. */
  spots: string;
  callToAction: string;
  /** Club colors: electric accent and highlight. */
  primary: string;
  secondary: string;
  width: number;
  height: number;
}

const NIGHT = "#050b24";
const NAVY = "#0a1a4a";
const SOFT_BLUE = "#a5c0ff";
const BALL_RATIO = 0.62;
// Stories (9:16) have room for a bigger ball; anything taller than 4:5 counts as one.
const TALL_RATIO = 1.4;
const STORY_BALL_RATIO = 0.95;
const TITLE_GLOW = "0 10px 30px rgba(0,0,0,0.6)";

/**
 * Only Geist Regular ships with next/og and Satori ignores text strokes: shadows in the text
 * color, nudged around each glyph, thicken it like a bold. `glow` adds a drop shadow on top.
 */
function heavy(color: string, px: number, glow?: string) {
  const offsets = [
    [px, 0],
    [-px, 0],
    [0, px],
    [0, -px],
    [px, px],
    [-px, -px],
    [px, -px],
    [-px, px],
  ];
  const shadows = offsets.map(([x, y]) => `${x}px ${y}px 0 ${color}`);
  return { color, textShadow: [...shadows, ...(glow ? [glow] : [])].join(", ") };
}

/** Title size by length, so short titles shout and long ones still fit in three lines. */
function titleSize(title: string, width: number) {
  const scale = width / 1080;
  const length = title.length;
  const base = length <= 12 ? 150 : length <= 20 ? 128 : length <= 30 ? 104 : 84;
  return Math.round(base * scale);
}

/** The hero: a lit volleyball with its seams, a glow behind and speed arcs trailing it. */
function Ball(props: { size: number; primary: string; secondary: string }) {
  const { size } = props;
  return (
    <div
      style={{
        position: "absolute",
        top: -size * 0.12,
        right: -size * 0.24,
        width: size,
        height: size,
        display: "flex",
        borderRadius: 9999,
        boxShadow: `0 0 ${size * 0.3}px ${props.primary}, 0 ${size * 0.06}px ${size * 0.12}px rgba(0,0,0,0.55)`,
      }}
    >
      <svg width={size} height={size} viewBox="2.25 2.25 19.5 19.5">
        <defs>
          <radialGradient id="shine" cx="0.36" cy="0.3" r="0.8">
            <stop offset="0" stopColor="#ffffff" />
            <stop offset="0.55" stopColor="#e6ecff" />
            <stop offset="1" stopColor="#8ea6e8" />
          </radialGradient>
        </defs>
        <circle cx="12" cy="12" r="9.75" fill="url(#shine)" />
        <path
          d="M12 12a8 8 0 0 0 8 4 9.75 9.75 0 0 1-4 4 12 12 0 0 1-8.5-6.5z"
          fill={props.secondary}
          opacity="0.9"
        />
        <path
          d="M12 12a8 8 0 0 0-.536-8.928 9.75 9.75 0 0 1 5.465 1.464 12 12 0 0 1-1.38 10.611z"
          fill={props.primary}
          opacity="0.85"
        />
        <g fill="none" stroke={NAVY} strokeWidth="0.55" strokeLinecap="round" opacity="0.8">
          <path d="M12 12a8 8 0 0 0 8 4" />
          <path d="M7.5 13.5a12 12 0 0 0 8.5 6.5" />
          <path d="M12 12a8 8 0 0 0-7.464 4.928" />
          <path d="M12.951 7.353a12 12 0 0 0-9.88 4.111" />
          <path d="M12 12a8 8 0 0 0-.536-8.928" />
          <path d="M15.549 15.147a12 12 0 0 0 1.38-10.611" />
        </g>
      </svg>
    </div>
  );
}

function SpeedArcs(props: { width: number; height: number; primary: string }) {
  const { width, height } = props;
  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      style={{ position: "absolute", top: 0, left: 0 }}
    >
      <g fill="none" strokeLinecap="round">
        <path
          d={`M ${width * 0.02} ${height * 0.5} Q ${width * 0.3} ${height * 0.12} ${width * 0.62} ${height * 0.17}`}
          stroke="#ffffff"
          strokeOpacity="0.16"
          strokeWidth={width * 0.012}
        />
        <path
          d={`M ${width * 0.1} ${height * 0.56} Q ${width * 0.36} ${height * 0.24} ${width * 0.6} ${height * 0.3}`}
          stroke={props.primary}
          strokeOpacity="0.55"
          strokeWidth={width * 0.008}
        />
      </g>
    </svg>
  );
}

/** HU-37: the event flyer, a sports-campaign poster drawn by Satori (next/og). */
export function FlyerImage(props: FlyerDetails) {
  const { width, height } = props;
  const unit = width / 1080;
  const words = props.title.toUpperCase().split(/\s+/).filter(Boolean);
  const lastWord = words.pop() ?? "";
  const titlePx = titleSize(props.title, width);
  const padding = 72 * unit;

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
        backgroundColor: NIGHT,
        backgroundImage: `radial-gradient(circle at 85% 18%, ${props.primary} 0%, rgba(5,11,36,0) 52%), linear-gradient(165deg, ${NAVY} 0%, ${NIGHT} 70%)`,
      }}
    >
      <SpeedArcs width={width} height={height} primary={props.primary} />
      <Ball
        size={width * (height > width * TALL_RATIO ? STORY_BALL_RATIO : BALL_RATIO)}
        primary={props.primary}
        secondary={props.secondary}
      />

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          flex: 1,
          justifyContent: "flex-end",
          gap: 40 * unit,
          padding,
        }}
      >
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            columnGap: titlePx * 0.22,
            fontSize: titlePx,
            lineHeight: 0.95,
            letterSpacing: -1 * unit,
            transform: "skewX(-8deg)",
          }}
        >
          {words.map((word, index) => (
            <span key={index} style={{ display: "flex", ...heavy("white", 3 * unit, TITLE_GLOW) }}>
              {word}
            </span>
          ))}
          <span style={{ display: "flex", ...heavy(props.secondary, 3 * unit, TITLE_GLOW) }}>
            {lastWord}
          </span>
        </div>

        <div
          style={{
            display: "flex",
            width: 140 * unit,
            height: 10 * unit,
            background: props.secondary,
          }}
        />

        <div style={{ display: "flex", flexDirection: "column", gap: 12 * unit }}>
          <span style={{ display: "flex", fontSize: 50 * unit, ...heavy("white", 1.2 * unit) }}>
            {props.date}
          </span>
          <span style={{ display: "flex", fontSize: 40 * unit, color: SOFT_BLUE }}>
            {props.time}
          </span>
          <span
            style={{
              display: "flex",
              alignItems: "center",
              gap: 16 * unit,
              fontSize: 44 * unit,
              ...heavy("white", 1 * unit),
            }}
          >
            <svg width={34 * unit} height={34 * unit} viewBox="0 0 24 24">
              <path
                d="M12 2a7 7 0 0 0-7 7c0 5.25 7 13 7 13s7-7.75 7-13a7 7 0 0 0-7-7zm0 9.5a2.5 2.5 0 1 1 0-5 2.5 2.5 0 0 1 0 5z"
                fill={props.secondary}
              />
            </svg>
            {props.venue}
          </span>
        </div>

        <div style={{ display: "flex", gap: 20 * unit, alignItems: "stretch" }}>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              padding: `${18 * unit}px ${32 * unit}px`,
              borderRadius: 24 * unit,
              background: "white",
              color: NIGHT,
            }}
          >
            <span
              style={{
                display: "flex",
                fontSize: 22 * unit,
                letterSpacing: 4 * unit,
                color: "#52607f",
              }}
            >
              PRECIO
            </span>
            <span style={{ display: "flex", fontSize: 54 * unit, ...heavy(NIGHT, 1.5 * unit) }}>
              {props.price}
            </span>
          </div>
          <div
            style={{
              display: "flex",
              flex: 1,
              alignItems: "center",
              justifyContent: "center",
              padding: `${18 * unit}px ${28 * unit}px`,
              borderRadius: 24 * unit,
              background: props.secondary,
              fontSize: 46 * unit,
              ...heavy(NIGHT, 1.5 * unit),
            }}
          >
            {props.spots}
          </div>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 18 * unit,
            padding: `${26 * unit}px`,
            borderRadius: 9999,
            backgroundImage: `linear-gradient(90deg, ${props.primary}, #3b82f6)`,
            boxShadow: `0 0 ${50 * unit}px rgba(59,130,246,0.55)`,
            fontSize: 44 * unit,
            ...heavy("white", 1.4 * unit),
          }}
        >
          <span style={{ display: "flex" }}>{props.callToAction}</span>
          <span style={{ display: "flex" }}>→</span>
        </div>
      </div>
    </div>
  );
}
