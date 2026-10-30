import "server-only";

import { cache } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

export type CurrentUser = {
  id: string;
  name: string;
  email: string;
  language: string;
};

// Reads the session from the request. Returns null when nobody is signed in.
// Reads cookies, so callers must sit inside a Suspense boundary. Wrapped in
// React cache so several components in one request share one lookup.
export const getSession = cache(async () => {
  return auth.api.getSession({ headers: await headers() });
});

// The one place pages ask "who is signed in". Redirects to sign in when
// nobody is. Returns a narrow user so sensitive fields never reach the client.
export async function getCurrentUser(): Promise<CurrentUser> {
  const session = await getSession();
  if (!session) {
    redirect("/sign-in");
  }
  const { user } = session;
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    language: user.language ?? "en",
  };
}
