'use strict';
/**
 * r2.js — Cloudflare R2 (S3-compatible) photo storage.
 *
 * Configured via env vars (all required to enable R2):
 *   R2_ACCOUNT_ID        – Cloudflare account id
 *   R2_ACCESS_KEY_ID     – R2 API token access key
 *   R2_SECRET_ACCESS_KEY – R2 API token secret
 *   R2_BUCKET            – bucket name (e.g. incident-photos)
 *   R2_PUBLIC_URL        – public base URL (r2.dev URL or custom domain),
 *                          e.g. https://pub-xxxx.r2.dev
 *
 * If any are missing, isR2Configured() returns false and callers fall
 * back to their existing storage (Supabase).
 */

let S3Client, PutObjectCommand;
try {
  ({ S3Client, PutObjectCommand } = require('@aws-sdk/client-s3'));
} catch {
  // SDK not installed yet — isR2Configured() will report false
}

const {
  R2_ACCOUNT_ID,
  R2_ACCESS_KEY_ID,
  R2_SECRET_ACCESS_KEY,
  R2_BUCKET,
  R2_PUBLIC_URL,
} = process.env;

const configured = !!(
  S3Client &&
  R2_ACCOUNT_ID &&
  R2_ACCESS_KEY_ID &&
  R2_SECRET_ACCESS_KEY &&
  R2_BUCKET &&
  R2_PUBLIC_URL
);

let client = null;
if (configured) {
  client = new S3Client({
    region: 'auto',
    endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: R2_ACCESS_KEY_ID,
      secretAccessKey: R2_SECRET_ACCESS_KEY,
    },
  });
  console.log('[R2] Photo storage enabled →', R2_PUBLIC_URL);
} else {
  console.log('[R2] Not configured — falling back to Supabase storage for photos');
}

function isR2Configured() {
  return configured;
}

/**
 * Upload a buffer to R2 and return its public URL.
 * @param {string} key          object key, e.g. "photos/abc-123.jpg"
 * @param {Buffer} buffer       file bytes
 * @param {string} contentType  MIME type
 * @returns {Promise<string>}   public URL
 */
async function uploadToR2(key, buffer, contentType) {
  await client.send(new PutObjectCommand({
    Bucket: R2_BUCKET,
    Key: key,
    Body: buffer,
    ContentType: contentType,
  }));
  const base = R2_PUBLIC_URL.replace(/\/+$/, '');
  return `${base}/${key}`;
}

module.exports = { isR2Configured, uploadToR2 };
