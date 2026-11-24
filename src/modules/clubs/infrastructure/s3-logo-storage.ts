import { GetObjectCommand, NoSuchKey, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { env } from "@/lib/env";
import type { LogoStorage } from "../application/ports";
import type { LogoContentType } from "../domain/logo";

// Logos share the bucket with private files (vouchers): the prefix keeps reads limited to logos.
const LOGO_PREFIX = "logos/";

export function s3LogoStorage(): LogoStorage {
  let client: S3Client | undefined;
  // Lazy, so pages that never touch logos work without bucket variables.
  const s3 = () => (client ??= createClient());

  return {
    async save({ key, bytes, contentType }) {
      await s3().send(
        new PutObjectCommand({
          Bucket: env.BUCKET_NAME,
          Key: LOGO_PREFIX + key,
          Body: bytes,
          ContentType: contentType,
        }),
      );
    },

    async read(key) {
      try {
        const object = await s3().send(
          new GetObjectCommand({ Bucket: env.BUCKET_NAME, Key: LOGO_PREFIX + key }),
        );
        if (!object.Body) return null;
        return {
          body: object.Body.transformToWebStream(),
          // Only save() writes under the prefix, always with an allowed type.
          contentType: object.ContentType as LogoContentType,
        };
      } catch (error) {
        if (error instanceof NoSuchKey) return null;
        throw error;
      }
    },
  };
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
