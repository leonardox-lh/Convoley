import { readVoucherImage, verifyVoucherSignature } from "@/modules/payments";

// Only names our voucher keys can have (random UUID + extension).
const VOUCHER_KEY = /^[0-9a-f-]{36}\.(jpg|png|webp)$/;

/** Private voucher images (HU-15): served only with a valid, unexpired signature. */
export async function GET(request: Request, context: RouteContext<"/vouchers/[key]">) {
  const { key } = await context.params;
  const { searchParams } = new URL(request.url);
  const signed = verifyVoucherSignature({
    key,
    exp: searchParams.get("exp"),
    sig: searchParams.get("sig"),
  });
  if (!VOUCHER_KEY.test(key) || !signed) return new Response(null, { status: 404 });

  const image = await readVoucherImage(key);
  if (!image) return new Response(null, { status: 404 });
  return new Response(image.body, {
    headers: {
      "Content-Type": image.contentType,
      // The browser may keep it while the link is valid, but no shared cache ever stores it.
      "Cache-Control": "private, max-age=300",
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "no-referrer",
    },
  });
}
