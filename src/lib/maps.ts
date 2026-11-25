/** The event's Google Maps link, or a Maps search for its venue in Lima when it has none. */
export function venueMapsUrl(event: { venueName: string; mapsUrl?: string | null }): string {
  if (event.mapsUrl) return event.mapsUrl;
  const query = encodeURIComponent(`${event.venueName}, Lima, Perú`);
  return `https://www.google.com/maps/search/?api=1&query=${query}`;
}
