import "server-only";
import { Files } from "files-sdk";
import { neon } from "files-sdk/neon";

/** Neon Object Storage bucket for images uploaded in /admin (declared public_read in neon.ts). */
export const UPLOAD_BUCKET = "product-uploads";

export const isStorageConfigured = () =>
  Boolean(process.env.AWS_ENDPOINT_URL_S3 && process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY);

let files: Files | null = null;

/** Files SDK with the Neon adapter: reads endpoint, region and credentials from the injected AWS_* env vars. */
function bucket() {
  files ??= new Files({ adapter: neon({ bucket: UPLOAD_BUCKET }) });
  return files;
}

/** Public URL of an object in the public_read bucket (path-style, as Neon requires). */
export function publicUrl(key: string) {
  return `${process.env.AWS_ENDPOINT_URL_S3!.replace(/\/$/, "")}/${UPLOAD_BUCKET}/${key}`;
}

/** Uploads an immutable object (every upload gets a new key) and returns its public URL. */
export async function uploadPublic(key: string, body: Buffer, contentType: string) {
  await bucket().upload(key, body, { contentType, cacheControl: "public, max-age=31536000, immutable" });
  return publicUrl(key);
}

export async function deleteObject(key: string) {
  await bucket().delete(key);
}

export async function objectExists(key: string) {
  return bucket().exists(key);
}
