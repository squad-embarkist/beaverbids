// Minimal structured logger shared by the web app and the worker. One JSON
// line per event so Coolify and Sentry breadcrumbs stay easy to read.
type Level = "info" | "warn" | "error";

function write(level: Level, message: string, fields?: Record<string, unknown>) {
  const line = JSON.stringify({
    time: new Date().toISOString(),
    level,
    message,
    ...fields,
  });
  if (level === "error") {
    console.error(line);
  } else if (level === "warn") {
    console.warn(line);
  } else {
    console.log(line);
  }
}

export const log = {
  info: (message: string, fields?: Record<string, unknown>) => write("info", message, fields),
  warn: (message: string, fields?: Record<string, unknown>) => write("warn", message, fields),
  error: (message: string, fields?: Record<string, unknown>) => write("error", message, fields),
};
