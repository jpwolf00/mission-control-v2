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
    // Include more telemetry: lastHeartbeatAt, actualInvocations
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
    // Include gate-level telemetry: pickedUpAt, finalMessage
    const stories = await prisma.story.findMany({
      where: {
        status: { in: ['active', 'approved'] },
      },
      include: {
        gates: {
          select: {
            id: true,
            gate: true,
            status: true,
            pickedUpAt: true,
            finalMessage: true,
            completedAt: true,
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    // Build a map of gate -> StoryGate for quick lookup
    const gateToStoryGate = new Map<string, typeof stories[0]['gates'][0]>();
    for (const story of stories) {
      for (const gate of story.gates) {
        if (!gateToStoryGate.has(gate.gate)) {
          gateToStoryGate.set(gate.gate, gate);
        }
      }
    }

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
    // For each gate, we need:
    // - status: active (has active session), pending (story waiting), or idle
    // - activeStory: the story being worked on (from active session or pending gate)
    // - model/provider: from the ACTIVE session if one exists (not latest completed)
    // - startedAt: when the active session started
    // - lastEvent: when the last activity happened (active session or latest completed)
    // - pickedUpAt: when the gate was picked up (from StoryGate)
    // - finalMessage: the final output from the agent (from StoryGate)
    // - invocations: number of API calls made by the agent
    // - lastHeartbeatAt: when the agent last sent a heartbeat
    const pipelineState = GATES.map((gate) => {
      // Find active session for this gate
      const activeForGate = activeSessions.find((s) => s.gate === gate);
      
      // Find story currently at this gate (pending gate status)
      const storyAtGate = stories.find((s) => {
        return s.gates.some((g) => g.gate === gate && g.status === 'pending');
      });

      // Get the latest session for this gate (for lastEvent fallback)
      const latestSessionForGate = latestByGate.get(gate);

      // Get StoryGate data for this gate
      const storyGate = gateToStoryGate.get(gate);

      // Use model/provider from ACTIVE session if available, otherwise from latest
      const sessionForTelemetry = activeForGate || latestSessionForGate;

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
        lastEvent: activeForGate?.startedAt?.toISOString() || latestSessionForGate?.startedAt?.toISOString() || null,
        // FIX: Use active session model/provider when available, fall back to latest
        model: sessionForTelemetry?.model || null,
        provider: sessionForTelemetry?.provider || null,
        startedAt: activeForGate?.startedAt?.toISOString() || null,
        // NEW: Additional telemetry fields
        pickedUpAt: storyGate?.pickedUpAt?.toISOString() || null,
        finalMessage: storyGate?.finalMessage || null,
        invocations: activeForGate?.actualInvocations || 0,
        lastHeartbeatAt: activeForGate?.lastHeartbeatAt?.toISOString() || null,
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
        lastHeartbeatAt: s.lastHeartbeatAt?.toISOString(),
        invocations: s.actualInvocations,
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
