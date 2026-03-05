// Stories API v1 - pure handlers with in-memory store
// MC2-E1-S2: API slice for story create/list operations

import {
  Story,
  CreateStoryInput,
  validateStoryInput,
  validateDispatchPreconditions,
  createStory
} from "../../domain/story.js";

// In-memory store (temporary - will be replaced with persistent storage)
const storiesStore: Map<string, Story> = new Map();

/**
 * Request body for creating a story
 */
export interface CreateStoryRequest {
  title: string;
  description: string;
  requirementsArtifactId?: string;
  acceptanceCriteria?: string[];
  priority?: "low" | "medium" | "high" | "critical";
  // Note: approvedRequirementsArtifact cannot be set directly via API
  // It must be set through a separate approval workflow
}

/**
 * Response for create story
 */
export interface CreateStoryResponse {
  success: boolean;
  story?: Story;
  error?: string;
  validationErrors?: Array<{ field: string; message: string }>;
}

/**
 * Response for list stories
 */
export interface ListStoriesResponse {
  success: boolean;
  stories: Story[];
  count: number;
}

/**
 * Create a new story
 * Enforces required metadata and approvedRequirementsArtifact validation
 */
export function createStoryHandler(request: unknown): CreateStoryResponse {
  // Validate input
  const validation = validateStoryInput(request);
  if (!validation.valid) {
    return {
      success: false,
      error: "Validation failed",
      validationErrors: validation.errors
    };
  }

  const input = request as CreateStoryInput;

  // Create the story
  const story = createStory(input);

  // Store in memory
  storiesStore.set(story.id, story);

  return {
    success: true,
    story
  };
}

/**
 * List all stories
 */
export function listStoriesHandler(): ListStoriesResponse {
  const stories = Array.from(storiesStore.values());
  return {
    success: true,
    stories,
    count: stories.length
  };
}

/**
 * Get a story by ID
 */
export function getStoryHandler(id: string): { success: boolean; story?: Story; error?: string } {
  const story = storiesStore.get(id);
  
  if (!story) {
    return {
      success: false,
      error: `Story not found: ${id}`
    };
  }

  return {
    success: true,
    story
  };
}

/**
 * Approve requirements artifact for a story
 * This is the only way to set approvedRequirementsArtifact to true
 */
export function approveRequirementsArtifactHandler(
  storyId: string
): { success: boolean; story?: Story; error?: string } {
  const story = storiesStore.get(storyId);

  if (!story) {
    return {
      success: false,
      error: `Story not found: ${storyId}`
    };
  }

  // Update the story
  const updatedStory: Story = {
    ...story,
    metadata: {
      ...story.metadata,
      approvedRequirementsArtifact: true
    },
    updatedAt: new Date()
  };

  storiesStore.set(storyId, updatedStory);

  return {
    success: true,
    story: updatedStory
  };
}

/**
 * Dispatch precondition check
 * Validates that a story can be dispatched
 */
export function checkDispatchPreconditions(
  storyId: string
): { valid: true; story: Story } | { valid: false; error: string } {
  const story = storiesStore.get(storyId);

  if (!story) {
    return {
      valid: false,
      error: `Story not found: ${storyId}`
    };
  }

  return validateDispatchPreconditions(story);
}

/**
 * Reset store (for testing)
 */
export function resetStoriesStore(): void {
  storiesStore.clear();
}

/**
 * Get store size (for testing)
 */
export function getStoriesStoreSize(): number {
  return storiesStore.size;
}
