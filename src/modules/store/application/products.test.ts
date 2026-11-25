import { describe, expect, test } from "vitest";
import { ProductNotFoundError, TooManyPhotosError } from "../domain/errors";
import { fakeProductImages, fakeProductRepository, storedProduct } from "./fakes";
import {
  makeAddProductPhoto,
  makeCreateProduct,
  makeSetProductActive,
  makeUpdateProduct,
} from "./products";

const image = { bytes: new Uint8Array([1]), contentType: "image/jpeg" };

describe("HU-23: publicar productos", () => {
  test("crea el producto con precio y stock por talla", async () => {
    const { products, rows } = fakeProductRepository();
    await makeCreateProduct({ products })({
      clubId: "club-1",
      product: {
        name: "Polo",
        description: "Algodón",
        priceCents: 4500,
        variants: [
          { size: "S", stock: 2 },
          { size: "M", stock: 5 },
        ],
      },
    });
    expect(rows[0]).toMatchObject({
      clubId: "club-1",
      priceCents: 4500,
      variants: [
        { size: "S", stock: 2 },
        { size: "M", stock: 5 },
      ],
    });
  });

  test("hasta 5 fotos por producto: la sexta se rechaza sin subir el archivo", async () => {
    const { products, rows } = fakeProductRepository([
      storedProduct({ imageKeys: ["a.jpg", "b.jpg", "c.jpg", "d.jpg"] }),
    ]);
    const { images, saved } = fakeProductImages();
    const addPhoto = makeAddProductPhoto({ products, images });
    const input = { clubId: "club-1", clubSlug: "voley", productId: "prod-1", image };

    await addPhoto(input);
    expect(rows[0]!.imageKeys).toHaveLength(5);
    await expect(addPhoto(input)).rejects.toBeInstanceOf(TooManyPhotosError);
    expect(saved).toHaveLength(1);
  });

  test("variantes por talla: una talla quitada queda con stock 0 (puede tener ventas)", async () => {
    const { products, rows } = fakeProductRepository([storedProduct()]);
    await makeUpdateProduct({ products })({
      clubId: "club-1",
      productId: "prod-1",
      product: {
        name: "Polo",
        description: null,
        priceCents: 5000,
        variants: [{ size: "S", stock: 4 }],
      },
      loadedVariants: [],
    });
    expect(rows[0]!.variants).toEqual([
      { id: "var-s", size: "S", stock: 4 },
      { id: "var-m", size: "M", stock: 0 },
    ]);
  });

  test("editar el precio no pisa el stock vendido mientras el formulario estaba abierto", async () => {
    const { products, rows } = fakeProductRepository([storedProduct()]);
    const loadedVariants = rows[0]!.variants.map(({ size, stock }) => ({ size, stock }));
    rows[0]!.variants[0]!.stock -= 2; // a paid order took 2 units meanwhile
    const soldDown = rows[0]!.variants[0]!.stock;
    await makeUpdateProduct({ products })({
      clubId: "club-1",
      productId: "prod-1",
      product: { name: "Polo", description: null, priceCents: 6000, variants: loadedVariants },
      loadedVariants,
    });
    expect(rows[0]!.priceCents).toBe(6000);
    expect(rows[0]!.variants[0]!.stock).toBe(soldDown);
  });

  test("un organizador solo toca productos de su club", async () => {
    const { products } = fakeProductRepository([storedProduct({ clubId: "other" })]);
    await expect(
      makeSetProductActive({ products })({
        clubId: "club-1",
        productId: "prod-1",
        isActive: false,
      }),
    ).rejects.toBeInstanceOf(ProductNotFoundError);
  });
});
