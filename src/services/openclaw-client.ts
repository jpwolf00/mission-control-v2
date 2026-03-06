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
 * Trigger an OpenClaw agent for a specific gate via the webhook API.
 *
 * Uses POST /hooks/agent to run an isolated agent turn.
 * The agent receives story context in the message and runs asynchronously.
 *
 * Requires OpenClaw gateway config:
 *   hooks.enabled: true
 *   hooks.token: <OPENCLAW_GATEWAY_TOKEN>
 *   hooks.allowedAgentIds: ["architect","implementer","reviewer-a","operator","reviewer-b"]
 *
 * Each gate role should map to an OpenClaw agent workspace with matching agentId.
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

  const callbackUrl = `${process.env.APP_URL || 'http://localhost:3004'}/api/v1/agents/callback`;
  const criteria = (context.story.metadata.acceptanceCriteria || []).join('\n- ');

  // Build the agent message with full story context and callback instructions
  const message = [
    `You are the ${role} agent for Mission Control story "${context.story.metadata.title}".`,
    ``,
    `## Story Context`,
    `- **Story ID**: ${storyId}`,
    `- **Gate**: ${gate}`,
    `- **Session ID**: ${sessionId}`,
    `- **Description**: ${context.story.metadata.description}`,
    criteria ? `- **Acceptance Criteria**:\n- ${criteria}` : '',
    ``,
    `## Callback`,
    `When finished, POST your results to: ${callbackUrl}`,
    `Include headers: Content-Type: application/json, x-idempotency-key: <unique-key>`,
    `Body: { "sessionId": "${sessionId}", "event": "completed", "agentId": "<your-id>", "role": "${role}", "gate": "${gate}", "evidence": [...] }`,
  ].filter(Boolean).join('\n');

  try {
    const response = await fetch(`${gatewayUrl}/hooks/agent`, {
      method: 'POST',
      headers: {
        'x-openclaw-token': gatewayToken,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message,
        name: `MC2-${role}`,
        agentId: role,
        deliver: false,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error(`[openclaw]   Gateway error: ${response.status} ${errText}`);
      return { success: false, error: `Gateway returned ${response.status}` };
    }

    console.log(`[openclaw]   Agent triggered via /hooks/agent for role "${role}"`);
    return { success: true, agentId: `agent-${role}-${sessionId.slice(0, 8)}` };
  } catch (error) {
    console.error(`[openclaw]   Failed to reach gateway:`, error);
    return { success: false, error: String(error) };
  }
}
