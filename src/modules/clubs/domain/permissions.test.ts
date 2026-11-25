import { describe, expect, it } from "vitest";
import { can } from "./permissions";

describe("HU-33 criterio 2: el ayudante aprueba pagos y hace check-in, pero no ve finanzas", () => {
  it("HU-33: el ayudante puede manejar el día de juego (pagos, check-in, equipos)", () => {
    expect(can("helper", "run_game_day")).toBe(true);
  });

  it("HU-33: el ayudante no puede abrir cobros, finanzas ni la configuración del club", () => {
    expect(can("helper", "manage_club")).toBe(false);
  });

  it("HU-33: el administrador puede todo", () => {
    expect(can("admin", "run_game_day")).toBe(true);
    expect(can("admin", "manage_club")).toBe(true);
  });
});
