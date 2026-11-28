// Draws the Convoley wordmark once as a big transparent PNG (assets/brand/convoley-wordmark.png),
// so the shared images paste the same crisp logo instead of laying it out each time.
// Run: npx tsx scripts/brand-wordmark.tsx
import { mkdirSync, writeFileSync } from "node:fs";
import { ImageResponse } from "next/og";
import sharp from "sharp";

const FONT_PX = 400;
const BALL_GOLD = "#eea52a";
const OUT_DIR = "assets/brand";

async function render(node: React.ReactElement, width: number, height: number) {
  const { loadImageFonts } =
    await import("@/app/admin/[club]/convocatorias/[event]/imagen/image-fonts");
  const response = new ImageResponse(node, { width, height, fonts: await loadImageFonts() });
  return Buffer.from(await response.arrayBuffer());
}

/** Top and bottom rows with ink, so the ball can match the "n" exactly. */
async function inkRows(png: Buffer) {
  const { data, info } = await sharp(png).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  let top = -1;
  let bottom = -1;
  for (let y = 0; y < info.height; y++) {
    for (let x = 0; x < info.width; x++) {
      if (data[(y * info.width + x) * 4 + 3] > 128) {
        if (top === -1) top = y;
        bottom = y;
        break;
      }
    }
  }
  return { top, bottom: bottom + 1 };
}

function Ball({ size }: { size: number }) {
  return (
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
        fill={BALL_GOLD}
        opacity="0.9"
      />
      <path
        d="M12 12a8 8 0 0 0-.536-8.928 9.75 9.75 0 0 1 5.465 1.464 12 12 0 0 1-1.38 10.611z"
        fill="#1d4ed8"
        opacity="0.85"
      />
      <g fill="none" stroke="#0a1a4a" strokeWidth="0.9" strokeLinecap="round" opacity="0.8">
        <path d="M12 12a8 8 0 0 0 8 4" />
        <path d="M7.5 13.5a12 12 0 0 0 8.5 6.5" />
        <path d="M12 12a8 8 0 0 0-7.464 4.928" />
        <path d="M12.951 7.353a12 12 0 0 0-9.88 4.111" />
        <path d="M12 12a8 8 0 0 0-.536-8.928" />
        <path d="M15.549 15.147a12 12 0 0 0 1.38-10.611" />
      </g>
    </svg>
  );
}

const TEXT = {
  display: "flex",
  fontSize: FONT_PX,
  fontWeight: 700,
  lineHeight: 1,
  letterSpacing: -0.045 * FONT_PX,
} as const;

async function main() {
  // 1. Where an "n" sits in a line: its top is the x-height, its bottom the baseline.
  const n = await inkRows(
    await render(<div style={{ ...TEXT, color: "white" }}>n</div>, FONT_PX, FONT_PX),
  );
  // Round letters overshoot the x-height and baseline a little; the ball does the same.
  const overshoot = Math.round(FONT_PX * 0.012);
  const ballPx = n.bottom - n.top + 2 * overshoot;
  const ball = (
    <div style={{ display: "flex", margin: `${n.top - overshoot}px ${FONT_PX * 0.015}px 0` }}>
      <Ball size={ballPx} />
    </div>
  );

  // 2. The wordmark, wide enough for any letters, then trimmed to its ink.
  const word = await render(
    <div style={{ ...TEXT, alignItems: "flex-start", padding: "0 20px" }}>
      <span style={{ display: "flex", color: "white" }}>C</span>
      {ball}
      <span style={{ display: "flex", color: "white" }}>n</span>
      <span style={{ display: "flex", color: BALL_GOLD }}>v</span>
      {ball}
      <span style={{ display: "flex", color: BALL_GOLD }}>ley</span>
    </div>,
    FONT_PX * 5,
    FONT_PX,
  );
  mkdirSync(OUT_DIR, { recursive: true });
  const trimmed = await sharp(word)
    .trim({ threshold: 0 })
    .png()
    .toBuffer({ resolveWithObject: true });
  writeFileSync(`${OUT_DIR}/convoley-wordmark.png`, trimmed.data);
  console.log(
    `n ink ${n.top}-${n.bottom}, ball ${ballPx}px → ${trimmed.info.width}x${trimmed.info.height}`,
  );
}

main();
