import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-middleware';
import { prisma } from '@/lib/prisma';

/**
 * Emergency stop endpoint - kills all active sessions for MC2 stories
 * 
 * POST /api/v1/agents/emergency-stop
 * Body: { storyId? } - if provided, kills sessions for that story only
 * Body: { all?: true } - kills ALL active run_sessions regardless of story
 * 
 * This is a fire-and-forget bulk operation that doesn't wait for agent responses.
 * Much cheaper than sending individual session_stop calls.
 */
export async function POST(request: NextRequest) {
  const authError = requireAuth(request);
  if (authError) {
    return authError;
  }

  try {
    const body = await request.json().catch(() => ({}));
    const { storyId, all } = body as { storyId?: string; all?: boolean };

    let sessionsKilled = 0;
    let storiesAffected: string[] = [];

    if (storyId) {
      // Kill sessions for specific story only
      const sessions = await prisma.runSession.findMany({
        where: { 
          storyId,
          status: 'active'
        },
        select: { id: true, storyId: true }
      });

      if (sessions.length > 0) {
        await prisma.runSession.updateMany({
          where: { 
            storyId,
            status: 'active'
          },
          data: { 
            status: 'failed',
            endedAt: new Date()
          }
        });
        sessionsKilled = sessions.length;
        storiesAffected.push(storyId);
      }
    } else if (all) {
      // Kill ALL active sessions
      const sessions = await prisma.runSession.findMany({
        where: { status: 'active' },
        select: { id: true, storyId: true }
      });

      if (sessions.length > 0) {
        await prisma.runSession.updateMany({
          where: { status: 'active' },
          data: { 
            status: 'failed',
            endedAt: new Date()
          }
        });
        sessionsKilled = sessions.length;
        const uniqueStories = [...new Set(sessions.map(s => s.storyId))];
        storiesAffected = uniqueStories;
      }
    } else {
      return NextResponse.json({
        error: 'Provide storyId or { all: true } to kill sessions',
        status: 400
      });
    }

    console.log(`[emergency-stop] Killed ${sessionsKilled} sessions for stories: ${storiesAffected.join(', ')}`);

    return NextResponse.json({
      status: 'emergency_stop_executed',
      sessionsKilled,
      storiesAffected,
      message: storyId 
        ? `Killed ${sessionsKilled} sessions for story ${storyId}`
        : `Killed ${sessionsKilled} sessions across ${storiesAffected.length} stories`
    });
  } catch (error) {
    console.error('[emergency-stop] Failed:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
