// Session lifecycle tracker
// MC2-E4-S1: Session tracking with id, storyId, createdAt, lastHeartbeatAt, expiresAt, status

import { RUNTIME_EVENTS, type RuntimeEventType } from "@/domain/runtime-types";

export type SessionStatus = 
  | "pending"
  | "active"
  | "completed"
  | "failed"
  | "timed_out"
  | "canceled";

export interface SessionRecord {
  id: string;
  storyId: string;
  createdAt: number;  // Unix timestamp (ms)
  lastHeartbeatAt: number;  // Unix timestamp (ms)
  expiresAt: number;  // Unix timestamp (ms)
  status: SessionStatus;
}

// In-memory session store (can be replaced with database implementation)
const sessions = new Map<string, SessionRecord>();

export interface CreateSessionOptions {
  sessionId: string;
  storyId: string;
  ttlMs?: number;  // Time to live in milliseconds (default: 5 minutes)
}

export function createSession(options: CreateSessionOptions): SessionRecord {
  const now = Date.now();
  const ttlMs = options.ttlMs ?? 5 * 60 * 1000; // Default 5 minutes
  
  const session: SessionRecord = {
    id: options.sessionId,
    storyId: options.storyId,
    createdAt: now,
    lastHeartbeatAt: now,
    expiresAt: now + ttlMs,
    status: "pending"
  };

  sessions.set(session.id, session);
  return session;
}

export function getSession(sessionId: string): SessionRecord | undefined {
  return sessions.get(sessionId);
}

export function getSessionByStoryId(storyId: string): SessionRecord | undefined {
  for (const session of sessions.values()) {
    if (session.storyId === storyId) {
      return session;
    }
  }
  return undefined;
}

export function getAllSessions(): SessionRecord[] {
  return Array.from(sessions.values());
}

export function updateSessionHeartbeat(sessionId: string): SessionRecord | undefined {
  const session = sessions.get(sessionId);
  if (!session) return undefined;

  // Only update if session is active
  if (session.status !== "active") return undefined;

  const now = Date.now();
  session.lastHeartbeatAt = now;
  
  // Extend expiration on heartbeat
  const ttlMs = 5 * 60 * 1000; // 5 minutes
  session.expiresAt = now + ttlMs;

  return session;
}

export function transitionSessionStatus(
  sessionId: string, 
  newStatus: SessionStatus,
  eventType?: RuntimeEventType
): SessionRecord | undefined {
  const session = sessions.get(sessionId);
  if (!session) return undefined;

  // Validate status transition
  const validTransitions: Record<SessionStatus, SessionStatus[]> = {
    "pending": ["active", "canceled"],
    "active": ["completed", "failed", "timed_out", "canceled"],
    "completed": [],
    "failed": ["active"], // Can retry/reactivate
    "timed_out": ["active"], // Can retry/reactivate
    "canceled": []
  };

  if (!validTransitions[session.status].includes(newStatus)) {
    return undefined; // Invalid transition
  }

  session.status = newStatus;

  // Map runtime event types to session statuses
  if (eventType) {
    switch (eventType) {
      case "started":
        session.status = "active";
        break;
      case "completed":
        session.status = "completed";
        break;
      case "failed":
        session.status = "failed";
        break;
      case "timed_out":
        session.status = "timed_out";
        break;
      case "canceled":
        session.status = "canceled";
        break;
      case "heartbeat":
        // Update heartbeat timestamp
        session.lastHeartbeatAt = Date.now();
        break;
    }
  }

  return session;
}

export function deleteSession(sessionId: string): boolean {
  return sessions.delete(sessionId);
}

export function clearExpiredSessions(now?: number): SessionRecord[] {
  const currentTime = now ?? Date.now();
  const expired: SessionRecord[] = [];

  for (const session of sessions.values()) {
    if (session.expiresAt < currentTime && session.status === "active") {
      session.status = "timed_out";
      expired.push(session);
    }
  }

  return expired;
}
