// Gate completion schema and evidence validators
// MC2-E6-S1: Gate completion schema and evidence validators

import { Gate, GATES } from "./workflow-types.js";

// Re-export Gate for convenience
export { Gate, GATES };

// Gate completion status types
export const COMPLETION_STATUSES = ["pending", "approved", "rejected", "needs_revision"] as const;
export type CompletionStatus = (typeof COMPLETION_STATUSES)[number];

// Evidence types that can be provided for gate completion
export const EVIDENCE_TYPES = [
  "code_change",
  "test_result",
  "documentation",
  "review_comment",
  "deployment_record",
  "api_call",
  "manual_verification"
] as const;
export type EvidenceType = (typeof EVIDENCE_TYPES)[number];

// Gate completion record
export type GateCompletion = {
  gate: Gate;
  status: CompletionStatus;
  storyId: string;
  sessionId: string;
  completedAt: number;
  evidence: GateEvidence[];
  reviewerNotes?: string;
  metadata?: Record<string, unknown>;
};

export type GateEvidence = {
  type: EvidenceType;
  description: string;
  timestamp: number;
  source?: string;
  payload?: Record<string, unknown>;
};

// Gate-specific completion requirements
export type GateRequirements = {
  requiredEvidence: EvidenceType[];
  minEvidenceCount: number;
  allowManualOverride: boolean;
  autoApproveOnComplete?: boolean;
};

// Default requirements for each gate
export const GATE_REQUIREMENTS: Record<Gate, GateRequirements> = {
  architect: {
    requiredEvidence: ["documentation", "code_change"],
    minEvidenceCount: 2,
    allowManualOverride: true,
    autoApproveOnComplete: false
  },
  implementer: {
    requiredEvidence: ["code_change", "test_result"],
    minEvidenceCount: 2,
    allowManualOverride: false,
    autoApproveOnComplete: true
  },
  "reviewer-a": {
    requiredEvidence: ["review_comment", "test_result"],
    minEvidenceCount: 2,
    allowManualOverride: true,
    autoApproveOnComplete: false
  },
  operator: {
    requiredEvidence: ["deployment_record"],
    minEvidenceCount: 1,
    allowManualOverride: false,
    autoApproveOnComplete: true
  },
  "reviewer-b": {
    requiredEvidence: ["review_comment", "manual_verification"],
    minEvidenceCount: 2,
    allowManualOverride: true,
    autoApproveOnComplete: false
  }
};

// Type guard functions

export function isGate(value: unknown): value is Gate {
  return typeof value === "string" && GATES.includes(value as Gate);
}

export function isCompletionStatus(value: unknown): value is CompletionStatus {
  return typeof value === "string" && COMPLETION_STATUSES.includes(value as CompletionStatus);
}

export function isEvidenceType(value: unknown): value is EvidenceType {
  return typeof value === "string" && EVIDENCE_TYPES.includes(value as EvidenceType);
}

export function isGateCompletion(value: unknown): value is GateCompletion {
  if (typeof value !== "object" || value === null) return false;
  const obj = value as Record<string, unknown>;
  
  if (!isGate(obj.gate)) return false;
  if (!isCompletionStatus(obj.status)) return false;
  if (typeof obj.storyId !== "string") return false;
  if (typeof obj.sessionId !== "string") return false;
  if (typeof obj.completedAt !== "number") return false;
  if (!Array.isArray(obj.evidence)) return false;
  
  // Validate each evidence item
  for (const evidence of obj.evidence) {
    if (!isGateEvidence(evidence)) return false;
  }
  
  // Optional fields
  if (obj.reviewerNotes !== undefined && typeof obj.reviewerNotes !== "string") return false;
  if (obj.metadata !== undefined && (typeof obj.metadata !== "object" || obj.metadata === null)) return false;
  
  return true;
}

export function isGateEvidence(value: unknown): value is GateEvidence {
  if (typeof value !== "object" || value === null) return false;
  const obj = value as Record<string, unknown>;
  
  if (!isEvidenceType(obj.type)) return false;
  if (typeof obj.description !== "string") return false;
  if (typeof obj.timestamp !== "number") return false;
  
  // Optional fields
  if (obj.source !== undefined && typeof obj.source !== "string") return false;
  if (obj.payload !== undefined && (typeof obj.payload !== "object" || obj.payload === null)) return false;
  
  return true;
}

// Validation functions

export function validateGateCompletion(completion: unknown): 
  { valid: true } | { valid: false; error: string } {
  
  if (!isGateCompletion(completion)) {
    return { valid: false, error: "Invalid gate completion: missing or invalid required fields" };
  }
  
  const c = completion as GateCompletion;
  
  // Validate storyId
  if (!c.storyId || c.storyId.trim() === "") {
    return { valid: false, error: "Invalid gate completion: storyId is required and must be a non-empty string" };
  }
  
  // Validate sessionId
  if (!c.sessionId || c.sessionId.trim() === "") {
    return { valid: false, error: "Invalid gate completion: sessionId is required and must be a non-empty string" };
  }
  
  // Validate completedAt is a valid timestamp
  if (typeof c.completedAt !== "number" || c.completedAt <= 0) {
    return { valid: false, error: "Invalid gate completion: completedAt must be a positive number" };
  }
  
  // Validate evidence array - empty allowed only for pending status
  if (!Array.isArray(c.evidence)) {
    return { valid: false, error: "Invalid gate completion: evidence must be an array" };
  }
  
  // Empty evidence is allowed only for pending status
  if (c.evidence.length === 0 && c.status !== "pending") {
    return { valid: false, error: "Invalid gate completion: evidence must be a non-empty array" };
  }
  
  // Validate each evidence item
  for (let i = 0; i < c.evidence.length; i++) {
    if (!isGateEvidence(c.evidence[i])) {
      return { valid: false, error: `Invalid gate completion: evidence[${i}] is invalid` };
    }
  }
  
  // Skip requirements validation for pending status
  if (c.status === "pending") {
    return { valid: true };
  }
  
  // Validate against gate requirements
  const requirements = GATE_REQUIREMENTS[c.gate];
  
  if (c.evidence.length < requirements.minEvidenceCount) {
    return { valid: false,
      error: `Invalid gate completion: ${c.gate} requires at least ${requirements.minEvidenceCount} evidence items, got ${c.evidence.length}` 
    };
  }
  
  // Check for required evidence types
  const evidenceTypes = c.evidence.map(e => e.type);
  const missingTypes = requirements.requiredEvidence.filter(t => !evidenceTypes.includes(t));
  
  if (missingTypes.length > 0) {
    return { 
      valid: false, 
      error: `Invalid gate completion: ${c.gate} requires evidence types: ${missingTypes.join(", ")}` 
    };
  }
  
  // Validate reviewerNotes if status is rejected or needs_revision
  if ((c.status === "rejected" || c.status === "needs_revision") && !c.reviewerNotes) {
    return { valid: false, error: "Invalid gate completion: reviewerNotes required for rejected or needs_revision status" };
  }
  
  return { valid: true };
}

export function validateEvidence(evidence: unknown): 
  { valid: true } | { valid: false; error: string } {
  
  if (!isGateEvidence(evidence)) {
    return { valid: false, error: "Invalid evidence: missing or invalid required fields" };
  }
  
  const e = evidence as GateEvidence;
  
  // Validate description
  if (!e.description || e.description.trim() === "") {
    return { valid: false, error: "Invalid evidence: description is required and must be a non-empty string" };
  }
  
  // Validate timestamp
  if (typeof e.timestamp !== "number" || e.timestamp <= 0) {
    return { valid: false, error: "Invalid evidence: timestamp must be a positive number" };
  }
  
  // Validate optional payload
  if (e.payload !== undefined) {
    if (typeof e.payload !== "object" || e.payload === null) {
      return { valid: false, error: "Invalid evidence: payload must be an object if provided" };
    }
  }
  
  return { valid: true };
}

// Helper functions

export function getGateRequirements(gate: Gate): GateRequirements {
  return GATE_REQUIREMENTS[gate];
}

export function canAutoApprove(gate: Gate, evidence: GateEvidence[]): boolean {
  const requirements = GATE_REQUIREMENTS[gate];
  
  if (!requirements.autoApproveOnComplete) {
    return false;
  }
  
  // Check minimum evidence count
  if (evidence.length < requirements.minEvidenceCount) {
    return false;
  }
  
  // Check required evidence types
  const evidenceTypes = evidence.map(e => e.type);
  const hasAllRequired = requirements.requiredEvidence.every(t => evidenceTypes.includes(t));
  
  return hasAllRequired;
}

export function createGateCompletion(
  gate: Gate,
  storyId: string,
  sessionId: string,
  status: CompletionStatus,
  evidence: GateEvidence[],
  options?: { reviewerNotes?: string; metadata?: Record<string, unknown> }
): GateCompletion {
  return {
    gate,
    status,
    storyId,
    sessionId,
    completedAt: Date.now(),
    evidence,
    reviewerNotes: options?.reviewerNotes,
    metadata: options?.metadata
  };
}

export function createGateEvidence(
  type: EvidenceType,
  description: string,
  options?: { source?: string; payload?: Record<string, unknown> }
): GateEvidence {
  return {
    type,
    description,
    timestamp: Date.now(),
    source: options?.source,
    payload: options?.payload
  };
}
