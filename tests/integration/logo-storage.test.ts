import { config } from "dotenv";
import { describe, expect, it } from "vitest";

// env.ts parses process.env on import, so load .env.local and import the storage dynamically.
config({ path: ".env.local", quiet: true });

describe("HU-02: s3LogoStorage (S3Mock local)", () => {
  it("HU-02: guarda un logo y lo lee igual; una key inexistente da null", async () => {
    const { s3LogoStorage } = await import("@/modules/clubs/infrastructure/s3-logo-storage");
    const storage = s3LogoStorage();
    const key = `hu02-${Date.now()}.png`;
    const bytes = new Uint8Array([137, 80, 78, 71, 1, 2, 3]);

    await storage.save({ key, bytes, contentType: "image/png" });
    const logo = await storage.read(key);

    expect(logo?.contentType).toBe("image/png");
    expect(new Uint8Array(await new Response(logo?.body).arrayBuffer())).toEqual(bytes);
    expect(await storage.read(`no-existe-${key}`)).toBeNull();
  });
});
