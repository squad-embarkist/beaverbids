"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { authClient } from "@/lib/auth-client";
import { createConfirmationWatcher } from "./confirmation-watch";

// Where the confirmation link itself lands (src/lib/auth.ts,
// VERIFY_EMAIL_CALLBACK, which is server-only). With a session the route
// clears the pending cookie and redirects to the questionnaire or the
// list, so a tab that notices the session goes to the same place.
const CONFIRMED_DESTINATION = "/verify-email";

async function sessionExists(): Promise<boolean> {
  const { data } = await authClient.getSession();
  return data !== null;
}

// Renders nothing. While the Check inbox tab is visible it asks for the
// session every 5 seconds, once more the moment the tab comes back, and
// stops when hidden, after 30 minutes, or once the session exists and the
// browser has been sent on. Nothing on the page changes until then.
export function ConfirmationWatcher() {
  const router = useRouter();
  useEffect(() => {
    const watcher = createConfirmationWatcher({
      check: sessionExists,
      // replace, not push: there is nothing to come back to on this page.
      onConfirmed: () => router.replace(CONFIRMED_DESTINATION),
    });
    const isVisible = () => document.visibilityState === "visible";
    const onVisibilityChange = () => {
      const visible = isVisible();
      watcher.setVisible(visible);
      if (visible) watcher.focus();
    };
    const onFocus = () => watcher.focus();

    watcher.setVisible(isVisible());
    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("focus", onFocus);
    return () => {
      watcher.stop();
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("focus", onFocus);
    };
  }, [router]);
  return null;
}
