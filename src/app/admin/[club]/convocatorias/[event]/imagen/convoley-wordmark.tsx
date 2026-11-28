import { readFileSync } from "node:fs";
import { join } from "node:path";

// Drawn once by scripts/brand-wordmark.tsx: the same crisp logo is pasted in every image.
const WORDMARK_FILE = join(process.cwd(), "assets", "brand", "convoley-wordmark.png");
const WORDMARK_RATIO = 1740 / 351;

let wordmarkSrc: string | undefined;

/** The Convoley wordmark for images drawn by Satori, `height` px tall (the whole logo). */
export function ConvoleyWordmark({ height }: { height: number }) {
  wordmarkSrc ??= `data:image/png;base64,${readFileSync(WORDMARK_FILE).toString("base64")}`;
  return (
    // eslint-disable-next-line @next/next/no-img-element -- rendered by Satori, not the browser
    <img src={wordmarkSrc} alt="" width={Math.round(height * WORDMARK_RATIO)} height={height} />
  );
}
