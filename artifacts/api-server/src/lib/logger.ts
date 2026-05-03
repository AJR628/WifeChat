import pino from "pino";

const isProduction = process.env.NODE_ENV === "production";

// WifeChat privacy rule (Phase 3): logs must NEVER contain relationship
// message content, request bodies, model output (raw or parsed), or full
// provider/OpenAI error objects. The redact list below is the last line of
// defense for headers/bodies that pino-http would otherwise serialize. Route
// handlers are also responsible for not passing user content into log
// payloads. See `lib/safeLog.ts` and `docs/WIFECHAT_PRODUCTION_SAFETY_PLAN.md`.
export const logger = pino({
  level: process.env.LOG_LEVEL ?? "info",
  redact: {
    paths: [
      "req.body",
      "req.headers.authorization",
      "req.headers.cookie",
      'req.headers["x-app-passcode"]',
      'req.headers["x-api-key"]',
      'res.headers["set-cookie"]',
    ],
    censor: "[REDACTED]",
  },
  ...(isProduction
    ? {}
    : {
        transport: {
          target: "pino-pretty",
          options: { colorize: true },
        },
      }),
});
