// Orphan cleaner service - simplified stub
// TODO: Implement full orphan cleaning later

import { prisma } from './prisma';

export interface OrphanResult {
  storiesDeleted: number;
  sessionsDeleted: number;
  locksReleased: number;
}

export async function cleanupOrphanedSessions(): Promise<OrphanResult> {
  console.log('[OrphanCleaner] Cleaning orphaned sessions...');
  
  // Find and clean up stale sessions
  const result = await prisma.$executeRaw`
    UPDATE agent_sessions 
    SET status = 'orphaned', ended_at = NOW()
    WHERE status IN ('active', 'working') 
    AND last_heartbeat_at < NOW() - INTERVAL '30 minutes'
  `;
  
  return {
    storiesDeleted: 0,
    sessionsDeleted: Number(result),
    locksReleased: 0,
  };
}

export async function cleanupExpiredLocks(): Promise<number> {
  console.log('[OrphanCleaner] Cleaning expired locks...');
  
  const result = await prisma.$executeRaw`
    UPDATE dispatch_locks
    SET released_at = NOW(), release_reason = 'expired'
    WHERE expires_at < NOW() AND released_at IS NULL
  `;
  
  return Number(result);
}
