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
 * The images' bold text: Geist Bold, loaded by every image route (image-fonts.ts). `glow` adds a
 * drop shadow.
 */
export function heavy(color: string, glow?: string) {
  return { color, fontWeight: 700, ...(glow ? { textShadow: glow } : {}) } as const;
}
