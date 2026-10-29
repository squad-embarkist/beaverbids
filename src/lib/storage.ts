import { createHash } from "node:crypto";
import { mkdir, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

// Where the worker keeps each raw source file before parsing it, so a parser
// bug can be replayed against the exact bytes a run saw. S3 when S3_BUCKET is
// set, else a folder on disk (development, and staging until the AWS bucket
// exists; staging mounts RAW_FILES_DIR on a persistent volume). The key
// stored on the tender (rawFileKey) is the same in both stores, so moving
// from disk to S3 later needs no data change.

export type StoredFile = { key: string; location: string };

export type RawFileStore = {
  readonly kind: "s3" | "disk";
  put(key: string, body: Buffer, contentType: string): Promise<StoredFile>;
};

export const DEFAULT_RAW_FILES_DIR = ".data/raw";

type S3Sender = Pick<S3Client, "send">;

// Production refuses to run without S3: a file written to a container's disk
// is lost on the next deploy, which defeats the point of keeping it. Staging
// (SENTRY_ENVIRONMENT=staging) is the one production-mode process allowed on
// disk until the bucket exists. Called from the worker's main() before pg-boss
// starts, so a misconfigured deploy exits with this message instead of
// failing at 14:00 UTC.
export type StoreEnv = Record<string, string | undefined>;

export function createRawFileStore(env: StoreEnv = process.env, deps: { s3Client?: S3Sender } = {}): RawFileStore {
  const bucket = env.S3_BUCKET?.trim();
  if (bucket) {
    const client = deps.s3Client ?? new S3Client(env.AWS_REGION ? { region: env.AWS_REGION } : {});
    return createS3Store(bucket, env.S3_PREFIX?.trim() ?? "", client);
  }
  if (env.NODE_ENV === "production" && env.SENTRY_ENVIRONMENT !== "staging") {
    throw new Error("S3_BUCKET is not set. Production keeps raw source files in S3: set S3_BUCKET and the AWS credentials, or SENTRY_ENVIRONMENT=staging to use RAW_FILES_DIR on a persistent volume.");
  }
  return createDiskStore(env.RAW_FILES_DIR?.trim() || DEFAULT_RAW_FILES_DIR);
}

export function createS3Store(bucket: string, prefix: string, client: S3Sender): RawFileStore {
  const cleanPrefix = prefix.replace(/^\/+|\/+$/g, "");
  return {
    kind: "s3",
    async put(key, body, contentType) {
      const objectKey = cleanPrefix ? `${cleanPrefix}/${checkKey(key)}` : checkKey(key);
      await client.send(
        new PutObjectCommand({
          Bucket: bucket,
          Key: objectKey,
          Body: body,
          ContentType: contentType,
          ContentLength: body.length,
          // S3 verifies the upload against this digest and rejects a mismatch.
          ChecksumSHA256: createHash("sha256").update(body).digest("base64"),
        }),
      );
      return { key, location: `s3://${bucket}/${objectKey}` };
    },
  };
}

export function createDiskStore(dir: string): RawFileStore {
  const root = path.resolve(dir);
  return {
    kind: "disk",
    async put(key, body) {
      const target = path.join(root, ...checkKey(key).split("/"));
      await mkdir(path.dirname(target), { recursive: true });
      // Write beside the target and rename, so a crash mid-write never
      // leaves a half file under the real name.
      const temp = `${target}.${process.pid}.tmp`;
      await writeFile(temp, body);
      await rename(temp, target);
      return { key, location: target };
    },
  };
}

// Keys are relative paths built by the ingest runner (<source>/<yyyy>/<mm>/
// <dd>/<file>). Anything else is a bug, and on disk a ".." segment would
// write outside the store.
function checkKey(key: string): string {
  if (!key || key.startsWith("/") || key.split("/").some((segment) => segment === "" || segment === "." || segment === "..")) {
    throw new Error(`Invalid raw file key: ${JSON.stringify(key)}`);
  }
  return key;
}
