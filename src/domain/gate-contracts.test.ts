// Tests for gate completion schema and evidence validators
// MC2-E6-S1: Gate completion schema and evidence validation tests

import test from "node:test";
import assert from "node:assert/strict";
import {
  COMPLETION_STATUSES,
  EVIDENCE_TYPES,
  Gate,
  CompletionStatus,
  EvidenceType,
  GateCompletion,
  GateEvidence,
  GateRequirements,
  GATE_REQUIREMENTS,
  isGate,
  isCompletionStatus,
  isEvidenceType,
  isGateCompletion,
  isGateEvidence,
  validateGateCompletion,
  validateEvidence,
  getGateRequirements,
  canAutoApprove,
  createGateCompletion,
  createGateEvidence
} from "./gate-contracts.js";
import { GATES } from "./workflow-types.js";

test("GATES contains expected gate types", () => {
  assert.deepEqual(GATES, ["architect", "implementer", "reviewer-a", "operator", "reviewer-b"]);
});

test("COMPLETION_STATUSES contains expected statuses", () => {
  assert.deepEqual(COMPLETION_STATUSES, ["pending", "approved", "rejected", "needs_revision"]);
});

test("EVIDENCE_TYPES contains expected evidence types", () => {
  assert.deepEqual(EVIDENCE_TYPES, [
    "code_change",
    "test_result",
    "documentation",
    "review_comment",
    "deployment_record",
    "api_call",
    "manual_verification"
  ]);
});

test("GATE_REQUIREMENTS has requirements for all gates", () => {
  for (const gate of GATES) {
    assert.ok(GATE_REQUIREMENTS[gate], `Should have requirements for ${gate}`);
    const req = GATE_REQUIREMENTS[gate];
    assert.ok(Array.isArray(req.requiredEvidence), "requiredEvidence should be an array");
    assert.ok(typeof req.minEvidenceCount === "number", "minEvidenceCount should be a number");
    assert.ok(typeof req.allowManualOverride === "boolean", "allowManualOverride should be a boolean");
  }
});

// Type guard tests
test("isGate returns true for valid gates", () => {
  assert.equal(isGate("architect"), true);
  assert.equal(isGate("implementer"), true);
  assert.equal(isGate("reviewer-a"), true);
  assert.equal(isGate("operator"), true);
  assert.equal(isGate("reviewer-b"), true);
});

test("isGate returns false for invalid gates", () => {
  assert.equal(isGate("invalid"), false);
  assert.equal(isGate(""), false);
  assert.equal(isGate(123), false);
  assert.equal(isGate(null), false);
  assert.equal(isGate(undefined), false);
});

test("isCompletionStatus returns true for valid statuses", () => {
  assert.equal(isCompletionStatus("pending"), true);
  assert.equal(isCompletionStatus("approved"), true);
  assert.equal(isCompletionStatus("rejected"), true);
  assert.equal(isCompletionStatus("needs_revision"), true);
});

test("isCompletionStatus returns false for invalid statuses", () => {
  assert.equal(isCompletionStatus("invalid"), false);
  assert.equal(isCompletionStatus(""), false);
  assert.equal(isCompletionStatus(123), false);
});

test("isEvidenceType returns true for valid evidence types", () => {
  assert.equal(isEvidenceType("code_change"), true);
  assert.equal(isEvidenceType("test_result"), true);
  assert.equal(isEvidenceType("documentation"), true);
  assert.equal(isEvidenceType("review_comment"), true);
  assert.equal(isEvidenceType("deployment_record"), true);
  assert.equal(isEvidenceType("api_call"), true);
  assert.equal(isEvidenceType("manual_verification"), true);
});

test("isEvidenceType returns false for invalid evidence types", () => {
  assert.equal(isEvidenceType("invalid"), false);
  assert.equal(isEvidenceType(""), false);
});

// isGateEvidence tests
test("isGateEvidence returns true for valid evidence", () => {
  const evidence: GateEvidence = {
    type: "code_change",
    description: "Added new feature",
    timestamp: Date.now()
  };
  assert.equal(isGateEvidence(evidence), true);
});

test("isGateEvidence returns true for evidence with optional fields", () => {
  const evidence: GateEvidence = {
    type: "test_result",
    description: "All tests passed",
    timestamp: Date.now(),
    source: "CI pipeline",
    payload: { passed: 42, failed: 0 }
  };
  assert.equal(isGateEvidence(evidence), true);
});

test("isGateEvidence returns false for invalid evidence", () => {
  assert.equal(isGateEvidence(null), false);
  assert.equal(isGateEvidence(undefined), false);
  assert.equal(isGateEvidence({}), false);
  assert.equal(isGateEvidence({ type: "invalid" }), false);
  assert.equal(isGateEvidence({ type: "code_change" }), false); // Missing required fields
  assert.equal(isGateEvidence({ type: "code_change", description: "test" }), false); // Missing timestamp
  assert.equal(isGateEvidence({ type: "code_change", description: "test", timestamp: "now" }), false); // timestamp not number
});

// isGateCompletion tests
test("isGateCompletion returns true for valid completion", () => {
  const completion: GateCompletion = {
    gate: "architect",
    status: "approved",
    storyId: "story-123",
    sessionId: "session-abc",
    completedAt: Date.now(),
    evidence: [
      { type: "documentation", description: "API docs updated", timestamp: Date.now() }
    ]
  };
  assert.equal(isGateCompletion(completion), true);
});

test("isGateCompletion returns false for invalid completion", () => {
  assert.equal(isGateCompletion(null), false);
  assert.equal(isGateCompletion(undefined), false);
  assert.equal(isGateCompletion({}), false);
  assert.equal(isGateCompletion({ gate: "invalid" }), false);
  assert.equal(isGateCompletion({ gate: "architect" }), false); // Missing required fields
});

// validateEvidence tests
test("validateEvidence accepts valid evidence", () => {
  const evidence = {
    type: "code_change",
    description: "Added new feature",
    timestamp: Date.now()
  };
  const result = validateEvidence(evidence);
  assert.equal(result.valid, true);
});

test("validateEvidence accepts evidence with optional fields", () => {
  const evidence = {
    type: "test_result",
    description: "All tests passed",
    timestamp: Date.now(),
    source: "CI",
    payload: { count: 10 }
  };
  const result = validateEvidence(evidence);
  assert.equal(result.valid, true);
});

test("validateEvidence rejects null/undefined", () => {
  assert.equal(validateEvidence(null).valid, false);
  assert.equal(validateEvidence(undefined).valid, false);
});

test("validateEvidence rejects missing description", () => {
  const evidence = { type: "code_change", timestamp: Date.now() };
  assert.equal(validateEvidence(evidence).valid, false);
});

test("validateEvidence rejects empty description", () => {
  const evidence = { type: "code_change", description: "", timestamp: Date.now() };
  assert.equal(validateEvidence(evidence).valid, false);
});

test("validateEvidence rejects invalid timestamp", () => {
  const evidence = { type: "code_change", description: "test", timestamp: -1 };
  assert.equal(validateEvidence(evidence).valid, false);
});

test("validateEvidence rejects non-number timestamp", () => {
  const evidence = { type: "code_change", description: "test", timestamp: "now" };
  assert.equal(validateEvidence(evidence).valid, false);
});

test("validateEvidence rejects invalid payload type", () => {
  const evidence = { type: "code_change", description: "test", timestamp: Date.now(), payload: "invalid" };
  assert.equal(validateEvidence(evidence).valid, false);
});

// validateGateCompletion tests
test("validateGateCompletion accepts valid completion", () => {
  const completion = {
    gate: "architect" as Gate,
    status: "approved" as CompletionStatus,
    storyId: "story-123",
    sessionId: "session-abc",
    completedAt: Date.now(),
    evidence: [
      { type: "documentation" as EvidenceType, description: "API docs", timestamp: Date.now() },
      { type: "code_change" as EvidenceType, description: "Added feature", timestamp: Date.now() }
    ]
  };
  const result = validateGateCompletion(completion);
  assert.equal(result.valid, true);
});

test("validateGateCompletion accepts approved with no evidence (for pending)", () => {
  const completion = {
    gate: "implementer" as Gate,
    status: "pending" as CompletionStatus,
    storyId: "story-123",
    sessionId: "session-abc",
    completedAt: Date.now(),
    evidence: []
  };
  const result = validateGateCompletion(completion);
  // Empty evidence is allowed for pending status (before completion)
  assert.equal(result.valid, true);
});

test("validateGateCompletion rejects missing storyId", () => {
  const completion = {
    gate: "architect" as Gate,
    status: "approved" as CompletionStatus,
    sessionId: "session-abc",
    completedAt: Date.now(),
    evidence: [
      { type: "documentation" as EvidenceType, description: "API docs", timestamp: Date.now() }
    ]
  };
  const result = validateGateCompletion(completion);
  assert.equal(result.valid, false);
});

test("validateGateCompletion rejects empty storyId", () => {
  const completion = {
    gate: "architect" as Gate,
    status: "approved" as CompletionStatus,
    storyId: "",
    sessionId: "session-abc",
    completedAt: Date.now(),
    evidence: [
      { type: "documentation" as EvidenceType, description: "API docs", timestamp: Date.now() }
    ]
  };
  const result = validateGateCompletion(completion);
  assert.equal(result.valid, false);
});

test("validateGateCompletion rejects missing sessionId", () => {
  const completion = {
    gate: "architect" as Gate,
    status: "approved" as CompletionStatus,
    storyId: "story-123",
    completedAt: Date.now(),
    evidence: [
      { type: "documentation" as EvidenceType, description: "API docs", timestamp: Date.now() }
    ]
  };
  const result = validateGateCompletion(completion);
  assert.equal(result.valid, false);
});

test("validateGateCompletion rejects invalid completedAt", () => {
  const completion = {
    gate: "architect" as Gate,
    status: "approved" as CompletionStatus,
    storyId: "story-123",
    sessionId: "session-abc",
    completedAt: -1,
    evidence: [
      { type: "documentation" as EvidenceType, description: "API docs", timestamp: Date.now() }
    ]
  };
  const result = validateGateCompletion(completion);
  assert.equal(result.valid, false);
});

test("validateGateCompletion rejects empty evidence for non-pending status", () => {
  const completion = {
    gate: "architect" as Gate,
    status: "approved" as CompletionStatus,
    storyId: "story-123",
    sessionId: "session-abc",
    completedAt: Date.now(),
    evidence: []
  };
  const result = validateGateCompletion(completion);
  assert.equal(result.valid, false);
});

test("validateGateCompletion rejects insufficient evidence count", () => {
  const completion = {
    gate: "architect" as Gate,
    status: "approved" as CompletionStatus,
    storyId: "story-123",
    sessionId: "session-abc",
    completedAt: Date.now(),
    evidence: [
      { type: "documentation" as EvidenceType, description: "API docs", timestamp: Date.now() }
    ]
  };
  const result = validateGateCompletion(completion);
  assert.equal(result.valid, false);
  assert.ok(result.valid === false && "error" in result && (result as { error: string }).error.includes("requires at least 2 evidence items"));
});

test("validateGateCompletion rejects missing required evidence types", () => {
  const completion = {
    gate: "implementer" as Gate,
    status: "approved" as CompletionStatus,
    storyId: "story-123",
    sessionId: "session-abc",
    completedAt: Date.now(),
    evidence: [
      { type: "documentation" as EvidenceType, description: "API docs", timestamp: Date.now() },
      { type: "documentation" as EvidenceType, description: "README", timestamp: Date.now() }
    ]
  };
  const result = validateGateCompletion(completion);
  assert.equal(result.valid, false);
  assert.ok(result.valid === false && "error" in result && (result as { error: string }).error.includes("requires evidence types"));
});

test("validateGateCompletion requires reviewerNotes for rejected status", () => {
  const completion = {
    gate: "architect" as Gate,
    status: "rejected" as CompletionStatus,
    storyId: "story-123",
    sessionId: "session-abc",
    completedAt: Date.now(),
    evidence: [
      { type: "documentation" as EvidenceType, description: "API docs", timestamp: Date.now() },
      { type: "code_change" as EvidenceType, description: "Code", timestamp: Date.now() }
    ]
  };
  const result = validateGateCompletion(completion);
  assert.equal(result.valid, false);
  assert.ok(result.valid === false && "error" in result && (result as { error: string }).error.includes("reviewerNotes required"));
});

test("validateGateCompletion requires reviewerNotes for needs_revision status", () => {
  const completion = {
    gate: "architect" as Gate,
    status: "needs_revision" as CompletionStatus,
    storyId: "story-123",
    sessionId: "session-abc",
    completedAt: Date.now(),
    evidence: [
      { type: "documentation" as EvidenceType, description: "API docs", timestamp: Date.now() },
      { type: "code_change" as EvidenceType, description: "Code", timestamp: Date.now() }
    ]
  };
  const result = validateGateCompletion(completion);
  assert.equal(result.valid, false);
  assert.ok(result.valid === false && "error" in result && (result as { error: string }).error.includes("reviewerNotes required"));
});

// Helper function tests
test("getGateRequirements returns correct requirements", () => {
  const req = getGateRequirements("architect");
  assert.equal(req.requiredEvidence.includes("documentation"), true);
  assert.equal(req.requiredEvidence.includes("code_change"), true);
  assert.equal(req.minEvidenceCount, 2);
});

test("canAutoApprove returns true when requirements met for auto-approve gate", () => {
  const evidence: GateEvidence[] = [
    { type: "code_change", description: "Code change", timestamp: Date.now() },
    { type: "test_result", description: "Tests passed", timestamp: Date.now() }
  ];
  // implementer has autoApproveOnComplete: true
  assert.equal(canAutoApprove("implementer", evidence), true);
});

test("canAutoApprove returns false when requirements not met", () => {
  const evidence: GateEvidence[] = [
    { type: "documentation", description: "Docs", timestamp: Date.now() }
  ];
  // implementer requires code_change + test_result
  assert.equal(canAutoApprove("implementer", evidence), false);
});

test("canAutoApprove returns false for gates without autoApprove", () => {
  const evidence: GateEvidence[] = [
    { type: "documentation", description: "Docs", timestamp: Date.now() },
    { type: "code_change", description: "Code", timestamp: Date.now() }
  ];
  // architect does not have autoApproveOnComplete
  assert.equal(canAutoApprove("architect", evidence), false);
});

// createGateCompletion tests
test("createGateCompletion creates valid completion", () => {
  const evidence: GateEvidence[] = [
    { type: "code_change", description: "Feature added", timestamp: Date.now() }
  ];
  const completion = createGateCompletion("architect", "story-123", "session-abc", "approved", evidence);
  
  assert.equal(completion.gate, "architect");
  assert.equal(completion.status, "approved");
  assert.equal(completion.storyId, "story-123");
  assert.equal(completion.sessionId, "session-abc");
  assert.equal(completion.evidence.length, 1);
  assert.equal(typeof completion.completedAt, "number");
});

test("createGateCompletion with optional fields", () => {
  const evidence: GateEvidence[] = [
    { type: "code_change", description: "Feature added", timestamp: Date.now() }
  ];
  const completion = createGateCompletion(
    "architect", 
    "story-123", 
    "session-abc", 
    "rejected", 
    evidence,
    { reviewerNotes: "Needs work", metadata: { reviewer: "john" } }
  );
  
  assert.equal(completion.reviewerNotes, "Needs work");
  assert.deepEqual(completion.metadata, { reviewer: "john" });
});

// createGateEvidence tests
test("createGateEvidence creates valid evidence", () => {
  const evidence = createGateEvidence("code_change", "Added new endpoint");
  
  assert.equal(evidence.type, "code_change");
  assert.equal(evidence.description, "Added new endpoint");
  assert.equal(typeof evidence.timestamp, "number");
});

test("createGateEvidence with optional fields", () => {
  const evidence = createGateEvidence("test_result", "All tests passed", { 
    source: "CI", 
    payload: { passed: 100 } 
  });
  
  assert.equal(evidence.source, "CI");
  assert.deepEqual(evidence.payload, { passed: 100 });
});
