// Phase 6 — Unit tests for the deterministic safety tripwire and the
// static schema-shaped safety responses.
//
// These tests are pure: no network, no Express, no OpenAI. They lock down
// the trip / no-trip behaviour and the shape of the static fallback so a
// future agent cannot silently relax either without a test failure.

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  detectSafetyTripwire,
  buildSafetyResult,
  type SafetyTripwireCategory,
} from "../src/lib/safety.ts";

describe("detectSafetyTripwire", () => {
  const trippingCases: Array<{ input: string; expected?: SafetyTripwireCategory }> = [
    { input: "I want to hurt myself", expected: "self_harm" },
    { input: "he hit me last night", expected: "violence" },
    { input: "he threatened to kill me", expected: "threats" },
    { input: "he forced me sexually", expected: "coercion" },
    { input: "he tracks my phone", expected: "stalking" },
    { input: "I am afraid to go home", expected: "fear" },
  ];

  for (const { input, expected } of trippingCases) {
    it(`trips on: ${JSON.stringify(input)}`, () => {
      const r = detectSafetyTripwire(input);
      assert.equal(r.tripped, true, "expected tripwire to fire");
      if (r.tripped && expected) {
        assert.equal(r.category, expected, `expected category=${expected}`);
      }
    });
  }

  const nonTrippingCases = [
    "we had a fight",
    "I am angry",
    "I hate this",
    "I am hurt by what he said",
  ];

  for (const input of nonTrippingCases) {
    it(`does NOT trip on: ${JSON.stringify(input)}`, () => {
      const r = detectSafetyTripwire(input);
      assert.equal(r.tripped, false, `expected no trip on common conflict phrase`);
    });
  }

  it("returns { tripped: false } for empty / non-string input", () => {
    assert.deepEqual(detectSafetyTripwire(""), { tripped: false });
    // @ts-expect-error — exercising defensive path
    assert.deepEqual(detectSafetyTripwire(undefined), { tripped: false });
    // @ts-expect-error — exercising defensive path
    assert.deepEqual(detectSafetyTripwire(123), { tripped: false });
  });
});

describe("buildSafetyResult", () => {
  const category: SafetyTripwireCategory = "violence";

  function assertNonEmptyString(v: unknown, field: string): void {
    assert.equal(typeof v, "string", `${field} should be string`);
    assert.ok((v as string).trim().length > 0, `${field} should not be empty`);
  }

  it("before-send returns all required schema fields, all non-empty", () => {
    const r = buildSafetyResult("before-send", category) as Record<string, string>;
    for (const k of [
      "better",
      "softer",
      "direct",
      "shortText",
      "howItMightLand",
      "realNeed",
      "oneThingToAvoid",
    ]) {
      assertNonEmptyString(r[k], k);
    }
  });

  it("repair returns all required schema fields, all non-empty", () => {
    const r = buildSafetyResult("repair", category) as Record<string, string>;
    for (const k of [
      "neutralSummary",
      "yourSideMayHaveFelt",
      "partnerSideMayHaveFelt",
      "whereItDerailed",
      "repairMessage",
      "questionToAskLater",
      "nextBestAction",
    ]) {
      assertNonEmptyString(r[k], k);
    }
  });

  it("planner has exactly 3 keyPoints and well-formed calmResponses", () => {
    const r = buildSafetyResult("planner", category) as {
      opener: string;
      keyPoints: string[];
      sensitiveSpots: string[];
      calmResponses: { ifTheySay: string; youCanSay: string }[];
      closingRequest: string;
    };
    assertNonEmptyString(r.opener, "opener");
    assert.equal(r.keyPoints.length, 3, "planner.keyPoints must have exactly 3");
    for (const [i, p] of r.keyPoints.entries()) assertNonEmptyString(p, `keyPoints[${i}]`);
    assert.ok(r.sensitiveSpots.length >= 2, "sensitiveSpots minItems=2");
    for (const [i, p] of r.sensitiveSpots.entries()) assertNonEmptyString(p, `sensitiveSpots[${i}]`);
    assert.ok(r.calmResponses.length >= 2, "calmResponses minItems=2");
    for (const [i, pair] of r.calmResponses.entries()) {
      assert.equal(typeof pair, "object", `calmResponses[${i}] must be object`);
      assertNonEmptyString(pair.ifTheySay, `calmResponses[${i}].ifTheySay`);
      assertNonEmptyString(pair.youCanSay, `calmResponses[${i}].youCanSay`);
    }
    assertNonEmptyString(r.closingRequest, "closingRequest");
  });

  it("checkin returns all required schema fields, all non-empty", () => {
    const r = buildSafetyResult("checkin", category) as Record<string, string>;
    for (const k of ["reflection", "partnerMessage", "connectionAction"]) {
      assertNonEmptyString(r[k], k);
    }
  });
});
