import { readFile } from "node:fs/promises";
import { join } from "node:path";

const FONTS_DIR = join(process.cwd(), "assets", "fonts");

/**
 * Geist Regular and real Geist Bold for the generated images: next/og only ships the regular
 * weight, and faking bold with shadows left jagged edges. Read once per server process.
 */
let fonts: ReturnType<typeof readFonts> | undefined;

export function loadImageFonts() {
  fonts ??= readFonts();
  return fonts;
}

async function readFonts() {
  const [regular, bold] = await Promise.all([
    readFile(join(FONTS_DIR, "Geist-Regular.ttf")),
    readFile(join(FONTS_DIR, "Geist-Bold.woff")),
  ]);
  return [
    { name: "Geist", data: regular, weight: 400 as const, style: "normal" as const },
    { name: "Geist", data: bold, weight: 700 as const, style: "normal" as const },
  ];
}
