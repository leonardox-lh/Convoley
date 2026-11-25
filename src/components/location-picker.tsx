"use client";

import { MapPin, Search } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Field, fieldClass, floatingFieldClass } from "./form";

const CITY = "Lima, Perú";
const withCity = (place: string) => (place ? `${place}, ${CITY}` : CITY);
const mapsSearchUrl = (query: string) =>
  `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
// shortcut: the keyless embed searches by text, so the organizer picks the place by its name and
// confirms it on the map; dropping a pin by click needs the Maps JavaScript API and a paid key.
const mapsEmbedUrl = (query: string) =>
  `https://maps.google.com/maps?q=${encodeURIComponent(query)}&z=15&output=embed`;

/**
 * Venue name plus its Google Maps link. The map opens even with no name typed, so whoever
 * doesn't know what the place is called can search it there and pick it.
 */
export function LocationPicker(props: { venueName?: string; mapsUrl?: string }) {
  const [venue, setVenue] = useState(props.venueName ?? "");
  const [mapsUrl, setMapsUrl] = useState(props.mapsUrl ?? "");
  const [mapOpen, setMapOpen] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [shownPlace, setShownPlace] = useState("");

  const openMap = () => {
    setSearchText(venue.trim());
    setShownPlace(venue.trim());
    setMapOpen(true);
  };
  const pickShownPlace = () => {
    setMapsUrl(mapsSearchUrl(withCity(shownPlace)));
    if (!venue.trim()) setVenue(shownPlace);
    setMapOpen(false);
  };

  return (
    <div className="flex flex-col gap-4">
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
                setShownPlace(searchText.trim());
              }}
              className={cn(fieldClass, "py-2")}
            />
            <Button
              type="button"
              className="h-auto shrink-0 rounded-xl px-3"
              aria-label="Buscar"
              onClick={() => setShownPlace(searchText.trim())}
            >
              <Search aria-hidden />
            </Button>
          </div>
          <iframe
            title="Mapa para elegir el lugar"
            src={mapsEmbedUrl(withCity(shownPlace))}
            className="h-64 w-full rounded-xl border-0"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          />
          <div className="flex gap-2">
            <Button type="button" variant="outline" className="h-10 flex-1" onClick={() => setMapOpen(false)}>
              Cerrar
            </Button>
            <Button
              type="button"
              className="h-10 flex-1 gap-1.5"
              disabled={!shownPlace}
              onClick={pickShownPlace}
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
