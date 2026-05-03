// Phase 6 — Provider-selection regression tests.
//
// The provider-selection logic in routes/coach.ts (selectCredentials) is
// not exported, and we deliberately avoid exporting it just for tests
// (it would widen the public surface of the route module). Instead we
// cover its observable behaviour via the missing-credential failure
// path, which is the only behaviour callers can rely on:
//
//   - Default mode is "openai": when ONLY OPENAI_API_KEY is set, the
//     request reaches the OpenAI client construction step (no
//     missing-credentials 500). We stop short of an actual network call
//     by injecting an unreachable baseURL via env... actually, we can't
//     do that without changing prod code. So instead we assert the
//     INVERSE in a deterministic, offline way: when OPENAI_API_KEY is
//     unset and USE_REPLIT_OPENAI_PROXY is unset, we get the
//     missing-credentials 500 — proving OPENAI_API_KEY is the default
//     selection (Replit proxy vars do not satisfy it).
//
//   - Replit proxy must be opt-in: when OPENAI_API_KEY is unset but the
//     AI_INTEGRATIONS_OPENAI_API_KEY is set, the server STILL returns
//     500 because USE_REPLIT_OPENAI_PROXY was not flipped to "true".
//
//   - Replit proxy is honored when the flag is explicitly "true": with
//     AI_INTEGRATIONS_OPENAI_API_KEY set and the flag on, the request
//     proceeds past credential selection (we again stop at a safety
//     intercept so no live OpenAI call is attempted).
//
// No live OpenAI calls happen in any of these tests.

import { before, after, describe, it } from "node:test";
import assert from "node:assert/strict";
import type { Server } from "node:http";

process.env["NODE_ENV"] = "test";
process.env["LOG_LEVEL"] = "silent";
process.env["ALLOWED_ORIGINS"] = "https://allowed.example";

const { default: app } = await import("../src/app.ts");
const { selectCredentials } = await import("../src/routes/coach.ts");

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

type Saved = Record<string, string | undefined>;

const CRED_VARS = [
  "OPENAI_API_KEY",
  "USE_REPLIT_OPENAI_PROXY",
  "AI_INTEGRATIONS_OPENAI_API_KEY",
  "AI_INTEGRATIONS_OPENAI_BASE_URL",
  "COACH_API_DISABLED",
] as const;

function snapshotEnv(): Saved {
  const out: Saved = {};
  for (const k of CRED_VARS) out[k] = process.env[k];
  return out;
}

function restoreEnv(saved: Saved): void {
  for (const k of CRED_VARS) {
    const v = saved[k];
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
}

function clearCredEnv(): void {
  for (const k of CRED_VARS) delete process.env[k];
}

async function postBeforeSend(message: string): Promise<Response> {
  return fetch(`${baseUrl}/api/coach/before-send`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message }),
  });
}

describe("selectCredentials (direct unit)", () => {
  // Direct, deterministic positive-path proof. The integration tests below
  // exercise the same logic through the HTTP layer; this section nails down
  // the pure return value so a regression in selection priority cannot be
  // masked by a downstream short-circuit (e.g. safety intercept).
  it("returns mode=openai with apiKey when only OPENAI_API_KEY is set", () => {
    const saved = snapshotEnv();
    clearCredEnv();
    try {
      process.env["OPENAI_API_KEY"] = "sk-fake-default";
      const c = selectCredentials();
      assert.notEqual(c, null);
      assert.equal(c?.mode, "openai");
      assert.equal(c?.apiKey, "sk-fake-default");
      assert.equal(c?.baseURL, undefined, "default mode must not set a baseURL");
    } finally {
      restoreEnv(saved);
    }
  });

  it("ignores Replit proxy vars when USE_REPLIT_OPENAI_PROXY is unset", () => {
    const saved = snapshotEnv();
    clearCredEnv();
    try {
      process.env["AI_INTEGRATIONS_OPENAI_API_KEY"] = "fake-replit-key";
      process.env["AI_INTEGRATIONS_OPENAI_BASE_URL"] = "https://example.invalid";
      assert.equal(selectCredentials(), null);
    } finally {
      restoreEnv(saved);
    }
  });

  it("treats USE_REPLIT_OPENAI_PROXY values other than literal 'true' as off", () => {
    const saved = snapshotEnv();
    clearCredEnv();
    try {
      process.env["AI_INTEGRATIONS_OPENAI_API_KEY"] = "fake-replit-key";
      for (const v of ["1", "TRUE", "True", "yes", "on", " true"]) {
        process.env["USE_REPLIT_OPENAI_PROXY"] = v;
        assert.equal(
          selectCredentials(),
          null,
          `flag ${JSON.stringify(v)} must NOT activate the Replit proxy`,
        );
      }
    } finally {
      restoreEnv(saved);
    }
  });

  it("returns mode=replit-proxy with apiKey + baseURL when flag is 'true'", () => {
    const saved = snapshotEnv();
    clearCredEnv();
    try {
      process.env["USE_REPLIT_OPENAI_PROXY"] = "true";
      process.env["AI_INTEGRATIONS_OPENAI_API_KEY"] = "fake-replit-key";
      process.env["AI_INTEGRATIONS_OPENAI_BASE_URL"] = "https://example.invalid";
      const c = selectCredentials();
      assert.notEqual(c, null);
      assert.equal(c?.mode, "replit-proxy");
      assert.equal(c?.apiKey, "fake-replit-key");
      assert.equal(c?.baseURL, "https://example.invalid");
    } finally {
      restoreEnv(saved);
    }
  });

  it("returns mode=replit-proxy with no baseURL when only the proxy key is set", () => {
    const saved = snapshotEnv();
    clearCredEnv();
    try {
      process.env["USE_REPLIT_OPENAI_PROXY"] = "true";
      process.env["AI_INTEGRATIONS_OPENAI_API_KEY"] = "fake-replit-key";
      const c = selectCredentials();
      assert.equal(c?.mode, "replit-proxy");
      assert.equal(c?.baseURL, undefined);
    } finally {
      restoreEnv(saved);
    }
  });

  it("returns null when proxy flag is 'true' but the proxy key is missing", () => {
    const saved = snapshotEnv();
    clearCredEnv();
    try {
      process.env["USE_REPLIT_OPENAI_PROXY"] = "true";
      assert.equal(selectCredentials(), null);
    } finally {
      restoreEnv(saved);
    }
  });

  it("returns null when no credentials at all are set", () => {
    const saved = snapshotEnv();
    clearCredEnv();
    try {
      assert.equal(selectCredentials(), null);
    } finally {
      restoreEnv(saved);
    }
  });
});

describe("provider selection (HTTP)", () => {
  it("defaults to OPENAI_API_KEY: missing default key + no proxy flag => 500", async () => {
    const saved = snapshotEnv();
    clearCredEnv();
    try {
      // Replit-proxy vars are present, but the opt-in flag is NOT set.
      // The server must IGNORE them and report missing credentials.
      process.env["AI_INTEGRATIONS_OPENAI_API_KEY"] = "fake-replit-key-not-used";
      process.env["AI_INTEGRATIONS_OPENAI_BASE_URL"] = "https://example.invalid";
      const res = await postBeforeSend("we just had a small disagreement");
      assert.equal(
        res.status,
        500,
        "Replit proxy vars must NOT satisfy default selection",
      );
    } finally {
      restoreEnv(saved);
    }
  });

  it("Replit proxy is opt-in only: USE_REPLIT_OPENAI_PROXY != 'true' => proxy ignored", async () => {
    const saved = snapshotEnv();
    clearCredEnv();
    try {
      process.env["USE_REPLIT_OPENAI_PROXY"] = "1"; // not the literal "true"
      process.env["AI_INTEGRATIONS_OPENAI_API_KEY"] = "fake-replit-key-not-used";
      const res = await postBeforeSend("we just had a small disagreement");
      assert.equal(
        res.status,
        500,
        "Only the literal 'true' should activate the Replit proxy",
      );
    } finally {
      restoreEnv(saved);
    }
  });

  it("Replit proxy is honored when USE_REPLIT_OPENAI_PROXY='true' AND its key is set", async () => {
    // We prove this by hitting the safety tripwire: the request runs
    // through credential selection (no 500) and short-circuits with a
    // 200 schema-shaped safety response BEFORE any OpenAI call.
    const saved = snapshotEnv();
    clearCredEnv();
    try {
      process.env["USE_REPLIT_OPENAI_PROXY"] = "true";
      process.env["AI_INTEGRATIONS_OPENAI_API_KEY"] = "fake-replit-key-not-used";
      const res = await postBeforeSend("he hit me last night");
      assert.equal(res.status, 200);
      const body = (await res.json()) as {
        safety?: { intercepted?: boolean };
      };
      assert.equal(body.safety?.intercepted, true);
    } finally {
      restoreEnv(saved);
    }
  });

  it("with proxy flag 'true' but no proxy key, returns clean 500 (no crash)", async () => {
    const saved = snapshotEnv();
    clearCredEnv();
    try {
      process.env["USE_REPLIT_OPENAI_PROXY"] = "true";
      // intentionally no AI_INTEGRATIONS_OPENAI_API_KEY, and we also
      // ensure OPENAI_API_KEY is unset so it cannot accidentally pass.
      const res = await postBeforeSend("we just had a small disagreement");
      assert.equal(res.status, 500);
      const health = await fetch(`${baseUrl}/api/healthz`);
      assert.equal(health.status, 200);
    } finally {
      restoreEnv(saved);
    }
  });

  it("OPENAI_API_KEY is honored as the default: passes credential selection", async () => {
    // Same proof shape as the proxy-honored case: hit the safety
    // tripwire so we never call OpenAI but DO get past selection.
    const saved = snapshotEnv();
    clearCredEnv();
    try {
      process.env["OPENAI_API_KEY"] = "sk-fake-not-used-in-tests";
      const res = await postBeforeSend("he hit me last night");
      assert.equal(res.status, 200);
      const body = (await res.json()) as {
        safety?: { intercepted?: boolean };
      };
      assert.equal(body.safety?.intercepted, true);
    } finally {
      restoreEnv(saved);
    }
  });
});
