import { Gate, GATES, StoryState, StoryStatus } from "../domain/workflow-types.js";

/**
 * Story represents a task/feature in the mission control system.
 * Stories transition through gates with preconditions for each dispatch.
 */
export type Story = {
  id: string;
  title: string;
  description?: string;
  status: StoryStatus;
  createdAt: number;
  updatedAt: number;
  completedGates: Gate[];
};

/**
 * Dispatch preconditions for a story -> gate transition
 */
export type DispatchPrecondition = {
  satisfied: boolean;
  reason?: string;
};

/**
 * Validate dispatch preconditions for a story targeting a specific gate.
 * 
 * Preconditions:
 * 1. Story must exist
 * 2. Story must be in 'created' state (initial dispatch)
 * 3. Gate must be valid
 * 4. For subsequent gates, previous gate must be completed
 */
export function validateDispatchPreconditions(
  story: Story,
  targetGate: Gate
): DispatchPrecondition {
  // Precondition 1: Story must be in 'created' state for initial dispatch
  if (story.status.state !== "created") {
    return {
      satisfied: false,
      reason: `Story must be in 'created' state for dispatch, current state: ${story.status.state}`
    };
  }

  // Precondition 2: Gate must be valid (first gate must be 'architect')
  if (targetGate !== "architect") {
    return {
      satisfied: false,
      reason: `Initial dispatch must target 'architect' gate, got: ${targetGate}`
    };
  }

  // Precondition 3: No previous gates should be completed for initial dispatch
  if (story.completedGates.length > 0) {
    return {
      satisfied: false,
      reason: "Story already has completed gates, cannot dispatch from created state"
    };
  }

  return { satisfied: true };
}

/**
 * Validate gate progression preconditions (for dispatch after first gate)
 */
export function validateGateProgression(
  story: Story,
  targetGate: Gate
): DispatchPrecondition {
  const currentGate = story.status.gate;
  
  // Must be in_progress with a current gate
  if (story.status.state !== "in_progress" || !currentGate) {
    return {
      satisfied: false,
      reason: `Story must be in_progress with an active gate for progression, current state: ${story.status.state}, gate: ${currentGate || 'none'}`
    };
  }

  // Target gate must be next in sequence
  const currentIdx = GATES.indexOf(currentGate);
  const targetIdx = GATES.indexOf(targetGate);
  
  if (targetIdx !== currentIdx + 1) {
    return {
      satisfied: false,
      reason: `Invalid gate progression: must go from ${currentGate} to ${GATES[currentIdx + 1]}, got: ${targetGate}`
    };
  }

  // Previous gate must be in completedGates
  if (!story.completedGates.includes(currentGate)) {
    return {
      satisfied: false,
      reason: `Previous gate ${currentGate} must be completed before progressing to ${targetGate}`
    };
  }

  return { satisfied: true };
}

/**
 * Create a new story
 */
export function createStory(
  id: string,
  title: string,
  description?: string
): Story {
  const now = Date.now();
  return {
    id,
    title,
    description,
    status: { state: "created" },
    createdAt: now,
    updatedAt: now,
    completedGates: []
  };
}
