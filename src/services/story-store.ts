import type { Story } from "../domain/story.js";

/**
 * In-memory store for stories.
 * In production, this would be backed by a database.
 */
type StoryStore = Map<string, Story>;

/**
 * Singleton story store for the application.
 */
class StoryStoreImpl {
  private stories: StoryStore = new Map();

  /**
   * Get a story by ID
   */
  get(id: string): Story | undefined {
    return this.stories.get(id);
  }

  /**
   * Set a story (create or update)
   */
  set(story: Story): void {
    this.stories.set(story.id, story);
  }

  /**
   * Delete a story by ID
   */
  delete(id: string): boolean {
    return this.stories.delete(id);
  }

  /**
   * Check if a story exists
   */
  has(id: string): boolean {
    return this.stories.has(id);
  }

  /**
   * Get all stories
   */
  getAll(): Story[] {
    return Array.from(this.stories.values());
  }

  /**
   * Clear all stories (for testing)
   */
  clear(): void {
    this.stories.clear();
  }
}

/**
 * Global story store instance
 */
export const storyStore = new StoryStoreImpl();

/**
 * Get a story by ID (convenience function)
 */
export function getStoryById(id: string): Story | undefined {
  return storyStore.get(id);
}

/**
 * Get all stories (convenience function)
 */
export function getStories(): Story[] {
  return storyStore.getAll();
}

/**
 * Create or update a story (convenience function)
 */
export function saveStory(story: Story): void {
  storyStore.set(story);
}

/**
 * Delete a story by ID (convenience function)
 */
export function deleteStory(id: string): boolean {
  return storyStore.delete(id);
}
