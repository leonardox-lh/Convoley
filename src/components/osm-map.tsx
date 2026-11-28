"use client";

import "leaflet/dist/leaflet.css";
import { divIcon, type LeafletMouseEvent, type Marker as LeafletMarker } from "leaflet";
import { useEffect } from "react";
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from "react-leaflet";
import { LIMA_CENTER, type LatLng } from "@/lib/map-location";

const CITY_ZOOM = 12;
const PLACE_ZOOM = 17;

// Drawn pin instead of Leaflet's image icons, whose file paths break once bundled.
const PIN = divIcon({
  className: "",
  iconSize: [36, 36],
  iconAnchor: [18, 34],
  html: `<svg viewBox="0 0 24 24" width="36" height="36" style="filter:drop-shadow(0 2px 2px rgb(0 0 0/.35))"><path fill="#e11d48" stroke="white" stroke-width="1.5" d="M12 2a7 7 0 0 0-7 7c0 5.2 7 13 7 13s7-7.8 7-13a7 7 0 0 0-7-7Z"/><circle cx="12" cy="9" r="2.6" fill="white"/></svg>`,
});

/**
 * OpenStreetMap the organizer moves around: a tap drops the pin, which can then be dragged.
 * Free and keyless; only needs the © OpenStreetMap credit the tile layer shows.
 */
export default function OsmMap(props: {
  point: LatLng | null;
  /** A new object on every search, so searching the same place twice still flies back. */
  focus: LatLng | null;
  onPick: (point: LatLng) => void;
}) {
  return (
    <MapContainer
      center={props.point ?? LIMA_CENTER}
      zoom={props.point ? PLACE_ZOOM : CITY_ZOOM}
      className="h-72 w-full rounded-xl"
    >
      <TileLayer
        url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
      />
      <TapToPick onPick={props.onPick} />
      <FlyToFocus focus={props.focus} />
      {props.point && (
        <Marker
          position={props.point}
          icon={PIN}
          draggable
          eventHandlers={{
            dragend: (event) => props.onPick((event.target as LeafletMarker).getLatLng()),
          }}
        />
      )}
    </MapContainer>
  );
}

function TapToPick({ onPick }: { onPick: (point: LatLng) => void }) {
  useMapEvents({ click: (event: LeafletMouseEvent) => onPick(event.latlng) });
  return null;
}

/** Each search result zooms the map onto it; taps and drags leave the view where it is. */
function FlyToFocus({ focus }: { focus: LatLng | null }) {
  const map = useMap();
  useEffect(() => {
    if (focus) map.flyTo(focus, PLACE_ZOOM);
  }, [map, focus]);
  return null;
}
