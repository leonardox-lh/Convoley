export interface LatLng {
  lat: number;
  lng: number;
}

/** Plaza San Martín: where the map opens before anything is searched. */
export const LIMA_CENTER: LatLng = { lat: -12.0464, lng: -77.0428 };

// ~11 cm: more precision than a phone's GPS, fewer digits in the link.
const COORDINATE_DECIMALS = 6;

const GOOGLE_MAPS_SEARCH = "https://www.google.com/maps/search/?api=1&query=";

/** Google Maps link to an exact point: players open it in the Maps app like any other link. */
export function googleMapsPointUrl({ lat, lng }: LatLng): string {
  return `${GOOGLE_MAPS_SEARCH}${lat.toFixed(COORDINATE_DECIMALS)},${lng.toFixed(COORDINATE_DECIMALS)}`;
}

/** The point back from a link `googleMapsPointUrl` made; null for any other link. */
export function pointFromGoogleMapsUrl(url: string): LatLng | null {
  const match = /[?&]query=(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/.exec(url);
  if (!match) return null;
  return { lat: Number(match[1]), lng: Number(match[2]) };
}
