import { GATES, type Gate, type StoryStatus, type TransitionAction } from "./workflow-types.js";

export type TransitionResult =
  | { ok: true; next: StoryStatus }
  | { ok: false; error: string };

function nextGate(gate: Gate): Gate | null {
  const idx = GATES.indexOf(gate);
  if (idx < 0 || idx === GATES.length - 1) {
    return null;
  }
  return GATES[idx + 1];
}

export function transition(current: StoryStatus, action: TransitionAction): TransitionResult {
  switch (action.type) {
    case "dispatch": {
      if (current.state !== "created") {
        return { ok: false, error: "dispatch only allowed from created" };
      }
      return { ok: true, next: { state: "in_progress", gate: action.gate } };
    }

    case "contract_pass": {
      if (current.state !== "in_progress" || !current.gate) {
        return { ok: false, error: "contract_pass requires in_progress gate" };
      }
      const ng = nextGate(current.gate);
      if (!ng) {
        return { ok: false, error: "contract_pass invalid on final gate; use complete" };
      }
      return { ok: true, next: { state: "in_progress", gate: ng } };
    }

    case "complete": {
      if (current.state === "in_progress" && current.gate === "reviewer-b") {
        return { ok: true, next: { state: "done" } };
      }
      return { ok: false, error: "complete only allowed from in_progress reviewer-b" };
    }

    case "block": {
      if (current.state !== "in_progress") {
        return { ok: false, error: "block only allowed from in_progress" };
      }
      return { ok: true, next: { state: "blocked", gate: current.gate } };
    }

    case "unblock": {
      if (current.state !== "blocked" || !current.gate) {
        return { ok: false, error: "unblock requires blocked with gate" };
      }
      return { ok: true, next: { state: "in_progress", gate: current.gate } };
    }

    case "pause": {
      if (current.state !== "in_progress") {
        return { ok: false, error: "pause only allowed from in_progress" };
      }
      return { ok: true, next: { state: "paused", gate: current.gate } };
    }

    case "resume": {
      if (current.state !== "paused" || !current.gate) {
        return { ok: false, error: "resume requires paused with gate" };
      }
      return { ok: true, next: { state: "in_progress", gate: current.gate } };
    }

    case "fail": {
      if (current.state !== "in_progress") {
        return { ok: false, error: "fail only allowed from in_progress" };
      }
      return { ok: true, next: { state: "failed", gate: current.gate } };
    }

    case "retry": {
      if (current.state !== "failed" || !current.gate) {
        return { ok: false, error: "retry requires failed with gate" };
      }
      return { ok: true, next: { state: "in_progress", gate: current.gate } };
    }

    case "cancel": {
      if (current.state === "done" || current.state === "canceled") {
        return { ok: false, error: "cannot cancel terminal state" };
      }
      return { ok: true, next: { state: "canceled", gate: current.gate } };
    }

    default:
      return { ok: false, error: "unknown action" };
  }
}
