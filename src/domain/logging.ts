// Structured logging schema and validators
// MC2-E8-S1: Observability scaffold

export const LOG_LEVELS = ["debug", "info", "warn", "error"] as const;
export type LogLevel = (typeof LOG_LEVELS)[number];

export const LOG_SOURCES = [
  "domain",
  "infrastructure", 
  "gateway",
  "api",
  "worker"
] as const;
export type LogSource = (typeof LOG_SOURCES)[number];

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  source: LogSource;
  message: string;
  storyId?: string;
  sessionId?: string;
  metadata?: Record<string, unknown>;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
}

// Type guards for log levels
export function isLogLevel(value: unknown): value is LogLevel {
  return typeof value === "string" && LOG_LEVELS.includes(value as LogLevel);
}

export function isLogSource(value: unknown): value is LogSource {
  return typeof value === "string" && LOG_SOURCES.includes(value as LogSource);
}

export function isLogEntry(value: unknown): value is LogEntry {
  if (typeof value !== "object" || value === null) return false;
  
  const entry = value as Record<string, unknown>;
  
  // Required fields
  if (typeof entry.timestamp !== "string") return false;
  if (!isLogLevel(entry.level)) return false;
  if (!isLogSource(entry.source)) return false;
  if (typeof entry.message !== "string") return false;
  
  // Optional fields
  if (entry.storyId !== undefined && typeof entry.storyId !== "string") return false;
  if (entry.sessionId !== undefined && typeof entry.sessionId !== "string") return false;
  if (entry.metadata !== undefined && (typeof entry.metadata !== "object" || entry.metadata === null)) return false;
  
  if (entry.error !== undefined) {
    if (typeof entry.error !== "object" || entry.error === null) return false;
    const err = entry.error as Record<string, unknown>;
    if (typeof err.name !== "string") return false;
    if (typeof err.message !== "string") return false;
    if (err.stack !== undefined && typeof err.stack !== "string") return false;
  }
  
  return true;
}

// Validation function
export function validateLogEntry(entry: unknown): { valid: true } | { valid: false; error: string } {
  if (!isLogEntry(entry)) {
    return { valid: false, error: "Invalid log entry: missing or invalid required fields" };
  }
  
  const log = entry as LogEntry;
  
  // Validate timestamp is ISO 8601 format
  const isoDateRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?$/;
  if (!isoDateRegex.test(log.timestamp)) {
    return { valid: false, error: "Invalid log entry: timestamp must be ISO 8601 format" };
  }
  
  // Validate metadata keys are safe (no circular refs in JSON stringify)
  if (log.metadata) {
    try {
      JSON.stringify(log.metadata);
    } catch {
      return { valid: false, error: "Invalid log entry: metadata must be JSON serializable" };
    }
  }
  
  return { valid: true };
}

// Factory function to create log entries
export function createLogEntry(
  level: LogLevel,
  source: LogSource,
  message: string,
  options?: {
    storyId?: string;
    sessionId?: string;
    metadata?: Record<string, unknown>;
    error?: { name: string; message: string; stack?: string };
  }
): LogEntry {
  return {
    timestamp: new Date().toISOString(),
    level,
    source,
    message,
    ...options
  };
}

// Log level priority for filtering
export function getLogLevelPriority(level: LogLevel): number {
  const priorities: Record<LogLevel, number> = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3
  };
  return priorities[level];
}

export function shouldLog(entryLevel: LogLevel, minLevel: LogLevel): boolean {
  return getLogLevelPriority(entryLevel) >= getLogLevelPriority(minLevel);
}
