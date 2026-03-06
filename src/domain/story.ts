// Story domain types and validation
// MC2-E1-S1: Story type definition with required metadata rules

import { isUuid, version } from "@/domain/utils/uuid";

export const STORY_STATUSES = ["draft", "pending_approval", "approved", "active", "completed", "archived", "blocked"] as const;
export type StoryStatus = (typeof STORY_STATUSES)[number];

/**
 * Story metadata required for dispatch precondition
 */
export interface StoryMetadata {
  /** Title of the story */
  title: string;
  /** Description of what the story accomplishes */
  description: string;
  /** Requirements artifact ID - must be approved before dispatch */
  requirementsArtifactId?: string;
  /** Whether the requirements artifact has been approved */
  approvedRequirementsArtifact: boolean;
  /** Acceptance criteria for story completion */
  acceptanceCriteria?: string[];
  /** Priority level: low, medium, high, critical */
  priority?: "low" | "medium" | "high" | "critical";
}

/**
 * Core Story entity
 */
export interface Story {
  id: string;
  status: StoryStatus;
  metadata: StoryMetadata;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Input for creating a new story
 */
export interface CreateStoryInput {
  title: string;
  description: string;
  requirementsArtifactId?: string;
  acceptanceCriteria?: string[];
  priority?: "low" | "medium" | "high" | "critical";
}

// Type guard for StoryStatus
export function isStoryStatus(value: unknown): value is StoryStatus {
  return typeof value === "string" && STORY_STATUSES.includes(value as StoryStatus);
}

// Validation errors
export interface StoryValidationError {
  field: string;
  message: string;
}

/**
 * Validates a CreateStoryInput
 */
export function validateStoryInput(input: unknown): { valid: true } | { valid: false; errors: StoryValidationError[] } {
  const errors: StoryValidationError[] = [];

  if (typeof input !== "object" || input === null) {
    return { valid: false, errors: [{ field: "root", message: "Input must be an object" }] };
  }

  const obj = input as Record<string, unknown>;

  // Required: title
  if (typeof obj.title !== "string" || obj.title.trim().length === 0) {
    errors.push({ field: "title", message: "title is required and must be a non-empty string" });
  }

  // Required: description
  if (typeof obj.description !== "string" || obj.description.trim().length === 0) {
    errors.push({ field: "description", message: "description is required and must be a non-empty string" });
  }

  // Optional: requirementsArtifactId - should be valid UUID if provided
  if (obj.requirementsArtifactId !== undefined && obj.requirementsArtifactId !== null) {
    if (typeof obj.requirementsArtifactId !== "string" || !isUuid(obj.requirementsArtifactId)) {
      errors.push({ field: "requirementsArtifactId", message: "requirementsArtifactId must be a valid UUID if provided" });
    }
  }

  // Optional: acceptanceCriteria - must be array of strings if provided
  if (obj.acceptanceCriteria !== undefined) {
    if (!Array.isArray(obj.acceptanceCriteria)) {
      errors.push({ field: "acceptanceCriteria", message: "acceptanceCriteria must be an array" });
    } else {
      obj.acceptanceCriteria.forEach((item, index) => {
        if (typeof item !== "string") {
          errors.push({ field: `acceptanceCriteria[${index}]`, message: "each acceptance criteria must be a string" });
        }
      });
    }
  }

  // Optional: priority - must be valid value
  if (obj.priority !== undefined) {
    const validPriorities = ["low", "medium", "high", "critical"];
    if (typeof obj.priority !== "string" || !validPriorities.includes(obj.priority)) {
      errors.push({ field: "priority", message: "priority must be one of: low, medium, high, critical" });
    }
  }

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  return { valid: true };
}

/**
 * Validates that a story can be dispatched (has approved requirements artifact)
 */
export function validateDispatchPreconditions(story: Story): { valid: true; story: Story } | { valid: false; error: string } {
  // Check if story has approved requirements artifact
  if (!story.metadata.approvedRequirementsArtifact) {
    return {
      valid: false,
      error: `Story "${story.id}" cannot be dispatched: requirements artifact not approved. Provide approvedRequirementsArtifact: true.`
    };
  }

  return { valid: true, story };
}

/**
 * Creates a new Story from input (generates ID and timestamps)
 */
export function createStory(input: CreateStoryInput): Story {
  const now = new Date();
  
  return {
    id: generateStoryId(),
    status: "draft",
    metadata: {
      title: input.title.trim(),
      description: input.description.trim(),
      requirementsArtifactId: input.requirementsArtifactId,
      approvedRequirementsArtifact: false, // Default to false, must be explicitly approved
      acceptanceCriteria: input.acceptanceCriteria,
      priority: input.priority ?? "medium"
    },
    createdAt: now,
    updatedAt: now
  };
}

/**
 * Simple ID generator (prefix + timestamp + random)
 */
function generateStoryId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `story_${timestamp}_${random}`;
}
