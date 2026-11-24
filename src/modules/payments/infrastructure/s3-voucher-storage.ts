import { GetObjectCommand, NoSuchKey, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { env } from "@/lib/env";
import { validateVoucherImage, type VoucherImage } from "../domain/voucher";

// Vouchers are private: only the signed /vouchers route reads under this prefix.
const VOUCHER_PREFIX = "vouchers/";

let client: S3Client | undefined;
// Lazy, so pages that never touch vouchers work without bucket variables.
const s3 = () => (client ??= createClient());

/** Validates and stores a payment screenshot under a new random key; returns the key. */
export async function saveVoucherImage(image: VoucherImage): Promise<string> {
  const { contentType, extension } = validateVoucherImage(image);
  const key = `${crypto.randomUUID()}.${extension}`;
  await s3().send(
    new PutObjectCommand({
      Bucket: env.BUCKET_NAME,
      Key: VOUCHER_PREFIX + key,
      Body: image.bytes,
      ContentType: contentType,
    }),
  );
  return key;
}

export async function readVoucherImage(key: string) {
  try {
    const object = await s3().send(
      new GetObjectCommand({ Bucket: env.BUCKET_NAME, Key: VOUCHER_PREFIX + key }),
    );
    if (!object.Body) return null;
    return {
      body: object.Body.transformToWebStream(),
      contentType: object.ContentType ?? "application/octet-stream",
    };
  } catch (error) {
    if (error instanceof NoSuchKey) return null;
    throw error;
  }
}

function createClient() {
  const { BUCKET_ENDPOINT, BUCKET_REGION, BUCKET_ACCESS_KEY_ID, BUCKET_SECRET_ACCESS_KEY } = env;
  if (!env.BUCKET_NAME || !BUCKET_ENDPOINT || !BUCKET_ACCESS_KEY_ID || !BUCKET_SECRET_ACCESS_KEY) {
    throw new Error("Bucket is not configured: set the BUCKET_* variables (see .env.example).");
  }
  return new S3Client({
    endpoint: BUCKET_ENDPOINT,
    region: BUCKET_REGION,
    // S3Mock (local) needs path-style URLs; Railway accepts them too.
    forcePathStyle: true,
    credentials: { accessKeyId: BUCKET_ACCESS_KEY_ID, secretAccessKey: BUCKET_SECRET_ACCESS_KEY },
  });
}
