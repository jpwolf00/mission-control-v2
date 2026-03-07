/* eslint-disable no-console */

const APP_URL = process.env.ORCHESTRATOR_APP_URL || process.env.APP_URL || 'http://app:3000';
const INTERVAL_MS = Number(process.env.ORCHESTRATOR_INTERVAL_MS || 10000);
const START_DELAY_MS = Number(process.env.ORCHESTRATOR_START_DELAY_MS || 5000);

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
    console.log(`[orchestrator] dispatched story=${story.id} gate=${gate} session=${sessionId}`);
    return;
  }

  // Expected/benign states for periodic orchestrator ticks.
  if ([409, 412].includes(result.status)) {
    return;
  }

  console.warn(
    `[orchestrator] dispatch failed story=${story.id} gate=${gate} status=${result.status} body=${result.text?.slice(0, 200)}`
  );
}

async function tick() {
  const storiesRes = await fetchJson(`${APP_URL}/api/v1/stories`);
  if (!storiesRes.ok || !Array.isArray(storiesRes.json)) {
    console.warn(
      `[orchestrator] stories fetch failed status=${storiesRes.status} body=${storiesRes.text?.slice(0, 200)}`
    );
    return;
  }

  const stories = storiesRes.json;
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
