import { connection } from "next/server";
import { prisma } from "@/lib/db";

// Watched by Sentry Uptime. Returns 200 only when the database answers.
// connection() marks the handler as request-time so the build never tries
// to prerender it against a database.
export async function GET() {
  await connection();

  try {
    await prisma.$queryRaw`SELECT 1`;
    return Response.json(
      { status: "ok", database: "ok" },
      { headers: { "cache-control": "no-store" } },
    );
  } catch {
    return Response.json(
      { status: "error", database: "unreachable" },
      { status: 503, headers: { "cache-control": "no-store" } },
    );
  }
}
