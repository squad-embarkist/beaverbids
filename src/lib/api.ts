// One error shape for every route handler:
// { "error": { "code": "...", "message": "..." } }

export type ApiErrorCode =
  | "UNAUTHORIZED"
  | "BAD_REQUEST"
  | "NOT_FOUND"
  | "CONFLICT"
  | "INTERNAL";

const NO_STORE = { "cache-control": "no-store" } as const;

export function apiError(
  status: number,
  code: ApiErrorCode,
  message: string,
  details?: unknown,
): Response {
  return Response.json(
    { error: details === undefined ? { code, message } : { code, message, details } },
    { status, headers: NO_STORE },
  );
}

export function apiJson(body: unknown, init?: { status?: number }): Response {
  return Response.json(body, { status: init?.status ?? 200, headers: NO_STORE });
}
