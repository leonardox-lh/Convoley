import { describe, expect, it } from "vitest";
import { parentPath } from "./parent-path";

describe("parentPath: a dónde vuelve el botón atrás sin historial", () => {
  it.each([
    ["/c/voley-miraflores/abc", "/voley-miraflores"],
    ["/voley-miraflores/tienda", "/voley-miraflores"],
    ["/voley-miraflores", "/"],
    ["/admin/voley-miraflores/convocatorias/abc", "/admin/voley-miraflores"],
    [
      "/admin/voley-miraflores/convocatorias/abc/asistencia/r1",
      "/admin/voley-miraflores/convocatorias/abc",
    ],
    ["/admin/voley-miraflores/tienda/p1", "/admin/voley-miraflores/tienda"],
    ["/admin/voley-miraflores/pagos", "/admin/voley-miraflores"],
    ["/admin/voley-miraflores", "/"],
    ["/inscripcion/r1", "/"],
    ["/recuperar/token", "/"],
    ["/perfil", "/"],
  ])("%s → %s", (from, to) => {
    expect(parentPath(from)).toBe(to);
  });
});
