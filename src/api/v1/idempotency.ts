export type IdempotencyResult = {
  ok: boolean;
  key?: string;
  error?: string;
};

const IDEMPOTENCY_HEADER = "x-idempotency-key";

/**
 * Framework-agnostic helper for validating idempotency key presence.
 *
 * Any mutation endpoint should call this before performing side effects.
 */
export function requireIdempotencyKey(headers: Headers): IdempotencyResult {
  const raw = headers.get(IDEMPOTENCY_HEADER)?.trim();

  if (!raw) {
    return {
      ok: false,
      error: "Missing X-Idempotency-Key header"
    };
  }

  if (raw.length < 8) {
    return {
      ok: false,
      error: "Invalid X-Idempotency-Key header"
    };
  }

  return {
    ok: true,
    key: raw
  };
}
