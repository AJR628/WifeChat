// Phase 3 — Privacy-Safe Logging.
//
// WifeChat handles deeply private relationship content. Logs are useful only
// if they never include the user's message, the model's response, or any
// provider payload that may echo either of those back. This helper extracts
// metadata from unknown error values WITHOUT returning the raw error,
// stack trace, response body, request body, prompt, or any provider payload.
//
// Allowed output fields (all strictly metadata, no free-form text):
//   - errorName : the error constructor / `name` property (e.g. "SyntaxError",
//                 "APIError"). Bounded set in practice; not user content.
//   - status    : HTTP-style status code if the provider attached one.
//
// We deliberately do NOT return `err.message`. Provider SDKs (notably the
// OpenAI client) frequently pack the upstream response body — which can
// echo the user's prompt or the model's output — into `error.message` as
// plain text. A heuristic filter is not strong enough; the safe choice is
// to drop the message entirely. Operators correlate logs by `requestId`
// and reproduce instead of grepping bodies.
//
// Never include: err.body, err.response, err.cause, err.stack, err.headers,
// err.message, raw, parsed, messages, prompt, request body.

export type SafeErrorMeta = {
  errorName: string;
  status?: number;
};

export function safeErrorMeta(err: unknown): SafeErrorMeta {
  if (err instanceof Error) {
    const meta: SafeErrorMeta = { errorName: err.name || "Error" };
    const status = (err as { status?: number; statusCode?: number }).status
      ?? (err as { statusCode?: number }).statusCode;
    if (typeof status === "number") meta.status = status;
    return meta;
  }
  if (err && typeof err === "object") {
    const o = err as { name?: unknown; status?: unknown; statusCode?: unknown };
    const meta: SafeErrorMeta = {
      errorName: typeof o.name === "string" ? o.name : "UnknownError",
    };
    const status = typeof o.status === "number"
      ? o.status
      : typeof o.statusCode === "number"
        ? o.statusCode
        : undefined;
    if (typeof status === "number") meta.status = status;
    return meta;
  }
  return { errorName: "UnknownError" };
}
