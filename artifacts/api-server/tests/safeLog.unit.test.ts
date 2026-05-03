// Phase 6 — Privacy-safe logging regression test.
//
// safeErrorMeta MUST only ever return { errorName, status? }. Provider
// errors (notably the OpenAI SDK) frequently pack the upstream response
// body — which can echo the user's relationship content — into
// `err.message`, `err.body`, `err.response`, `err.headers`, etc. This
// test plants every dangerous field on a fake error and asserts that
// none of them survives the helper.

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { safeErrorMeta } from "../src/lib/safeLog.ts";

describe("safeErrorMeta", () => {
  it("strips message/body/response/headers/stack from Error instances", () => {
    class FakeProviderError extends Error {
      override name = "APIError";
      status = 429;
      body = { canary: "RAW USER MESSAGE — should never be logged" };
      response = { headers: { authorization: "Bearer sk-test" } };
      headers = { authorization: "Bearer sk-test" };
    }
    const err = new FakeProviderError("CANARY: do not log me — user content");
    err.stack = "STACK_CANARY: do not log";

    const meta = safeErrorMeta(err);

    assert.deepEqual(meta, { errorName: "APIError", status: 429 });

    // Belt-and-suspenders: assert dangerous keys never appear on the result.
    const keys = Object.keys(meta);
    for (const forbidden of ["message", "body", "response", "headers", "stack", "cause"]) {
      assert.equal(keys.includes(forbidden), false, `meta must not include ${forbidden}`);
    }
    // And no canary string anywhere in the serialized output.
    const serialized = JSON.stringify(meta);
    assert.equal(serialized.includes("CANARY"), false);
    assert.equal(serialized.includes("STACK_CANARY"), false);
    assert.equal(serialized.includes("RAW USER MESSAGE"), false);
    assert.equal(serialized.includes("Bearer"), false);
  });

  it("falls back to UnknownError for non-Error/non-object values", () => {
    assert.deepEqual(safeErrorMeta("a string error"), { errorName: "UnknownError" });
    assert.deepEqual(safeErrorMeta(null), { errorName: "UnknownError" });
    assert.deepEqual(safeErrorMeta(undefined), { errorName: "UnknownError" });
    assert.deepEqual(safeErrorMeta(42), { errorName: "UnknownError" });
  });

  it("reads name + status from plain objects without copying anything else", () => {
    const obj = {
      name: "WeirdProviderShape",
      status: 503,
      message: "CANARY message",
      body: "CANARY body",
      response: { foo: "CANARY" },
      stack: "CANARY stack",
    };
    const meta = safeErrorMeta(obj);
    assert.deepEqual(meta, { errorName: "WeirdProviderShape", status: 503 });
    assert.equal(JSON.stringify(meta).includes("CANARY"), false);
  });

  it("uses statusCode when status is missing", () => {
    const err = Object.assign(new Error("nope"), { statusCode: 502 });
    const meta = safeErrorMeta(err);
    assert.equal(meta.status, 502);
  });
});
