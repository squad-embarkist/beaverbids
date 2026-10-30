import { createHash } from "node:crypto";
import { mkdtemp, readFile, readdir, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createDiskStore, createRawFileStore, createS3Store } from "./storage";

const BODY = Buffer.from("referenceNumber,title\nABC-1,Hello\n", "utf8");

describe("createRawFileStore", () => {
  it("uses S3 when S3_BUCKET is set", () => {
    const store = createRawFileStore({ S3_BUCKET: "raw-files", AWS_REGION: "us-east-1" }, { s3Client: { send: vi.fn(async () => ({})) } });
    expect(store.kind).toBe("s3");
  });

  it("falls back to disk outside production", () => {
    expect(createRawFileStore({ NODE_ENV: "development" }).kind).toBe("disk");
    expect(createRawFileStore({ NODE_ENV: "test" }).kind).toBe("disk");
  });

  it("allows disk on staging only", () => {
    expect(createRawFileStore({ NODE_ENV: "production", SENTRY_ENVIRONMENT: "staging", RAW_FILES_DIR: "/var/raw" }).kind).toBe("disk");
  });

  it("refuses to start in production without S3_BUCKET", () => {
    expect(() => createRawFileStore({ NODE_ENV: "production", SENTRY_ENVIRONMENT: "production" })).toThrow(/S3_BUCKET is not set/);
    expect(() => createRawFileStore({ NODE_ENV: "production" })).toThrow(/S3_BUCKET is not set/);
    expect(() => createRawFileStore({ NODE_ENV: "production", S3_BUCKET: "   " })).toThrow(/S3_BUCKET is not set/);
  });
});

describe("disk store", () => {
  let dir = "";
  afterEach(async () => {
    if (dir) await rm(dir, { recursive: true, force: true });
  });

  it("writes the key as a relative path under the folder and leaves no temp file", async () => {
    dir = await mkdtemp(path.join(os.tmpdir(), "beaverbids-raw-"));
    const store = createDiskStore(dir);

    const stored = await store.put("canadabuys/2026/10/29/open-140000Z.csv", BODY, "text/csv");

    expect(stored).toEqual({ key: "canadabuys/2026/10/29/open-140000Z.csv", location: path.join(dir, "canadabuys", "2026", "10", "29", "open-140000Z.csv") });
    expect(await readFile(stored.location)).toEqual(BODY);
    expect(await readdir(path.dirname(stored.location))).toEqual(["open-140000Z.csv"]);
  });

  it("refuses keys that could leave the folder", async () => {
    dir = await mkdtemp(path.join(os.tmpdir(), "beaverbids-raw-"));
    const store = createDiskStore(dir);
    await expect(store.put("../outside.csv", BODY, "text/csv")).rejects.toThrow(/Invalid raw file key/);
    await expect(store.put("/etc/passwd", BODY, "text/csv")).rejects.toThrow(/Invalid raw file key/);
    await expect(store.put("a//b.csv", BODY, "text/csv")).rejects.toThrow(/Invalid raw file key/);
    await expect(store.put("", BODY, "text/csv")).rejects.toThrow(/Invalid raw file key/);
  });
});

describe("S3 store", () => {
  it("sends one PutObject with the prefixed key, the content type and a SHA-256 checksum", async () => {
    const send: (command: PutObjectCommand) => Promise<object> = vi.fn(async () => ({}));
    const store = createS3Store("raw-files", "/beaverbids/", { send });

    const stored = await store.put("canadabuys/2026/10/29/open-140000Z.csv", BODY, "text/csv");

    expect(stored).toEqual({ key: "canadabuys/2026/10/29/open-140000Z.csv", location: "s3://raw-files/beaverbids/canadabuys/2026/10/29/open-140000Z.csv" });
    expect(send).toHaveBeenCalledTimes(1);
    const command = vi.mocked(send).mock.calls[0][0];
    expect(command).toBeInstanceOf(PutObjectCommand);
    expect(command.input).toMatchObject({
      Bucket: "raw-files",
      Key: "beaverbids/canadabuys/2026/10/29/open-140000Z.csv",
      ContentType: "text/csv",
      ContentLength: BODY.length,
      ChecksumSHA256: createHash("sha256").update(BODY).digest("base64"),
    });
    expect(command.input.Body).toBe(BODY);
  });

  it("uses the key as is without a prefix", async () => {
    const send: (command: PutObjectCommand) => Promise<object> = vi.fn(async () => ({}));
    const store = createS3Store("raw-files", "", { send });
    const stored = await store.put("x/y.csv", BODY, "text/csv");
    expect(stored.location).toBe("s3://raw-files/x/y.csv");
    expect(vi.mocked(send).mock.calls[0][0].input.Key).toBe("x/y.csv");
  });
});
