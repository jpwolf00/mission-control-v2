// Tests for logging schema and validators
// MC2-E8-S1: Observability scaffold tests

import test from "node:test";
import assert from "node:assert/strict";
import {
  LOG_LEVELS,
  LOG_SOURCES,
  isLogLevel,
  isLogSource,
  isLogEntry,
  validateLogEntry,
  createLogEntry,
  getLogLevelPriority,
  shouldLog,
  type LogEntry,
  type LogLevel,
  type LogSource
} from "./logging.js";

test("LOG_LEVELS contains expected levels", () => {
  assert.deepEqual(LOG_LEVELS, ["debug", "info", "warn", "error"]);
});

test("LOG_SOURCES contains expected sources", () => {
  assert.deepEqual(LOG_SOURCES, ["domain", "infrastructure", "gateway", "api", "worker"]);
});

test("isLogLevel returns true for valid levels", () => {
  assert.equal(isLogLevel("debug"), true);
  assert.equal(isLogLevel("info"), true);
  assert.equal(isLogLevel("warn"), true);
  assert.equal(isLogLevel("error"), true);
});

test("isLogLevel returns false for invalid levels", () => {
  assert.equal(isLogLevel(null), false);
  assert.equal(isLogLevel(undefined), false);
  assert.equal(isLogLevel(""), false);
  assert.equal(isLogLevel("trace"), false);
  assert.equal(isLogLevel("DEBUG"), false); // case sensitive
  assert.equal(isLogLevel(123), false);
});

test("isLogSource returns true for valid sources", () => {
  assert.equal(isLogSource("domain"), true);
  assert.equal(isLogSource("infrastructure"), true);
  assert.equal(isLogSource("gateway"), true);
  assert.equal(isLogSource("api"), true);
  assert.equal(isLogSource("worker"), true);
});

test("isLogSource returns false for invalid sources", () => {
  assert.equal(isLogSource(null), false);
  assert.equal(isLogSource(""), false);
  assert.equal(isLogSource("unknown"), false);
  assert.equal(isLogSource("DOMAIN"), false);
});

test("isLogEntry returns true for valid entries", () => {
  const validEntry: LogEntry = {
    timestamp: "2024-01-01T12:00:00.000Z",
    level: "info",
    source: "domain",
    message: "Test message"
  };
  assert.equal(isLogEntry(validEntry), true);
});

test("isLogEntry returns true for entries with optional fields", () => {
  const entryWithOptional: LogEntry = {
    timestamp: "2024-01-01T12:00:00.000Z",
    level: "error",
    source: "api",
    message: "Error occurred",
    storyId: "story-123",
    sessionId: "session-456",
    metadata: { userId: "user-789" },
    error: {
      name: "Error",
      message: "Something went wrong",
      stack: "Error: Something went wrong\n    at..."
    }
  };
  assert.equal(isLogEntry(entryWithOptional), true);
});

test("isLogEntry returns false for null/undefined", () => {
  assert.equal(isLogEntry(null), false);
  assert.equal(isLogEntry(undefined), false);
});

test("isLogEntry returns false for missing required fields", () => {
  assert.equal(isLogEntry({}), false);
  assert.equal(isLogEntry({ timestamp: "2024-01-01T12:00:00Z" }), false);
  assert.equal(isLogEntry({ level: "info" }), false);
  assert.equal(isLogEntry({ message: "test" }), false);
});

test("isLogEntry returns false for invalid field types", () => {
  assert.equal(isLogEntry({ timestamp: 123, level: "info", source: "domain", message: "test" }), false);
  assert.equal(isLogEntry({ timestamp: "2024-01-01T12:00:00Z", level: "invalid", source: "domain", message: "test" }), false);
  assert.equal(isLogEntry({ timestamp: "2024-01-01T12:00:00Z", level: "info", source: "invalid", message: "test" }), false);
  assert.equal(isLogEntry({ timestamp: "2024-01-01T12:00:00Z", level: "info", source: "domain", message: 123 }), false);
  assert.equal(isLogEntry({ timestamp: "2024-01-01T12:00:00Z", level: "info", source: "domain", message: "test", storyId: 123 }), false);
});

test("validateLogEntry accepts valid entries", () => {
  const validEntry: LogEntry = {
    timestamp: "2024-01-01T12:00:00.000Z",
    level: "info",
    source: "domain",
    message: "Test message"
  };
  const result = validateLogEntry(validEntry);
  assert.equal(result.valid, true);
});

test("validateLogEntry accepts valid entry with ISO timestamp", () => {
  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    level: "warn",
    source: "gateway",
    message: "Warning message",
    metadata: { key: "value" }
  };
  assert.equal(validateLogEntry(entry).valid, true);
});

test("validateLogEntry rejects null/undefined", () => {
  assert.equal(validateLogEntry(null).valid, false);
  assert.equal(validateLogEntry(undefined).valid, false);
});

test("validateLogEntry rejects invalid timestamps", () => {
  const entry: LogEntry = {
    timestamp: "not-a-date",
    level: "info",
    source: "domain",
    message: "Test"
  };
  assert.equal(validateLogEntry(entry).valid, false);
  const result = validateLogEntry(entry);
  assert.ok(result.valid === false && "error" in result && (result as { error: string }).error.includes("timestamp"));
});

test("validateLogEntry rejects non-serializable metadata", () => {
  const entry: LogEntry = {
    timestamp: "2024-01-01T12:00:00Z",
    level: "info",
    source: "domain",
    message: "Test",
    metadata: { circular: {} } as unknown as Record<string, unknown>
  };
  // This creates a circular reference
  (entry.metadata as Record<string, unknown>).circular = entry.metadata;
  assert.equal(validateLogEntry(entry).valid, false);
});

test("createLogEntry creates valid entry with defaults", () => {
  const entry = createLogEntry("info", "domain", "Test message");
  
  assert.equal(entry.level, "info");
  assert.equal(entry.source, "domain");
  assert.equal(entry.message, "Test message");
  assert.ok(entry.timestamp);
  assert.ok(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(entry.timestamp));
});

test("createLogEntry creates entry with optional fields", () => {
  const err = new Error("Test error");
  const entry = createLogEntry("error", "api", "Error occurred", {
    storyId: "story-1",
    sessionId: "session-1",
    metadata: { userId: "user-123" },
    error: {
      name: err.name,
      message: err.message,
      stack: err.stack
    }
  });
  
  assert.equal(entry.storyId, "story-1");
  assert.equal(entry.sessionId, "session-1");
  assert.deepEqual(entry.metadata, { userId: "user-123" });
  assert.equal(entry.error?.name, "Error");
  assert.equal(entry.error?.message, "Test error");
  assert.ok(entry.error?.stack);
});

test("getLogLevelPriority returns correct priorities", () => {
  assert.equal(getLogLevelPriority("debug"), 0);
  assert.equal(getLogLevelPriority("info"), 1);
  assert.equal(getLogLevelPriority("warn"), 2);
  assert.equal(getLogLevelPriority("error"), 3);
});

test("shouldLog filters correctly", () => {
  // debug should log at debug threshold
  assert.equal(shouldLog("debug", "debug"), true);
  assert.equal(shouldLog("debug", "info"), false);
  
  // info should log at info and debug thresholds
  assert.equal(shouldLog("info", "debug"), true);
  assert.equal(shouldLog("info", "info"), true);
  assert.equal(shouldLog("info", "warn"), false);
  
  // warn should log at warn, info, and debug
  assert.equal(shouldLog("warn", "debug"), true);
  assert.equal(shouldLog("warn", "info"), true);
  assert.equal(shouldLog("warn", "warn"), true);
  assert.equal(shouldLog("warn", "error"), false);
  
  // error should always log except at debug (if we had one below error)
  assert.equal(shouldLog("error", "debug"), true);
  assert.equal(shouldLog("error", "info"), true);
  assert.equal(shouldLog("error", "warn"), true);
  assert.equal(shouldLog("error", "error"), true);
});
