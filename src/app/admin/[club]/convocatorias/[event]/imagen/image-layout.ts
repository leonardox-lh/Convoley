export const LIST_IMAGE_FORMATS = {
  // 1:1 for WhatsApp and the Instagram feed.
  cuadrado: { width: 1080, height: 1080 },
  // 9:16 for Instagram and WhatsApp stories.
  historia: { width: 1080, height: 1920 },
} as const;

export type ListImageFormat = keyof typeof LIST_IMAGE_FORMATS;

// Logo row, a title of up to two lines and the date.
const HEADER_PX = 330;
const FOOTER_PX = 80;
const MAX_ROW_PX = 64;
const MIN_ROW_PX = 30;
const ROW_TO_FONT = 0.62;

/**
 * Size and columns so every name fits on one image: one column while rows stay readable,
 * two when the list is long (a full 24-player event plus waitlist on a square image).
 */
export function listImageLayout(format: ListImageFormat, rows: number) {
  const { width, height } = LIST_IMAGE_FORMATS[format];
  const available = height - HEADER_PX - FOOTER_PX;
  const rowsPerColumn = (columns: number) => Math.ceil(Math.max(rows, 1) / columns);
  const columns = available / rowsPerColumn(1) >= MIN_ROW_PX * 1.4 ? 1 : 2;
  const rowPx = Math.max(
    MIN_ROW_PX,
    Math.min(MAX_ROW_PX, Math.floor(available / rowsPerColumn(columns))),
  );
  return { width, height, columns, rowPx, fontPx: Math.round(rowPx * ROW_TO_FONT) };
}
