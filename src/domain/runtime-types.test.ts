// Tests for runtime type guards and validation
// MC2-E4-S1: Invalid payload rejection tests

import test from "node:test";
import assert from "node:assert/strict";
import {
  isRuntimeSignal,
  isStarted,
  isHeartbeat,
  isCompleted,
  isFailed,
  isTimedOut,
  isCanceled,
  validateRuntimeSignal,
  RUNTIME_EVENTS
} from "./runtime-types.js";

test("RUNTIME_EVENTS contains expected types", () => {
  assert.deepEqual(RUNTIME_EVENTS, [
    "started",
    "heartbeat",
    "completed",
    "failed",
    "timed_out",
    "canceled"
  ]);
});

test("isRuntimeSignal returns true for valid signals", () => {
  assert.equal(isRuntimeSignal({ type: "started", storyId: "s1", sessionId: "se1" }), true);
  assert.equal(isRuntimeSignal({ type: "heartbeat", storyId: "s1", sessionId: "se1" }), true);
  assert.equal(isRuntimeSignal({ type: "completed", storyId: "s1", sessionId: "se1" }), true);
  assert.equal(isRuntimeSignal({ type: "failed", storyId: "s1", sessionId: "se1" }), true);
  assert.equal(isRuntimeSignal({ type: "timed_out", storyId: "s1", sessionId: "se1" }), true);
  assert.equal(isRuntimeSignal({ type: "canceled", storyId: "s1", sessionId: "se1" }), true);
});

test("isRuntimeSignal returns false for invalid signals", () => {
  assert.equal(isRuntimeSignal(null), false);
  assert.equal(isRuntimeSignal(undefined), false);
  assert.equal(isRuntimeSignal({}), false);
  assert.equal(isRuntimeSignal({ type: "invalid" }), false);
  assert.equal(isRuntimeSignal({ type: "started" }), false); // Missing storyId/sessionId
  assert.equal(isRuntimeSignal({ type: "started", storyId: "s1" }), false); // Missing sessionId
  assert.equal(isRuntimeSignal({ type: "started", sessionId: "se1" }), false); // Missing storyId
  assert.equal(isRuntimeSignal({ type: "started", storyId: 123, sessionId: "se1" }), false); // storyId not string
});

test("isStarted returns true only for started type", () => {
  assert.equal(isStarted({ type: "started", storyId: "s1", sessionId: "se1" }), true);
  assert.equal(isStarted({ type: "heartbeat", storyId: "s1", sessionId: "se1" }), false);
  assert.equal(isStarted({ type: "completed", storyId: "s1", sessionId: "se1" }), false);
});

test("isHeartbeat returns true only for heartbeat type", () => {
  assert.equal(isHeartbeat({ type: "heartbeat", storyId: "s1", sessionId: "se1" }), true);
  assert.equal(isHeartbeat({ type: "started", storyId: "s1", sessionId: "se1" }), false);
});

test("isCompleted returns true for completed with optional result", () => {
  assert.equal(isCompleted({ type: "completed", storyId: "s1", sessionId: "se1" }), true);
  assert.equal(isCompleted({ type: "completed", storyId: "s1", sessionId: "se1", result: { foo: "bar" } }), true);
  assert.equal(isCompleted({ type: "failed", storyId: "s1", sessionId: "se1" }), false);
});

test("isFailed returns true for failed with optional error", () => {
  assert.equal(isFailed({ type: "failed", storyId: "s1", sessionId: "se1" }), true);
  assert.equal(isFailed({ type: "failed", storyId: "s1", sessionId: "se1", error: "Something went wrong" }), true);
  assert.equal(isFailed({ type: "completed", storyId: "s1", sessionId: "se1" }), false);
});

test("isTimedOut returns true for timed_out with optional reason", () => {
  assert.equal(isTimedOut({ type: "timed_out", storyId: "s1", sessionId: "se1" }), true);
  assert.equal(isTimedOut({ type: "timed_out", storyId: "s1", sessionId: "se1", reason: "Timeout" }), true);
  assert.equal(isTimedOut({ type: "canceled", storyId: "s1", sessionId: "se1" }), false);
});

test("isCanceled returns true for canceled with optional reason", () => {
  assert.equal(isCanceled({ type: "canceled", storyId: "s1", sessionId: "se1" }), true);
  assert.equal(isCanceled({ type: "canceled", storyId: "s1", sessionId: "se1", reason: "User requested" }), true);
  assert.equal(isCanceled({ type: "timed_out", storyId: "s1", sessionId: "se1" }), false);
});

// Validation tests
test("validateRuntimeSignal accepts valid payloads", () => {
  const payloads = [
    { type: "started", storyId: "s1", sessionId: "se1" },
    { type: "heartbeat", storyId: "s1", sessionId: "se1" },
    { type: "completed", storyId: "s1", sessionId: "se1", result: { data: "test" } },
    { type: "failed", storyId: "s1", sessionId: "se1", error: "Error message" },
    { type: "timed_out", storyId: "s1", sessionId: "se1", reason: "Timeout" },
    { type: "canceled", storyId: "s1", sessionId: "se1", reason: "Canceled" }
  ];

  for (const payload of payloads) {
    const result = validateRuntimeSignal(payload);
    assert.equal(result.valid, true, `Should accept: ${JSON.stringify(payload)}`);
  }
});

test("validateRuntimeSignal rejects null/undefined", () => {
  assert.equal(validateRuntimeSignal(null).valid, false);
  assert.equal(validateRuntimeSignal(undefined).valid, false);
});

test("validateRuntimeSignal rejects missing type", () => {
  assert.equal(validateRuntimeSignal({ storyId: "s1", sessionId: "se1" }).valid, false);
  assert.equal(validateRuntimeSignal({ type: "started" }).valid, false);
});

test("validateRuntimeSignal rejects invalid type", () => {
  assert.equal(validateRuntimeSignal({ type: "startedd", storyId: "s1", sessionId: "se1" }).valid, false);
  assert.equal(validateRuntimeSignal({ type: "begin", storyId: "s1", sessionId: "se1" }).valid, false);
});

test("validateRuntimeSignal rejects missing storyId", () => {
  assert.equal(validateRuntimeSignal({ type: "started", sessionId: "se1" }).valid, false);
});

test("validateRuntimeSignal rejects missing sessionId", () => {
  assert.equal(validateRuntimeSignal({ type: "started", storyId: "s1" }).valid, false);
});

test("validateRuntimeSignal rejects non-string storyId", () => {
  assert.equal(validateRuntimeSignal({ type: "started", storyId: 123, sessionId: "se1" }).valid, false);
});

test("validateRuntimeSignal rejects non-string sessionId", () => {
  assert.equal(validateRuntimeSignal({ type: "started", storyId: "s1", sessionId: [] }).valid, false);
});

test("validateRuntimeSignal rejects non-string error on failed", () => {
  assert.equal(
    validateRuntimeSignal({ type: "failed", storyId: "s1", sessionId: "se1", error: 123 }).valid, 
    false
  );
});

test("validateRuntimeSignal rejects non-string reason on timed_out", () => {
  assert.equal(
    validateRuntimeSignal({ type: "timed_out", storyId: "s1", sessionId: "se1", reason: 123 }).valid, 
    false
  );
});

test("validateRuntimeSignal rejects non-string reason on canceled", () => {
  assert.equal(
    validateRuntimeSignal({ type: "canceled", storyId: "s1", sessionId: "se1", reason: {} }).valid, 
    false
  );
});

test("validateRuntimeSignal provides helpful error messages", () => {
  const result1 = validateRuntimeSignal(null);
  assert.ok(result1.valid === false && result1.error.includes("Invalid runtime signal"), 
    `Got: ${JSON.stringify(result1)}`);

  // When type is valid but required fields are missing/invalid, isRuntimeSignal catches this first
  const result2 = validateRuntimeSignal({ type: "started", storyId: "s1" });
  assert.ok(result2.valid === false && result2.error.includes("Invalid runtime signal"), 
    `Got: ${JSON.stringify(result2)}`);

  // For type-specific field validation, the error should mention the field
  const result3 = validateRuntimeSignal({ type: "failed", storyId: "s1", sessionId: "se1", error: 123 });
  assert.ok(result3.valid === false && result3.error.includes("error"), 
    `Got: ${JSON.stringify(result3)}`);
});
