// Simple UUID validation utility

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Validates if a string is a valid UUID
 */
export function isUuid(value: string): boolean {
  if (typeof value !== "string") return false;
  return UUID_REGEX.test(value);
}

/**
 * Returns the UUID version (1-5) or null if invalid
 */
export function version(value: string): number | null {
  if (!isUuid(value)) return null;
  const versionChar = value.charAt(14);
  return parseInt(versionChar, 16);
}
