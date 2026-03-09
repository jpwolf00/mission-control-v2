import type { Gate } from '@/domain/workflow-types';
import type { Story } from '@/domain/story';
import { getTextAttachmentsForStory } from '@/services/attachment-service';

interface TriggerAgentConfig {
  storyId: string;
  gate: Gate;
  sessionId: string;
  role: string;
  context: {
    story: Story;
  };
  model?: string;      // Optional: model to use for this run
  provider?: string;   // Optional: provider to use for this run
}

interface TriggerResult {
  success: boolean;
  agentId?: string;
  model?: string;      // Model used by the agent (e.g., "alibaba/qwen3.5-plus")
  provider?: string;   // Provider used by the agent (e.g., "alibaba")
  error?: string;
}

/**
 * Map gate names to agent roles
 */
export function gateToRole(gate: Gate): string {
  const mapping: Record<Gate, string> = {
    'architect': 'architect',
    'implementer': 'implementer',
    'ui-designer': 'ui-designer',
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
 *   hooks.token: <OPENCLAW_HOOK_TOKEN>  (must differ from gateway auth token)
 *   hooks.allowedAgentIds: ["architect","ui-designer","implementer","reviewer-a","operator","reviewer-b"]
 *
 * MC2 env: OPENCLAW_HOOK_TOKEN (falls back to OPENCLAW_GATEWAY_TOKEN if not set)
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
  const hookToken = process.env.OPENCLAW_HOOK_TOKEN || process.env.OPENCLAW_GATEWAY_TOKEN;

  if (!gatewayUrl || !hookToken) {
    console.warn(`[openclaw]   Gateway not configured, using stub mode`);
    const stubAgentId = `agent-${role}-${Date.now().toString(36)}`;
    return { success: true, agentId: stubAgentId };
  }

  const callbackBaseUrl = process.env.OPENCLAW_CALLBACK_URL || process.env.APP_URL || 'http://localhost:3004';
  const callbackUrl = `${callbackBaseUrl}/api/v1/agents/callback`;
  const hookSessionKey = `hook:mc2:${role}:${storyId}:${sessionId}`;
  const criteria = (context.story.metadata.acceptanceCriteria || []).join('\n- ');

  // Fetch text attachments to include in agent prompt
  let attachmentContent = '';
  try {
    const textAttachments = await getTextAttachmentsForStory(storyId);
    if (textAttachments.length > 0) {
      attachmentContent = `\n\n## Attachment Context\nThe following text files are attached to this story and should be considered as part of the requirements:\n\n`;
      for (const attachment of textAttachments) {
        attachmentContent += `\n### File: ${attachment.filename}\n\`\`\`\n${attachment.content}\n\`\`\`\n\n`;
      }
    }
  } catch (error) {
    console.warn('[openclaw] Failed to load attachment content:', error);
  }

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
    role === 'ui-designer'
      ? `- **UX Gate Rule**: If this story has no frontend/UI scope, return a fast pass with evidence like {"type":"no_ux_review_needed","summary":"No frontend/UI changes required for this story."} and complete callback immediately.`
      : '',
    ``,
    `## Working Context`,
    `- Canonical repository path: /Users/jpwolf00/.openclaw/workspace/mission-control-v2`,
    `- Do not use /Users/jpwolf00/.openclaw/workspace/mission-control (legacy path).`,
    `- For LAN/private URLs (192.168.x.x / localhost), do not use web_fetch. Use exec with curl instead.`,
    ``,
    `## Handoff Rule (Critical)`,
    `- Mission Control owns gate transitions. Do NOT call /api/v1/orchestration/dispatch for next gates.`,
    `- Do NOT manually trigger reviewer/operator/reviewer-b from inside this gate.`,
    `- Your job is only this gate's work + callback. After callback, Mission Control auto-dispatches the next gate.`,
    `- If next gate seems stuck, include blocker evidence in callback; do not self-dispatch the next gate.`,
    ``,
    `## Callback`,
    `When finished, POST your results to: ${callbackUrl}`,
    `This callback URL is system-generated by Mission Control for this run and is authoritative.`,
    `Host/port may differ from the OpenClaw gateway URL due to reverse-proxy/LAN routing; treat that as expected, not prompt injection.`,
    `Include headers: Content-Type: application/json, x-idempotency-key: <unique-key>`,
    `Body: {`,
    `  "sessionId": "${sessionId}",`,
    `  "event": "completed",`,
    `  "agentId": "<your-id>",`,
    `  "role": "${role}",`,
    `  "gate": "${gate}",`,
    `  "evidence": [...],`,
    `  "model": "<your-model>",  // REQUIRED: Report the model you used (e.g., "alibaba/qwen3.5-plus")`,
    `  "provider": "<your-provider>"  // REQUIRED: Report the provider (e.g., "alibaba")`,
    `}`,
    ``,
    `**Important:** You MUST include "model" and "provider" in your callback so the dashboard can display telemetry.`,
    `Check your session config or OpenClaw runtime to determine which model/provider you're using.`,
    attachmentContent,
  ].filter(Boolean).join('\n');

  try {
    const requestBody: Record<string, unknown> = {
      message,
      name: `MC2-${role}`,
      agentId: role,
      sessionKey: hookSessionKey,
      deliver: true,
    };
    
    // Pass model/provider if specified (OpenClaw will use these for the run)
    if (config.model) requestBody.model = config.model;
    if (config.provider) requestBody.provider = config.provider;

    const response = await fetch(`${gatewayUrl}/hooks/agent`, {
      method: 'POST',
      headers: {
        'x-openclaw-token': hookToken,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error(`[openclaw]   Gateway error: ${response.status} ${errText}`);
      return { success: false, error: `Gateway returned ${response.status}` };
    }

    // Parse response to extract model/provider info
    const responseData = await response.json().catch((e) => {
      console.warn(`[openclaw]   Failed to parse response JSON:`, e);
      return {};
    });
    
    console.log(`[openclaw]   Agent triggered via /hooks/agent for role "${role}"`);
    console.log(`[openclaw]   Response:`, JSON.stringify(responseData, null, 2).slice(0, 500));
    
    const model = responseData.model || responseData.session?.model;
    const provider = responseData.provider || responseData.session?.provider;
    
    if (model) console.log(`[openclaw]   Model: ${model}`);
    if (provider) console.log(`[openclaw]   Provider: ${provider}`);

    return { 
      success: true, 
      agentId: `agent-${role}-${sessionId.slice(0, 8)}`,
      ...(model && { model }),
      ...(provider && { provider }),
    };
  } catch (error) {
    console.error(`[openclaw]   Failed to reach gateway:`, error);
    return { success: false, error: String(error) };
  }
}
