import test from "node:test";
import assert from "node:assert/strict";
import { transition } from "./state-machine.js";

test("dispatch from created -> in_progress architect", () => {
  const res = transition({ state: "created" }, { type: "dispatch", gate: "architect" });
  assert.equal(res.ok, true);
  if (res.ok) assert.deepEqual(res.next, { state: "in_progress", gate: "architect" });
});

test("contract_pass advances gate", () => {
  const res = transition({ state: "in_progress", gate: "implementer" }, { type: "contract_pass" });
  assert.equal(res.ok, true);
  if (res.ok) assert.deepEqual(res.next, { state: "in_progress", gate: "reviewer-a" });
});

test("final complete only from reviewer-b", () => {
  const res = transition({ state: "in_progress", gate: "reviewer-b" }, { type: "complete" });
  assert.equal(res.ok, true);
  if (res.ok) assert.deepEqual(res.next, { state: "done" });
});

test("pause/resume roundtrip", () => {
  const paused = transition({ state: "in_progress", gate: "operator" }, { type: "pause" });
  assert.equal(paused.ok, true);
  if (!paused.ok) return;

  const resumed = transition(paused.next, { type: "resume" });
  assert.equal(resumed.ok, true);
  if (resumed.ok) assert.deepEqual(resumed.next, { state: "in_progress", gate: "operator" });
});

test("invalid transition rejected", () => {
  const res = transition({ state: "created" }, { type: "contract_pass" });
  assert.equal(res.ok, false);
});
