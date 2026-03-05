// Runtime signal types for session lifecycle management
// MC2-E4-S1: Runtime event type guards

export const RUNTIME_EVENTS = [
  "started",
  "heartbeat",
  "completed",
  "failed",
  "timed_out",
  "canceled"
] as const;

export type RuntimeEventType = (typeof RUNTIME_EVENTS)[number];

export type RuntimeSignal =
  | { type: "started"; storyId: string; sessionId: string }
  | { type: "heartbeat"; storyId: string; sessionId: string }
  | { type: "completed"; storyId: string; sessionId: string; result?: unknown }
  | { type: "failed"; storyId: string; sessionId: string; error?: string }
  | { type: "timed_out"; storyId: string; sessionId: string; reason?: string }
  | { type: "canceled"; storyId: string; sessionId: string; reason?: string };

// Type guard functions for runtime events
export function isRuntimeSignal(value: unknown): value is RuntimeSignal {
  if (typeof value !== "object" || value === null) return false;
  const obj = value as Record<string, unknown>;
  if (typeof obj.type !== "string") return false;
  if (!RUNTIME_EVENTS.includes(obj.type as RuntimeEventType)) return false;
  
  // Also validate required fields are present and correct type
  if (typeof obj.storyId !== "string" || typeof obj.sessionId !== "string") {
    return false;
  }
  
  return true;
}

export function isStarted(value: unknown): value is { type: "started"; storyId: string; sessionId: string } {
  return isRuntimeSignal(value) && value.type === "started";
}

export function isHeartbeat(value: unknown): value is { type: "heartbeat"; storyId: string; sessionId: string } {
  return isRuntimeSignal(value) && value.type === "heartbeat";
}

export function isCompleted(value: unknown): value is { type: "completed"; storyId: string; sessionId: string; result?: unknown } {
  return isRuntimeSignal(value) && value.type === "completed";
}

export function isFailed(value: unknown): value is { type: "failed"; storyId: string; sessionId: string; error?: string } {
  return isRuntimeSignal(value) && value.type === "failed";
}

export function isTimedOut(value: unknown): value is { type: "timed_out"; storyId: string; sessionId: string; reason?: string } {
  return isRuntimeSignal(value) && value.type === "timed_out";
}

export function isCanceled(value: unknown): value is { type: "canceled"; storyId: string; sessionId: string; reason?: string } {
  return isRuntimeSignal(value) && value.type === "canceled";
}

// Validation functions for runtime signals
export function validateRuntimeSignal(payload: unknown): { valid: true } | { valid: false; error: string } {
  if (!isRuntimeSignal(payload)) {
    return { valid: false, error: "Invalid runtime signal: missing or invalid type" };
  }

  const signal = payload as RuntimeSignal;

  // Validate required fields based on type
  if (!signal.storyId || typeof signal.storyId !== "string") {
    return { valid: false, error: "Invalid runtime signal: storyId is required and must be a string" };
  }

  if (!signal.sessionId || typeof signal.sessionId !== "string") {
    return { valid: false, error: "Invalid runtime signal: sessionId is required and must be a string" };
  }

  // Type-specific validation
  switch (signal.type) {
    case "failed":
      if (signal.error !== undefined && typeof signal.error !== "string") {
        return { valid: false, error: "Invalid runtime signal: error must be a string if provided" };
      }
      break;
    case "timed_out":
    case "canceled":
      if (signal.reason !== undefined && typeof signal.reason !== "string") {
        return { valid: false, error: "Invalid runtime signal: reason must be a string if provided" };
      }
      break;
    case "completed":
      // result can be any type, no validation needed
      break;
    case "started":
    case "heartbeat":
      // No additional fields to validate
      break;
  }

  return { valid: true };
}
