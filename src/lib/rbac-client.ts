import { ToolName } from '@/domain/agent-roles';

/**
 * RBAC Client for Agents
 *
 * Provides permission checking via the /api/v1/rbac/check endpoint.
 * Actual tool execution happens in the Openclaw agent runtime, not here.
 */

interface RBACCheckResult {
  allowed: boolean;
  reason?: string;
  requiresEscalation?: boolean;
}

interface AgentContext {
  agentId: string;
  role: string;
  storyId: string;
  sessionId: string;
}

/**
 * Check if a tool call is permitted for the given agent context
 */
export async function checkPermission(
  tool: ToolName,
  params: Record<string, unknown>,
  context: AgentContext
): Promise<RBACCheckResult> {
  try {
    const response = await fetch('/api/v1/rbac/check', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tool,
        params,
        agentId: context.agentId,
        role: context.role,
        storyId: context.storyId,
        sessionId: context.sessionId,
      }),
    });

    if (!response.ok) {
      return {
        allowed: false,
        reason: `RBAC service error: ${response.status}`,
        requiresEscalation: true,
      };
    }

    return await response.json();
  } catch (error) {
    return {
      allowed: false,
      reason: `RBAC check failed: ${error}`,
      requiresEscalation: true,
    };
  }
}

/**
 * Wrapper for agent tool execution with RBAC pre-check
 */
export async function withRBAC<T>(
  tool: ToolName,
  params: Record<string, unknown>,
  context: AgentContext,
  execute: () => Promise<T>
): Promise<{ success: boolean; result?: T; error?: string; escalated?: boolean }> {
  const permission = await checkPermission(tool, params, context);

  if (!permission.allowed) {
    return {
      success: false,
      error: permission.reason,
      escalated: permission.requiresEscalation,
    };
  }

  try {
    const result = await execute();
    return { success: true, result };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Execution failed',
    };
  }
}
