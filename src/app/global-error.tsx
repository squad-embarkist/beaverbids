"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

// Last-resort error page for the root layout. It renders its own html and
// body because the root layout itself has failed. Copy is hard coded here on
// purpose: the translation provider lives in the layout that just crashed.
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="en">
      <body style={{ fontFamily: "system-ui, sans-serif", padding: "48px 16px" }}>
        <main style={{ maxWidth: 480, margin: "0 auto" }}>
          <h1 style={{ fontSize: 28, lineHeight: "34px", marginBottom: 16 }}>
            Something went wrong
          </h1>
          <p style={{ marginBottom: 24 }}>
            We could not load this page. Try again in a minute.
          </p>
          <button
            type="button"
            onClick={reset}
            style={{
              height: 44,
              padding: "0 16px",
              background: "#D2311F",
              color: "#FFFFFF",
              border: 0,
              borderRadius: 4,
              cursor: "pointer",
            }}
          >
            Try again
          </button>
        </main>
      </body>
    </html>
  );
}
