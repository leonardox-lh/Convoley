import { describe, expect, it } from "vitest";
import { parseCommunityName } from "./community";
import { InvalidCommunityNameError } from "./errors";

describe("HU-09: nombre de comunidad", () => {
  it("HU-09: limpia espacios de más", () => {
    expect(parseCommunityName("  Nivel   Amateur ")).toBe("Nivel Amateur");
  });

  it.each(["", "   ", "x".repeat(41)])("HU-09: rechaza %j", (raw) => {
    expect(() => parseCommunityName(raw)).toThrow(InvalidCommunityNameError);
  });
});
