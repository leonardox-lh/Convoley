import { describe, expect, it } from "vitest";
import { googleMapsPointUrl, pointFromGoogleMapsUrl } from "./map-location";

describe("Ubicación elegida en el mapa", () => {
  it("arma un link de Google Maps al punto exacto", () => {
    expect(googleMapsPointUrl({ lat: -12.1203456789, lng: -77.0301234 })).toBe(
      "https://www.google.com/maps/search/?api=1&query=-12.120346,-77.030123",
    );
  });

  it("recupera el punto del link al editar la convocatoria", () => {
    const url = googleMapsPointUrl({ lat: -12.12, lng: -77.03 });
    expect(pointFromGoogleMapsUrl(url)).toEqual({ lat: -12.12, lng: -77.03 });
  });

  it("no inventa un punto para links por nombre", () => {
    expect(
      pointFromGoogleMapsUrl("https://www.google.com/maps/search/?api=1&query=Coliseo%2C%20Lima"),
    ).toBeNull();
  });
});
