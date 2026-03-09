import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { GATES } from '@/domain/workflow-types';

/**
 * GET /api/v1/runtime/state
 * Returns runtime state for dashboard pipeline view
 */
export async function GET() {
  try {
    // Get active sessions (sessions that are currently running)
    const activeSessions = await prisma.runSession.findMany({
      where: {
        status: 'active',
      },
      orderBy: { startedAt: 'desc' },
      include: {
        story: {
          select: {
            id: true,
            title: true,
            status: true,
          },
        },
      },
    });

    // Get all stories with their gates for context
    const stories = await prisma.story.findMany({
      where: {
        status: { in: ['active', 'approved'] },
      },
      include: {
        gates: true,
      },
      orderBy: { updatedAt: 'desc' },
    });

    // Get all latest sessions per gate (for model/last event info)
    const latestSessionsPerGate = await prisma.runSession.findMany({
      orderBy: { startedAt: 'desc' },
      include: {
        story: {
          select: { title: true },
        },
      },
    });

    // Group by gate and take the first (most recent) for each
    const latestByGate = new Map<string, typeof latestSessionsPerGate[0]>();
    for (const session of latestSessionsPerGate) {
      if (!latestByGate.has(session.gate)) {
        latestByGate.set(session.gate, session);
      }
    }

    // Build gate pipeline state
    const pipelineState = GATES.map((gate) => {
      // Find active session for this gate
      const activeForGate = activeSessions.find((s) => s.gate === gate);
      
      // Find story currently at this gate (pending gate status)
      const storyAtGate = stories.find((s) => {
        return s.gates.some((g) => g.gate === gate && g.status === 'pending');
      });

      // Get the latest session for this gate
      const latestSessionForGate = latestByGate.get(gate);

      return {
        gate,
        status: activeForGate ? 'active' : storyAtGate ? 'pending' : 'idle',
        activeStory: activeForGate
          ? {
              id: activeForGate.story.id,
              title: activeForGate.story.title || 'Untitled',
              sessionId: activeForGate.id,
            }
          : storyAtGate
          ? {
              id: storyAtGate.id,
              title: storyAtGate.title || 'Untitled',
            }
          : null,
        lastEvent: latestSessionForGate?.startedAt?.toISOString() || null,
        model: latestSessionForGate?.model || null,
        provider: latestSessionForGate?.provider || null,
        startedAt: activeForGate?.startedAt?.toISOString() || null,
      };
    });

    // Get active agent count
    const activeAgentCount = activeSessions.length;

    return NextResponse.json({
      pipeline: pipelineState,
      activeSessions: activeSessions.map((s) => ({
        id: s.id,
        storyId: s.storyId,
        gate: s.gate,
        model: s.model,
        provider: s.provider,
        startedAt: s.startedAt?.toISOString(),
        storyTitle: s.story?.title || 'Untitled',
      })),
      activeAgentCount,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Failed to fetch runtime state:', error);
    return NextResponse.json(
      { error: 'Failed to fetch runtime state' },
      { status: 500 }
    );
  }
}
