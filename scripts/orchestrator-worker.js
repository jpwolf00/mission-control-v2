/* eslint-disable no-console */

const APP_URL = process.env.ORCHESTRATOR_APP_URL || process.env.APP_URL || 'http://app:3000';
const INTERVAL_MS = Number(process.env.ORCHESTRATOR_INTERVAL_MS || 10000);
const START_DELAY_MS = Number(process.env.ORCHESTRATOR_START_DELAY_MS || 5000);
const DISPATCH_COOLDOWN_MS = Number(process.env.ORCHESTRATOR_DISPATCH_COOLDOWN_MS || 120000);
const FAILURE_MAX_STREAK = Number(process.env.ORCHESTRATOR_FAILURE_MAX_STREAK || 5);
const IDEMPOTENT_MAX_STREAK = Number(process.env.ORCHESTRATOR_IDEMPOTENT_MAX_STREAK || 10);
const RETRY_BACKOFF_BASE_MS = Number(process.env.ORCHESTRATOR_RETRY_BACKOFF_BASE_MS || 120000);
const RETRY_BACKOFF_MAX_MS = Number(process.env.ORCHESTRATOR_RETRY_BACKOFF_MAX_MS || 1800000);
const CIRCUIT_OPEN_MS = Number(process.env.ORCHESTRATOR_CIRCUIT_OPEN_MS || 900000);

/**
 * Per story+gate dispatch state to prevent infinite churn loops.
 * key = `${storyId}:${gate}`
 */
const dispatchState = new Map();

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchJson(url, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    const text = await res.text();
    let json = null;
    try {
      json = text ? JSON.parse(text) : null;
    } catch {
      // non-json response
    }
    return { ok: res.ok, status: res.status, json, text };
  } finally {
    clearTimeout(timeout);
  }
}

function isEligible(story) {
  const status = story?.status;
  const currentGate = story?.currentGate;
  const approvedReq = !!story?.metadata?.approvedRequirementsArtifact;
  if (!approvedReq) return false;
  if (!(status === 'approved' || status === 'active')) return false;
  if (!currentGate) return false;

  const alreadyApproved = (story.gates || []).some(
    (g) => g.gate === currentGate && g.status === 'approved'
  );
  return !alreadyApproved;
}

async function dispatchStory(story) {
  const gate = story.currentGate;
  const key = `${story.id}:${gate}`;
  const now = Date.now();

  const state = dispatchState.get(key) || {
    lastAttemptAt: 0,
    consecutiveFailures: 0,
    consecutiveIdempotent: 0,
    blockedUntil: 0,
    lastStoryUpdatedAt: null,
  };

  // Reset streaks when story changes (progress happened).
  const storyUpdatedAt = story.updatedAt || null;
  if (state.lastStoryUpdatedAt && storyUpdatedAt && state.lastStoryUpdatedAt !== storyUpdatedAt) {
    state.consecutiveFailures = 0;
    state.consecutiveIdempotent = 0;
    state.blockedUntil = 0;
  }
  state.lastStoryUpdatedAt = storyUpdatedAt;

  if (state.blockedUntil > now) {
    dispatchState.set(key, state);
    return;
  }

  const backoffMs = state.consecutiveFailures > 0
    ? Math.min(RETRY_BACKOFF_MAX_MS, RETRY_BACKOFF_BASE_MS * (2 ** (state.consecutiveFailures - 1)))
    : DISPATCH_COOLDOWN_MS;

  if (now - state.lastAttemptAt < backoffMs) {
    dispatchState.set(key, state);
    return;
  }

  state.lastAttemptAt = now;
  dispatchState.set(key, state);

  const idempotencyKey = `orchestrator:${story.id}:${gate}`;
  const result = await fetchJson(`${APP_URL}/api/v1/orchestration/dispatch`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-idempotency-key': idempotencyKey,
    },
    body: JSON.stringify({ storyId: story.id, gate }),
  });

  if (result.ok) {
    const sessionId = result.json?.sessionId || 'unknown';
    const code = result.json?.code;

    if (code === 'IDEMPOTENT') {
      state.consecutiveIdempotent += 1;
      if (state.consecutiveIdempotent >= IDEMPOTENT_MAX_STREAK) {
        state.blockedUntil = Date.now() + CIRCUIT_OPEN_MS;
        console.warn(
          `[orchestrator] circuit-open (idempotent churn) story=${story.id} gate=${gate} session=${sessionId} forMs=${CIRCUIT_OPEN_MS}`
        );
      }
      dispatchState.set(key, state);
      return;
    }

    state.consecutiveFailures = 0;
    state.consecutiveIdempotent = 0;
    state.blockedUntil = 0;
    dispatchState.set(key, state);
    console.log(`[orchestrator] dispatched story=${story.id} gate=${gate} session=${sessionId}`);
    return;
  }

  // Expected/benign states for periodic orchestrator ticks.
  if ([409, 412].includes(result.status)) {
    state.consecutiveIdempotent += 1;
    if (state.consecutiveIdempotent >= IDEMPOTENT_MAX_STREAK) {
      state.blockedUntil = Date.now() + CIRCUIT_OPEN_MS;
      console.warn(
        `[orchestrator] circuit-open (conflict churn) story=${story.id} gate=${gate} status=${result.status} forMs=${CIRCUIT_OPEN_MS}`
      );
    }
    dispatchState.set(key, state);
    return;
  }

  state.consecutiveFailures += 1;
  if (state.consecutiveFailures >= FAILURE_MAX_STREAK) {
    state.blockedUntil = Date.now() + CIRCUIT_OPEN_MS;
    console.error(
      `[orchestrator] circuit-open (dispatch failures) story=${story.id} gate=${gate} streak=${state.consecutiveFailures} forMs=${CIRCUIT_OPEN_MS}`
    );
  }
  dispatchState.set(key, state);

  console.warn(
    `[orchestrator] dispatch failed story=${story.id} gate=${gate} status=${result.status} body=${result.text?.slice(0, 200)}`
  );
}

async function tick() {
  const storiesRes = await fetchJson(`${APP_URL}/api/v1/stories`);
  if (!storiesRes.ok) {
    console.warn(
      `[orchestrator] stories fetch failed status=${storiesRes.status} body=${storiesRes.text?.slice(0, 200)}`
    );
    return;
  }

  // API returns { stories: [...] } or array directly depending on version
  const raw = storiesRes.json;
  const stories = Array.isArray(raw) ? raw : (raw?.stories || []);
  if (!Array.isArray(stories)) {
    console.warn(`[orchestrator] unexpected stories response shape`);
    return;
  }
  const eligible = stories.filter(isEligible);
  for (const story of eligible) {
    // eslint-disable-next-line no-await-in-loop
    await dispatchStory(story);
  }
}

async function main() {
  console.log(`[orchestrator] starting. app=${APP_URL} intervalMs=${INTERVAL_MS}`);
  await sleep(START_DELAY_MS);

  // Loop forever. Any tick error is logged and loop continues.
  // This worker is deterministic and non-AI.
  while (true) {
    try {
      // eslint-disable-next-line no-await-in-loop
      await tick();
    } catch (err) {
      console.error('[orchestrator] tick error:', err instanceof Error ? err.message : String(err));
    }
    // eslint-disable-next-line no-await-in-loop
    await sleep(INTERVAL_MS);
  }
}

main().catch((err) => {
  console.error('[orchestrator] fatal:', err instanceof Error ? err.message : String(err));
  process.exit(1);
});
