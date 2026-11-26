// Folders in the URL that have no page of their own: going "up" skips them.
const SEGMENTS_WITHOUT_PAGE = new Set(["convocatorias", "asistencia"]);
const CLUB_TABS = new Set(["tienda", "planes"]);

/**
 * Where "back" goes when there is no in-app history (the link came from WhatsApp): the
 * screen one level up, or home. Event → its club; admin screens → the level above them.
 */
export function parentPath(pathname: string): string {
  const segments = pathname.split("/").filter(Boolean);
  if (segments[0] === "c" && segments.length === 3) return `/${segments[1]}`;
  if (segments[0] === "admin" && segments.length > 2) {
    const up = segments.slice(0, -1);
    while (SEGMENTS_WITHOUT_PAGE.has(up.at(-1) ?? "")) up.pop();
    return `/${up.join("/")}`;
  }
  // Public club tabs (/<club>/tienda) go back to the club; everything else to home.
  if (segments.length === 2 && CLUB_TABS.has(segments[1])) return `/${segments[0]}`;
  return "/";
}
