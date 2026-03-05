export const GATES = [
  "architect",
  "implementer",
  "reviewer-a",
  "operator",
  "reviewer-b"
] as const;

export type Gate = (typeof GATES)[number];

export const STORY_STATES = [
  "created",
  "in_progress",
  "blocked",
  "paused",
  "failed",
  "done",
  "canceled"
] as const;

export type StoryState = (typeof STORY_STATES)[number];

export type StoryStatus = {
  state: StoryState;
  gate?: Gate;
};

export type TransitionAction =
  | { type: "dispatch"; gate: Gate }
  | { type: "contract_pass" }
  | { type: "block" }
  | { type: "unblock" }
  | { type: "pause" }
  | { type: "resume" }
  | { type: "fail" }
  | { type: "retry" }
  | { type: "cancel" }
  | { type: "complete" };