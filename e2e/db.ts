import { Client } from "pg";

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1", "[::1]"]);

// The e2e suite signs up and deletes accounts, so it only ever runs against
// a local PostgreSQL: docker compose on a laptop, or the service in CI.
// Anything else (a staging or production URL, a cloud host) stops the run
// before a browser opens.
export function assertLocalDatabase(url = process.env.DATABASE_URL): string {
  if (!url) {
    throw new Error("Playwright refuses to run: DATABASE_URL is not set. Point it at the local database (docker compose up -d).");
  }
  let host: string;
  try {
    host = new URL(url).hostname;
  } catch {
    throw new Error("Playwright refuses to run: DATABASE_URL is not a valid URL.");
  }
  if (!LOCAL_HOSTS.has(host)) {
    throw new Error(`Playwright refuses to run against "${host}": only the local database (localhost) is allowed.`);
  }
  return url;
}

// Plain pg rather than the Prisma client: the generated client is ESM-only
// and Playwright loads test files as CommonJS. Deleting the user cascades
// to the profile and its scores.
export async function deleteUserByEmail(email: string): Promise<void> {
  const client = new Client({ connectionString: assertLocalDatabase() });
  await client.connect();
  try {
    await client.query('DELETE FROM "user" WHERE email = $1', [email]);
  } finally {
    await client.end();
  }
}
