// Phase 6 — API integration tests.
//
// These tests boot the Express app on an ephemeral port (no fixed PORT,
// no real production listener) and exercise the perimeter behaviours we
// promised in Phases 1–4:
//   - /api/healthz returns ok and X-Request-Id is set on every response
//   - invalid JSON yields { error, requestId } as JSON, not HTML
//   - CORS allowlist accepts allowed origins and silently drops the
//     Access-Control-Allow-Origin header for blocked ones
//   - COACH_API_DISABLED=true short-circuits with 503 before OpenAI
//   - missing OPENAI_API_KEY produces a clean 500 (server stays alive)
//   - the safety tripwire returns a 200, schema-shaped result with
//     safety.intercepted=true and never reaches OpenAI
//   - /api/chat is absent (404)
//
// No live OpenAI calls are ever made: every test path either returns
// before the OpenAI call or has no credentials at all.

import { before, after, describe, it } from "node:test";
import assert from "node:assert/strict";
import type { Server } from "node:http";

// IMPORTANT: set env BEFORE importing app.ts, because ALLOWED_ORIGINS is
// captured at module load. Silence logs for clean test output.
process.env["NODE_ENV"] = "test";
process.env["LOG_LEVEL"] = "silent";
process.env["ALLOWED_ORIGINS"] = "https://allowed.example,https://wifechat.example";

const { default: app } = await import("../src/app.ts");

let server: Server;
let baseUrl = "";

before(async () => {
  server = app.listen(0);
  await new Promise<void>((resolve) => server.once("listening", () => resolve()));
  const addr = server.address();
  if (addr === null || typeof addr === "string") throw new Error("no server address");
  baseUrl = `http://127.0.0.1:${addr.port}`;
});

after(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()));
});

describe("GET /api/healthz", () => {
  it("returns 200 ok and an X-Request-Id header", async () => {
    const res = await fetch(`${baseUrl}/api/healthz`);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.deepEqual(body, { status: "ok" });
    const reqId = res.headers.get("x-request-id");
    assert.ok(reqId && reqId.length > 0, "X-Request-Id must be present");
  });

  it("honors a client-supplied X-Request-Id", async () => {
    const res = await fetch(`${baseUrl}/api/healthz`, {
      headers: { "X-Request-Id": "client-supplied-id-123" },
    });
    assert.equal(res.headers.get("x-request-id"), "client-supplied-id-123");
  });
});

describe("invalid JSON body", () => {
  it("returns application/json with { error, requestId }, not HTML", async () => {
    const res = await fetch(`${baseUrl}/api/coach/before-send`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{not valid json",
    });
    assert.equal(res.status, 400);
    const ct = res.headers.get("content-type") ?? "";
    assert.ok(ct.includes("application/json"), `expected JSON, got ${ct}`);
    const body = (await res.json()) as { error?: string; requestId?: string };
    assert.equal(typeof body.error, "string");
    assert.equal(typeof body.requestId, "string");
  });
});

describe("CORS allowlist", () => {
  it("allows a permitted origin", async () => {
    const res = await fetch(`${baseUrl}/api/healthz`, {
      headers: { Origin: "https://allowed.example" },
    });
    assert.equal(res.status, 200);
    assert.equal(
      res.headers.get("access-control-allow-origin"),
      "https://allowed.example",
    );
  });

  it("denies a blocked origin (no Access-Control-Allow-Origin header)", async () => {
    const res = await fetch(`${baseUrl}/api/healthz`, {
      headers: { Origin: "https://evil.example" },
    });
    // Request still completes (CORS is enforced by the browser via the
    // missing header, not by the server returning an error), but the
    // allow header MUST be absent.
    assert.equal(res.headers.get("access-control-allow-origin"), null);
  });
});

describe("COACH_API_DISABLED kill switch", () => {
  it("returns 503 for /api/coach/before-send when set to true", async () => {
    const prev = process.env["COACH_API_DISABLED"];
    process.env["COACH_API_DISABLED"] = "true";
    try {
      const res = await fetch(`${baseUrl}/api/coach/before-send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: "hello" }),
      });
      assert.equal(res.status, 503);
      const body = (await res.json()) as { error?: string };
      assert.equal(typeof body.error, "string");
    } finally {
      if (prev === undefined) delete process.env["COACH_API_DISABLED"];
      else process.env["COACH_API_DISABLED"] = prev;
    }
  });
});

describe("missing OpenAI credentials", () => {
  it("returns a clean 500 without crashing the server", async () => {
    // Save and clear all credential-related env vars.
    const saved: Record<string, string | undefined> = {
      OPENAI_API_KEY: process.env["OPENAI_API_KEY"],
      USE_REPLIT_OPENAI_PROXY: process.env["USE_REPLIT_OPENAI_PROXY"],
      AI_INTEGRATIONS_OPENAI_API_KEY: process.env["AI_INTEGRATIONS_OPENAI_API_KEY"],
      AI_INTEGRATIONS_OPENAI_BASE_URL: process.env["AI_INTEGRATIONS_OPENAI_BASE_URL"],
      COACH_API_DISABLED: process.env["COACH_API_DISABLED"],
    };
    delete process.env["OPENAI_API_KEY"];
    delete process.env["USE_REPLIT_OPENAI_PROXY"];
    delete process.env["AI_INTEGRATIONS_OPENAI_API_KEY"];
    delete process.env["AI_INTEGRATIONS_OPENAI_BASE_URL"];
    delete process.env["COACH_API_DISABLED"];
    try {
      const res = await fetch(`${baseUrl}/api/coach/before-send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: "we just had a small disagreement" }),
      });
      assert.equal(res.status, 500);
      const body = (await res.json()) as { error?: string };
      assert.equal(typeof body.error, "string");
      // Server must still be alive after the failure.
      const health = await fetch(`${baseUrl}/api/healthz`);
      assert.equal(health.status, 200);
    } finally {
      for (const [k, v] of Object.entries(saved)) {
        if (v === undefined) delete process.env[k];
        else process.env[k] = v;
      }
    }
  });
});

describe("safety intercept", () => {
  it("returns 200, schema-shaped result, safety.intercepted=true, no OpenAI call", async () => {
    // Belt-and-suspenders #1: clear creds so even if the tripwire failed,
    // we'd see a 500 (missing-credentials), not a real API call.
    const saved = process.env["OPENAI_API_KEY"];
    delete process.env["OPENAI_API_KEY"];

    // Belt-and-suspenders #2: monkey-patch global fetch so any call to an
    // OpenAI host trips a flag we can assert on. The OpenAI SDK (v4+) uses
    // global fetch; the in-process fetch we use to drive the API server
    // hits 127.0.0.1 and is allowed through.
    const originalFetch = globalThis.fetch;
    let openAiCalled = false;
    let openAiCalledUrl = "";
    globalThis.fetch = ((input: RequestInfo | URL, init?: RequestInit) => {
      const url =
        typeof input === "string"
          ? input
          : input instanceof URL
            ? input.toString()
            : input.url;
      // Anything that is not localhost is treated as an external call.
      if (!/^https?:\/\/(127\.0\.0\.1|localhost)(:\d+)?\//.test(url)) {
        openAiCalled = true;
        openAiCalledUrl = url;
      }
      return originalFetch(input as Parameters<typeof fetch>[0], init);
    }) as typeof fetch;

    try {
      const res = await fetch(`${baseUrl}/api/coach/before-send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: "he hit me last night" }),
      });
      assert.equal(res.status, 200);
      const body = (await res.json()) as {
        tool: string;
        result: Record<string, string>;
        safety: { intercepted: boolean; category: string };
      };
      assert.equal(body.tool, "before-send");
      assert.equal(body.safety.intercepted, true);
      assert.equal(body.safety.category, "violence");
      for (const k of [
        "better",
        "softer",
        "direct",
        "shortText",
        "howItMightLand",
        "realNeed",
        "oneThingToAvoid",
      ]) {
        assert.equal(typeof body.result[k], "string");
        assert.ok((body.result[k] as string).length > 0, `${k} should be non-empty`);
      }
      assert.equal(
        openAiCalled,
        false,
        `safety intercept must not invoke any external HTTP call (saw ${openAiCalledUrl})`,
      );
    } finally {
      globalThis.fetch = originalFetch;
      if (saved === undefined) delete process.env["OPENAI_API_KEY"];
      else process.env["OPENAI_API_KEY"] = saved;
    }
  });
});

describe("/api/chat is absent", () => {
  it("returns 404 for POST /api/chat", async () => {
    const res = await fetch(`${baseUrl}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: "hi" }),
    });
    assert.equal(res.status, 404);
  });

  it("returns 404 for GET /api/chat", async () => {
    const res = await fetch(`${baseUrl}/api/chat`);
    assert.equal(res.status, 404);
  });
});
