"use client";

import { MapPin, Search, X } from "lucide-react";
import dynamic from "next/dynamic";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { googleMapsPointUrl, pointFromGoogleMapsUrl, type LatLng } from "@/lib/map-location";
import { cn } from "@/lib/utils";
import { ConfirmDialog } from "./confirm-dialog";
import { Field, fieldClass, floatingFieldClass } from "./form";

// Leaflet needs `window`: the map only loads in the browser.
const OsmMap = dynamic(() => import("./osm-map"), {
  ssr: false,
  loading: () => <div className="h-72 w-full animate-pulse rounded-xl bg-secondary" />,
});

const CITY = "Lima, Perú";
const withCity = (place: string) => (place ? `${place}, ${CITY}` : CITY);
const mapsSearchUrl = (query: string) =>
  `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
// The keyless Google embed finds places by name (it knows far more than OpenStreetMap) but
// can't take a tap; courts it doesn't know are marked with the pin map instead.
const mapsEmbedUrl = (query: string) =>
  `https://maps.google.com/maps?q=${encodeURIComponent(query)}&z=15&output=embed`;

// OpenStreetMap's free search (Nominatim). Its policy allows about one request per second,
// which a person typing and pressing Buscar never reaches. Results lean to Lima and Peru.
const LIMA_VIEWBOX = "-77.25,-11.75,-76.65,-12.55";
const nominatimUrl = (query: string) =>
  `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&countrycodes=pe&viewbox=${LIMA_VIEWBOX}&q=${encodeURIComponent(query)}`;

async function searchOsm(query: string): Promise<LatLng | null> {
  const response = await fetch(nominatimUrl(query), { headers: { "Accept-Language": "es" } });
  if (!response.ok) return null;
  const [first] = (await response.json()) as { lat: string; lon: string }[];
  return first ? { lat: Number(first.lat), lng: Number(first.lon) } : null;
}

type MapMode = "google" | "pin";
type PinSearchState = "idle" | "searching" | "not_found" | "failed";

const MAP_MODES: { mode: MapMode; label: string }[] = [
  { mode: "google", label: "Buscar en Google" },
  { mode: "pin", label: "Marcar con pin" },
];

export interface SavedVenue {
  id: string;
  name: string;
  mapsUrl: string | null;
}

/**
 * Venue name plus its Google Maps link. The map searches Google by name first; a court
 * Google doesn't know is marked by tapping the pin map, whose exact point becomes the link.
 */
export function LocationPicker(props: {
  venueName?: string;
  mapsUrl?: string;
  /** The club's list of places: one tap fills name and link. */
  savedVenues?: SavedVenue[];
  /** Deletes a place from the list; resolves to an error message, or null when it's gone. */
  onRemoveVenue?: (venue: SavedVenue) => Promise<string | null>;
}) {
  const [venue, setVenue] = useState(props.venueName ?? "");
  const [mapsUrl, setMapsUrl] = useState(props.mapsUrl ?? "");
  const [mapOpen, setMapOpen] = useState(false);
  const [mode, setMode] = useState<MapMode>("google");
  const [searchText, setSearchText] = useState("");
  // Google mode: the place the embed shows.
  const [shownPlace, setShownPlace] = useState("");
  // Pin mode: where the pin is, and where the last search sent the map.
  const [pinSearch, setPinSearch] = useState<PinSearchState>("idle");
  const [point, setPoint] = useState<LatLng | null>(() =>
    props.mapsUrl ? pointFromGoogleMapsUrl(props.mapsUrl) : null,
  );
  const [focus, setFocus] = useState<LatLng | null>(null);
  const [savedVenues, setSavedVenues] = useState(props.savedVenues ?? []);
  const [venueToRemove, setVenueToRemove] = useState<SavedVenue | null>(null);
  const [removeError, setRemoveError] = useState<string | null>(null);
  const [removing, startRemoving] = useTransition();

  const openMap = () => {
    setSearchText(venue.trim());
    setShownPlace(venue.trim());
    setPinSearch("idle");
    setMapOpen(true);
  };
  const searchPin = async (query: string) => {
    setPinSearch("searching");
    try {
      const found = await searchOsm(query);
      setPinSearch(found ? "idle" : "not_found");
      if (!found) return;
      setPoint(found);
      setFocus({ ...found });
    } catch {
      setPinSearch("failed");
    }
  };
  const search = () => {
    const query = searchText.trim();
    if (!query) return;
    if (mode === "google") setShownPlace(query);
    else void searchPin(query);
  };
  const close = (name: string, url: string) => {
    if (!venue.trim() && name) setVenue(name);
    setMapsUrl(url);
    setMapOpen(false);
  };
  const pickShownPlace = () => close(shownPlace, mapsSearchUrl(withCity(shownPlace)));
  const pickPin = () => point && close(searchText.trim(), googleMapsPointUrl(point));
  const pickSavedVenue = (saved: SavedVenue) => {
    setVenue(saved.name);
    setMapsUrl(saved.mapsUrl ?? "");
    setPoint(saved.mapsUrl ? pointFromGoogleMapsUrl(saved.mapsUrl) : null);
    setMapOpen(false);
  };
  const askToRemove = (saved: SavedVenue) => {
    setRemoveError(null);
    setVenueToRemove(saved);
  };
  const confirmRemove = () => {
    const target = venueToRemove;
    if (!target || !props.onRemoveVenue) return;
    const remove = props.onRemoveVenue;
    startRemoving(async () => {
      const error = await remove(target);
      if (error) return setRemoveError(error);
      setSavedVenues((current) => current.filter((saved) => saved.id !== target.id));
      setVenueToRemove(null);
    });
  };

  return (
    <div className="flex flex-col gap-4">
      {savedVenues.length > 0 && (
        <section aria-labelledby="saved-venues-heading" className="flex flex-col gap-1.5">
          <h3 id="saved-venues-heading" className="px-1 text-xs font-medium text-muted-foreground">
            Tus lugares
          </h3>
          <ul className="flex flex-col divide-y overflow-hidden rounded-xl border">
            {savedVenues.map((saved) => {
              const selected = venue === saved.name;
              return (
                <li key={saved.id} className={cn("flex items-center", selected && "bg-primary/5")}>
                  <button
                    type="button"
                    aria-pressed={selected}
                    onClick={() => pickSavedVenue(saved)}
                    className="flex min-w-0 flex-1 items-center gap-2 px-3 py-2.5 text-left text-sm font-medium"
                  >
                    <MapPin
                      className={cn(
                        "size-4 shrink-0",
                        selected ? "text-primary" : "text-muted-foreground",
                      )}
                      aria-hidden
                    />
                    <span className={cn("truncate", selected && "text-primary")}>{saved.name}</span>
                  </button>
                  {props.onRemoveVenue && (
                    <button
                      type="button"
                      aria-label={`Eliminar ${saved.name} de tus lugares`}
                      onClick={() => askToRemove(saved)}
                      className="flex size-10 shrink-0 items-center justify-center text-muted-foreground transition-colors hover:text-destructive"
                    >
                      <X className="size-4" aria-hidden />
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      )}
      {venueToRemove && (
        <ConfirmDialog
          title="¿Eliminar este lugar?"
          description={`"${venueToRemove.name}" saldrá de tus lugares. Las convocatorias que ya lo usan no cambian, y si lo vuelves a usar se agrega otra vez.`}
          confirmLabel="Eliminar"
          pending={removing}
          error={removeError}
          onConfirm={confirmRemove}
          onCancel={() => setVenueToRemove(null)}
        />
      )}
      <div className="flex gap-2">
        <div className="flex-1">
          <Field label="Lugar">
            <input
              name="venueName"
              required
              maxLength={120}
              placeholder="Coliseo Manuel Bonilla"
              value={venue}
              onChange={(event) => setVenue(event.target.value)}
              className={floatingFieldClass}
            />
          </Field>
        </div>
        <Button
          type="button"
          variant="outline"
          className="h-auto shrink-0 gap-1.5 rounded-xl px-3"
          aria-expanded={mapOpen}
          onClick={openMap}
        >
          <MapPin aria-hidden />
          Ver mapa
        </Button>
      </div>
      {mapOpen && (
        <div className="flex flex-col gap-2 overflow-hidden rounded-2xl border bg-card p-2 shadow-sm animate-in fade-in slide-in-from-top-2">
          <div
            role="tablist"
            aria-label="Cómo buscar el lugar"
            className="flex rounded-xl bg-secondary p-1"
          >
            {MAP_MODES.map((option) => (
              <button
                key={option.mode}
                type="button"
                role="tab"
                aria-selected={mode === option.mode}
                onClick={() => setMode(option.mode)}
                className={cn(
                  "flex-1 rounded-lg py-1.5 text-sm font-medium transition-colors",
                  mode === option.mode
                    ? "bg-card text-primary shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              type="search"
              aria-label="Buscar en el mapa"
              placeholder="Busca el lugar o el distrito"
              value={searchText}
              onChange={(event) => setSearchText(event.target.value)}
              onKeyDown={(event) => {
                // Enter searches the map instead of submitting the whole form.
                if (event.key !== "Enter") return;
                event.preventDefault();
                search();
              }}
              className={cn(fieldClass, "py-2")}
            />
            <Button
              type="button"
              className="h-auto shrink-0 rounded-xl px-3"
              aria-label="Buscar"
              disabled={pinSearch === "searching"}
              onClick={search}
            >
              <Search aria-hidden />
            </Button>
          </div>
          {mode === "google" ? (
            <>
              <iframe
                title="Mapa para elegir el lugar"
                src={mapsEmbedUrl(withCity(shownPlace))}
                className="h-72 w-full rounded-xl border-0"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
              <p className="px-1 text-xs text-muted-foreground">
                ¿No aparece tu cancha? Usa{" "}
                <button
                  type="button"
                  onClick={() => setMode("pin")}
                  className="font-medium text-primary underline-offset-2 hover:underline"
                >
                  Marcar con pin
                </button>{" "}
                y tócala en el mapa.
              </p>
            </>
          ) : (
            <>
              <p role="status" className="px-1 text-xs text-muted-foreground">
                {pinSearch === "searching" && "Buscando…"}
                {pinSearch === "not_found" &&
                  "No lo encontramos. Mueve el mapa y toca el lugar exacto."}
                {pinSearch === "failed" && "No se pudo buscar. Mueve el mapa y toca el lugar."}
                {pinSearch === "idle" &&
                  (point
                    ? "Arrastra el pin si no está en el lugar exacto."
                    : "Mueve el mapa y toca el lugar exacto.")}
              </p>
              <OsmMap point={point} focus={focus} onPick={setPoint} />
            </>
          )}
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              className="h-10 flex-1"
              onClick={() => setMapOpen(false)}
            >
              Cerrar
            </Button>
            <Button
              type="button"
              className="h-10 flex-1 gap-1.5"
              disabled={mode === "google" ? !shownPlace : !point}
              onClick={mode === "google" ? pickShownPlace : pickPin}
            >
              <MapPin aria-hidden />
              Usar esta ubicación
            </Button>
          </div>
        </div>
      )}
      <Field label="Link de Google Maps (opcional)">
        <input
          type="url"
          name="mapsUrl"
          placeholder="Búscalo con Ver mapa o pega el link"
          value={mapsUrl}
          onChange={(event) => setMapsUrl(event.target.value)}
          className={cn(floatingFieldClass, mapsUrl && "border-emerald-300 bg-emerald-50/40")}
        />
      </Field>
    </div>
  );
}
