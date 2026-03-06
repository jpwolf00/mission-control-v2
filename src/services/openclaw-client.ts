import type { Gate } from '@/domain/workflow-types';
import type { Story } from '@/domain/story';

interface TriggerAgentConfig {
  storyId: string;
  gate: Gate;
  sessionId: string;
  role: string;
  context: {
    story: Story;
  };
}

interface TriggerResult {
  success: boolean;
  agentId?: string;
  error?: string;
}

/**
 * Map gate names to agent roles
 */
export function gateToRole(gate: Gate): string {
  const mapping: Record<Gate, string> = {
    'architect': 'architect',
    'implementer': 'implementer',
    'reviewer-a': 'reviewer-a',
    'operator': 'operator',
    'reviewer-b': 'reviewer-b',
  };
  return mapping[gate];
}

/**
 * Trigger an Openclaw agent for a specific gate.
 *
 * STUB: This is where the Openclaw API integration would go.
 * The actual implementation would:
 * 1. Build the agent system prompt from the role definition
 * 2. Configure allowed tools from the RBAC permissions
 * 3. Call the Openclaw API to spawn an agent session
 * 4. Return the agent ID for tracking
 *
 * The agent would receive:
 * - System prompt with role constraints
 * - Story context (title, description, acceptance criteria)
 * - Session ID for callbacks to POST /api/v1/agents/callback
 * - Tool permissions from role-permissions.ts
 */
export async function triggerAgent(config: TriggerAgentConfig): Promise<TriggerResult> {
  const { storyId, gate, sessionId, role, context } = config;

  console.log(`[openclaw] Triggering agent for gate "${gate}"`);
  console.log(`[openclaw]   Story: ${storyId} - "${context.story.metadata.title}"`);
  console.log(`[openclaw]   Session: ${sessionId}`);
  console.log(`[openclaw]   Role: ${role}`);

  const gatewayUrl = process.env.OPENCLAW_GATEWAY_URL;
  const gatewayToken = process.env.OPENCLAW_GATEWAY_TOKEN;

  if (!gatewayUrl || !gatewayToken) {
    console.warn(`[openclaw]   Gateway not configured, using stub mode`);
    const stubAgentId = `agent-${role}-${Date.now().toString(36)}`;
    return { success: true, agentId: stubAgentId };
  }

  try {
    const response = await fetch(`${gatewayUrl}/agents/spawn`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${gatewayToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        role,
        sessionId,
        callbackUrl: `${process.env.APP_URL || 'http://localhost:3004'}/api/v1/agents/callback`,
        context: {
          storyId,
          gate,
          title: context.story.metadata.title,
          description: context.story.metadata.description,
          acceptanceCriteria: context.story.metadata.acceptanceCriteria,
        },
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error(`[openclaw]   Gateway error: ${response.status} ${errText}`);
      return { success: false, error: `Gateway returned ${response.status}` };
    }

    const data = await response.json();
    console.log(`[openclaw]   Agent spawned: ${data.agentId || 'unknown'}`);
    return { success: true, agentId: data.agentId };
  } catch (error) {
    console.error(`[openclaw]   Failed to reach gateway:`, error);
    return { success: false, error: String(error) };
  }
}
