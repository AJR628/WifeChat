import express, { type Express, type Request, type Response, type NextFunction } from "express";
import cors, { type CorsOptions } from "cors";
import helmet from "helmet";
import pinoHttp from "pino-http";
import { randomUUID } from "node:crypto";
import router from "./routes";
import { logger } from "./lib/logger";

const app: Express = express();

const isProduction = process.env["NODE_ENV"] === "production";

const DEV_ORIGIN_PATTERNS: RegExp[] = [
  /^https?:\/\/localhost(:\d+)?$/,
  /^https?:\/\/127\.0\.0\.1(:\d+)?$/,
  /^https:\/\/[a-z0-9-]+\.replit\.dev$/,
  /^https:\/\/[a-z0-9-]+\.repl\.co$/,
  /^https:\/\/[a-z0-9-]+\.replit\.app$/,
];

const allowedOrigins = (process.env["ALLOWED_ORIGINS"] ?? "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

function isOriginAllowed(origin: string): boolean {
  if (allowedOrigins.includes(origin)) return true;
  if (!isProduction && DEV_ORIGIN_PATTERNS.some((re) => re.test(origin))) return true;
  return false;
}

const corsOptions: CorsOptions = {
  origin(origin, cb) {
    if (!origin) {
      cb(null, true);
      return;
    }
    if (isOriginAllowed(origin)) {
      cb(null, true);
      return;
    }
    cb(null, false);
  },
};

app.use(
  pinoHttp({
    logger,
    genReqId(req, res) {
      const incoming = req.headers["x-request-id"];
      const id = (typeof incoming === "string" && incoming.length > 0 && incoming.length <= 128)
        ? incoming
        : randomUUID();
      res.setHeader("X-Request-Id", id);
      return id;
    },
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.set("trust proxy", 1);
app.use(helmet());
app.use(cors(corsOptions));
app.use(express.json({ limit: "64kb" }));

app.use("/api", router);

app.use((err: unknown, req: Request, res: Response, _next: NextFunction) => {
  const requestId = (req as Request & { id?: string }).id ?? res.getHeader("X-Request-Id");
  const status = (err as { status?: number; statusCode?: number })?.status
    ?? (err as { statusCode?: number })?.statusCode
    ?? (err instanceof SyntaxError ? 400 : 500);
  const message = status === 400 ? "Invalid request body." : "Internal server error.";
  req.log?.error({ err, status, requestId }, "Request failed");
  if (res.headersSent) return;
  res.status(status).type("application/json").json({ error: message, requestId });
});

export default app;
