import { toNextJsHandler } from "better-auth/next-js";
import { auth } from "@/lib/auth";

// Better Auth owns everything under /api/auth. No custom routes live here.
export const { GET, POST } = toNextJsHandler(auth);
