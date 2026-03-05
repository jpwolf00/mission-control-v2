import { ToolName } from '@/domain/agent-roles';

/**
 * RBAC Client for Agents
 * 
 * Agents use this to validate tool calls before execution.
 * If permission denied, call is blocked and logged.
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
 * Check if a tool call is permitted
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
 * Wrapper for agent tool execution with RBAC
 * 
 * Usage:
 * ```typescript
 * const result = await withRBAC('exec', { command: 'npm test' }, context, async () => {
 *   return await exec({ command: 'npm test' });
 * });
 * ```
 */
export async function withRBAC<T>(
  tool: ToolName,
  params: Record<string, unknown>,
  context: AgentContext,
  execute: () => Promise<T>
): Promise<{ success: boolean; result?: T; error?: string; escalated?: boolean }> {
  // Check permission
  const permission = await checkPermission(tool, params, context);
  
  if (!permission.allowed) {
    return {
      success: false,
      error: permission.reason,
      escalated: permission.requiresEscalation,
    };
  }
  
  // Execute the tool
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

/**
 * Create an RBAC-protected tool wrapper for an agent
 */
export function createRBACAgent(context: AgentContext) {
  return {
    context,
    
    async read(params: { file_path: string }) {
      return withRBAC('read', params, context, async () => {
        // Actual read implementation
        const response = await fetch('/api/v1/files/read', {
          method: 'POST',
          body: JSON.stringify(params),
        });
        return response.json();
      });
    },
    
    async write(params: { file_path: string; content: string }) {
      return withRBAC('write', params, context, async () => {
        const response = await fetch('/api/v1/files/write', {
          method: 'POST',
          body: JSON.stringify(params),
        });
        return response.json();
      });
    },
    
    async edit(params: { file_path: string; oldText: string; newText: string }) {
      return withRBAC('edit', params, context, async () => {
        const response = await fetch('/api/v1/files/edit', {
          method: 'POST',
          body: JSON.stringify(params),
        });
        return response.json();
      });
    },
    
    async exec(params: { command: string }) {
      return withRBAC('exec', params, context, async () => {
        const response = await fetch('/api/v1/exec', {
          method: 'POST',
          body: JSON.stringify(params),
        });
        return response.json();
      });
    },
    
    async webSearch(params: { query: string }) {
      return withRBAC('web_search', params, context, async () => {
        const response = await fetch('/api/v1/search', {
          method: 'POST',
          body: JSON.stringify(params),
        });
        return response.json();
      });
    },
    
    async webFetch(params: { url: string }) {
      return withRBAC('web_fetch', params, context, async () => {
        const response = await fetch('/api/v1/fetch', {
          method: 'POST',
          body: JSON.stringify(params),
        });
        return response.json();
      });
    },
  };
}

/**
 * Hook for React components to check agent permissions
 */
export function useRBAC(context: AgentContext) {
  return {
    checkPermission: (tool: ToolName, params?: Record<string, unknown>) =>
      checkPermission(tool, params || {}, context),
    
    canRead: () => checkPermission('read', {}, context),
    canWrite: () => checkPermission('write', {}, context),
    canEdit: () => checkPermission('edit', {}, context),
    canExec: () => checkPermission('exec', {}, context),
    
    createProtectedAgent: () => createRBACAgent(context),
  };
}