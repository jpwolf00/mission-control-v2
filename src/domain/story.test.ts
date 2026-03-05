// Story domain tests
// MC2-E1-S1: Test Story type, validation, and dispatch preconditions

import { describe, it, beforeEach } from "node:test";
import assert from "node:assert";
import {
  validateStoryInput,
  validateDispatchPreconditions,
  createStory,
  Story,
  CreateStoryInput
} from "./story.js";
import { resetStoriesStore, approveRequirementsArtifactHandler, checkDispatchPreconditions, createStoryHandler, listStoriesHandler } from "../api/v1/stories.js";

describe("Story Domain", () => {
  beforeEach(() => {
    resetStoriesStore();
  });

  describe("validateStoryInput", () => {
    it("should reject non-object input", () => {
      const result = validateStoryInput("not an object");
      assert.strictEqual(result.valid, false);
      assert.ok(result.errors.some(e => e.field === "root"));
    });

    it("should reject null input", () => {
      const result = validateStoryInput(null);
      assert.strictEqual(result.valid, false);
    });

    it("should reject missing title", () => {
      const result = validateStoryInput({ description: "Test description" });
      assert.strictEqual(result.valid, false);
      assert.ok(result.errors.some(e => e.field === "title"));
    });

    it("should reject empty title", () => {
      const result = validateStoryInput({ title: "   ", description: "Test" });
      assert.strictEqual(result.valid, false);
      assert.ok(result.errors.some(e => e.field === "title"));
    });

    it("should reject missing description", () => {
      const result = validateStoryInput({ title: "Test Title" });
      assert.strictEqual(result.valid, false);
      assert.ok(result.errors.some(e => e.field === "description"));
    });

    it("should reject invalid requirementsArtifactId", () => {
      const result = validateStoryInput({
        title: "Test",
        description: "Test desc",
        requirementsArtifactId: "not-a-uuid"
      });
      assert.strictEqual(result.valid, false);
      assert.ok(result.errors.some(e => e.field === "requirementsArtifactId"));
    });

    it("should accept valid requirementsArtifactId", () => {
      const result = validateStoryInput({
        title: "Test",
        description: "Test desc",
        requirementsArtifactId: "123e4567-e89b-12d3-a456-426614174000"
      });
      assert.strictEqual(result.valid, true);
    });

    it("should reject non-string acceptance criteria items", () => {
      const result = validateStoryInput({
        title: "Test",
        description: "Test desc",
        acceptanceCriteria: ["valid", 123, "also valid"]
      });
      assert.strictEqual(result.valid, false);
      assert.ok(result.errors.some(e => e.field === "acceptanceCriteria[1]"));
    });

    it("should reject invalid priority", () => {
      const result = validateStoryInput({
        title: "Test",
        description: "Test desc",
        priority: "super-urgent"
      });
      assert.strictEqual(result.valid, false);
      assert.ok(result.errors.some(e => e.field === "priority"));
    });

    it("should accept valid complete input", () => {
      const result = validateStoryInput({
        title: "Test Story",
        description: "Test description",
        requirementsArtifactId: "123e4567-e89b-12d3-a456-426614174000",
        acceptanceCriteria: ["Criterion 1", "Criterion 2"],
        priority: "high"
      });
      assert.strictEqual(result.valid, true);
    });

    it("should accept minimal valid input", () => {
      const result = validateStoryInput({
        title: "Minimal Story",
        description: "Minimal description"
      });
      assert.strictEqual(result.valid, true);
    });
  });

  describe("createStory", () => {
    it("should create story with generated id", () => {
      const input: CreateStoryInput = {
        title: "Test Story",
        description: "Test description"
      };
      const story = createStory(input);
      
      assert.ok(story.id.startsWith("story_"));
      assert.strictEqual(story.status, "draft");
      assert.strictEqual(story.metadata.title, "Test Story");
      assert.strictEqual(story.metadata.description, "Test description");
      assert.strictEqual(story.metadata.approvedRequirementsArtifact, false);
    });

    it("should set default priority to medium", () => {
      const input: CreateStoryInput = {
        title: "Test",
        description: "Test"
      };
      const story = createStory(input);
      assert.strictEqual(story.metadata.priority, "medium");
    });

    it("should preserve provided priority", () => {
      const input: CreateStoryInput = {
        title: "Test",
        description: "Test",
        priority: "critical"
      };
      const story = createStory(input);
      assert.strictEqual(story.metadata.priority, "critical");
    });
  });

  describe("validateDispatchPreconditions", () => {
    it("should reject story without approved requirements artifact", () => {
      const story: Story = {
        id: "test-1",
        status: "draft",
        metadata: {
          title: "Test",
          description: "Test",
          approvedRequirementsArtifact: false
        },
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const result = validateDispatchPreconditions(story);
      assert.strictEqual(result.valid, false);
      assert.ok(result.error.includes("cannot be dispatched"));
    });

    it("should accept story with approved requirements artifact", () => {
      const story: Story = {
        id: "test-1",
        status: "draft",
        metadata: {
          title: "Test",
          description: "Test",
          approvedRequirementsArtifact: true
        },
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const result = validateDispatchPreconditions(story);
      assert.strictEqual(result.valid, true);
    });
  });
});

describe("Stories API", () => {
  beforeEach(() => {
    resetStoriesStore();
  });

  describe("createStoryHandler", () => {
    it("should create a story from valid input", () => {
      const result = createStoryHandler({
        title: "API Test Story",
        description: "Created via API"
      });

      assert.strictEqual(result.success, true);
      assert.ok(result.story);
      assert.strictEqual(result.story!.metadata.title, "API Test Story");
    });

    it("should return validation errors for invalid input", () => {
      const result = createStoryHandler({
        title: "",
        description: ""
      });

      assert.strictEqual(result.success, false);
      assert.ok(result.validationErrors);
      assert.ok(result.validationErrors!.length > 0);
    });
  });

  describe("listStoriesHandler", () => {
    it("should return empty array when no stories", () => {
      const result = listStoriesHandler();
      assert.strictEqual(result.success, true);
      assert.strictEqual(result.count, 0);
      assert.deepStrictEqual(result.stories, []);
    });

    it("should return all created stories", () => {
      createStoryHandler({ title: "Story 1", description: "Desc 1" });
      createStoryHandler({ title: "Story 2", description: "Desc 2" });

      const result = listStoriesHandler();
      assert.strictEqual(result.count, 2);
    });
  });

  describe("approveRequirementsArtifactHandler", () => {
    it("should approve requirements artifact", () => {
      const createResult = createStoryHandler({
        title: "Test",
        description: "Test"
      });
      const storyId = createResult.story!.id;

      const approveResult = approveRequirementsArtifactHandler(storyId);
      
      assert.strictEqual(approveResult.success, true);
      assert.strictEqual(approveResult.story!.metadata.approvedRequirementsArtifact, true);
    });

    it("should return error for non-existent story", () => {
      const result = approveRequirementsArtifactHandler("non-existent-id");
      assert.strictEqual(result.success, false);
      assert.ok(result.error);
    });
  });

  describe("checkDispatchPreconditions", () => {
    it("should reject story without approved requirements", () => {
      const createResult = createStoryHandler({
        title: "Test",
        description: "Test"
      });
      const storyId = createResult.story!.id;

      const result = checkDispatchPreconditions(storyId);
      
      assert.strictEqual(result.valid, false);
      assert.ok(result.error.includes("cannot be dispatched"));
    });

    it("should accept story with approved requirements", () => {
      const createResult = createStoryHandler({
        title: "Test",
        description: "Test"
      });
      const storyId = createResult.story!.id;
      
      approveRequirementsArtifactHandler(storyId);
      
      const result = checkDispatchPreconditions(storyId);
      
      assert.strictEqual(result.valid, true);
      assert.ok(result.story);
    });
  });
});
