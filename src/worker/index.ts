// Entry point for the pg-boss worker: `npm run worker`.
// dotenv loads .env for local runs (a no-op in Docker, where Coolify sets the
// variables). Sentry comes next so it loads before pg-boss and pg.
import "dotenv/config";
import "./instrument";
import { main } from "./main";

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
