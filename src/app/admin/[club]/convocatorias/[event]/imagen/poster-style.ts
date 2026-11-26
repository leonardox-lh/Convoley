/** Shared look of the flyer (HU-37) and the list image: night background lit by the club color. */
export const NIGHT = "#050b24";
export const NAVY = "#0a1a4a";
export const SOFT_BLUE = "#a5c0ff";

export function posterBackground(primary: string) {
  return {
    backgroundColor: NIGHT,
    backgroundImage: `radial-gradient(circle at 85% 18%, ${primary} 0%, rgba(5,11,36,0) 52%), linear-gradient(165deg, ${NAVY} 0%, ${NIGHT} 70%)`,
  };
}

/**
 * Only Geist Regular ships with next/og and Satori ignores text strokes: shadows in the text
 * color, nudged around each glyph, thicken it like a bold. `glow` adds a drop shadow on top.
 */
export function heavy(color: string, px: number, glow?: string) {
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
