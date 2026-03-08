import { ToolName, ToolPermission, AgentRole } from '@/domain/agent-roles';

/**
 * Role-based access control for agent tool calls
 * Enforces that agents can only use tools appropriate for their role
 */

export const AGENT_ROLES: Record<string, AgentRole> = {
  architect: {
    id: 'architect',
    name: 'Architect',
    description: 'Design and specification',
    gates: ['architect'],
    permissions: [
      { tool: 'read', action: 'allow' },
      { tool: 'write', action: 'scoped', scope: 'docs/' },
      { tool: 'edit', action: 'deny' },
      { tool: 'exec', action: 'deny' },
      { tool: 'web_search', action: 'allow' },
      { tool: 'web_fetch', action: 'allow' },
      { tool: 'sessions_spawn', action: 'deny' },
      { tool: 'subagents', action: 'deny' },
    ],
    evidenceRequirements: ['SPEC.md exists'],
  },
  
  'ui-designer': {
    id: 'ui-designer',
    name: 'UX Designer',
    description: 'Frontend/UX scope validation and design guidance',
    gates: ['ui-designer'],
    permissions: [
      { tool: 'read', action: 'allow' },
      { tool: 'write', action: 'scoped', scope: 'docs/' },
      { tool: 'edit', action: 'scoped', scope: 'docs/' },
      { tool: 'browser', action: 'allow' },
      { tool: 'web_search', action: 'allow' },
      { tool: 'web_fetch', action: 'allow' },
      { tool: 'exec', action: 'deny' },
      { tool: 'sessions_spawn', action: 'deny' },
      { tool: 'subagents', action: 'deny' },
    ],
    evidenceRequirements: ['UI scope assessed (or explicitly waived)'],
  },

  implementer: {
    id: 'implementer',
    name: 'Implementer',
    description: 'Code implementation',
    gates: ['implementer'],
    permissions: [
      { tool: 'read', action: 'allow' },
      { tool: 'write', action: 'scoped', scope: 'src/' },
      { tool: 'edit', action: 'scoped', scope: 'src/' },
      { tool: 'exec', action: 'scoped', scope: 'npm test, npm run build' },
      { tool: 'web_search', action: 'allow' },
      { tool: 'web_fetch', action: 'allow' },
      { tool: 'sessions_spawn', action: 'deny' },
      { tool: 'subagents', action: 'deny' },
    ],
    evidenceRequirements: ['npm test passes', 'npm run build succeeds'],
  },
  
  'reviewer-a': {
    id: 'reviewer-a',
    name: 'Reviewer A',
    description: 'Code quality assurance',
    gates: ['reviewer-a'],
    permissions: [
      { tool: 'read', action: 'allow' },
      { tool: 'write', action: 'deny' },
      { tool: 'edit', action: 'deny' },
      { tool: 'exec', action: 'scoped', scope: 'validation scripts' },
      { tool: 'browser', action: 'allow' },
      { tool: 'web_fetch', action: 'allow' },
      { tool: 'sessions_spawn', action: 'deny' },
      { tool: 'subagents', action: 'deny' },
    ],
    evidenceRequirements: ['API tests pass', 'No critical issues'],
  },
  
  operator: {
    id: 'operator',
    name: 'Operator',
    description: 'Deployment operations',
    gates: ['operator'],
    permissions: [
      { tool: 'read', action: 'allow' },
      { tool: 'write', action: 'deny' },
      { tool: 'edit', action: 'deny' },
      { tool: 'exec', action: 'scoped', scope: 'deploy scripts only' },
      { tool: 'sessions_spawn', action: 'deny' },
      { tool: 'subagents', action: 'deny' },
    ],
    evidenceRequirements: ['Health check 200', 'Backup created'],
  },
  
  'reviewer-b': {
    id: 'reviewer-b',
    name: 'Reviewer B',
    description: 'Production validation',
    gates: ['reviewer-b'],
    permissions: [
      { tool: 'read', action: 'allow' },
      { tool: 'write', action: 'deny' },
      { tool: 'edit', action: 'deny' },
      { tool: 'exec', action: 'scoped', scope: 'health checks only' },
      { tool: 'browser', action: 'allow' },
      { tool: 'sessions_spawn', action: 'deny' },
      { tool: 'subagents', action: 'deny' },
    ],
    evidenceRequirements: ['Prod health check passes'],
  },
};

export interface ToolCallRequest {
  tool: ToolName;
  params: Record<string, unknown>;
  agentId: string;
  role: string;
  storyId: string;
}

export interface ToolCallResult {
  allowed: boolean;
  reason?: string;
  requiresEscalation?: boolean;
}

/**
 * Check if a tool call is permitted for the agent's role
 */
export function checkToolPermission(
  request: ToolCallRequest
): ToolCallResult {
  const role = AGENT_ROLES[request.role];
  
  if (!role) {
    return {
      allowed: false,
      reason: `Unknown role: ${request.role}`,
      requiresEscalation: true,
    };
  }
  
  const permission = role.permissions.find(p => p.tool === request.tool);
  
  if (!permission) {
    return {
      allowed: false,
      reason: `No permission defined for tool: ${request.tool}`,
      requiresEscalation: true,
    };
  }
  
  switch (permission.action) {
    case 'allow':
      return { allowed: true };
      
    case 'deny':
      return {
        allowed: false,
        reason: `Tool '${request.tool}' is forbidden for role '${request.role}'`,
        requiresEscalation: true,
      };
      
    case 'scoped':
      // Additional scope validation would happen here
      // For now, we allow scoped tools but log the scope
      console.log(`[RBAC] Scoped tool call: ${request.tool} by ${request.role} (scope: ${permission.scope})`);
      return { allowed: true };
      
    default:
      return {
        allowed: false,
        reason: `Unknown permission action: ${permission.action}`,
        requiresEscalation: true,
      };
  }
}

/**
 * Validate that an agent is assigned to the correct gate
 */
export function validateGateAssignment(
  role: string,
  gate: string
): { valid: boolean; reason?: string } {
  const roleConfig = AGENT_ROLES[role];
  
  if (!roleConfig) {
    return { valid: false, reason: `Unknown role: ${role}` };
  }
  
  if (!roleConfig.gates.includes(gate)) {
    return {
      valid: false,
      reason: `Role '${role}' cannot be assigned to gate '${gate}'. Allowed gates: ${roleConfig.gates.join(', ')}`,
    };
  }
  
  return { valid: true };
}

/**
 * Get evidence requirements for a role
 */
export function getEvidenceRequirements(role: string): string[] {
  return AGENT_ROLES[role]?.evidenceRequirements || [];
}

/**
 * Log a forbidden tool attempt for audit
 */
export function logForbiddenAttempt(
  request: ToolCallRequest,
  reason: string
): void {
  console.error(`[RBAC VIOLATION] Agent ${request.agentId} (${request.role}) attempted forbidden tool: ${request.tool}`);
  console.error(`  Reason: ${reason}`);
  console.error(`  Story: ${request.storyId}`);
  console.error(`  Params:`, request.params);
  
  // In production, this would also:
  // - Send alert to human operator
  // - Write to audit log
  // - Potentially kill the agent session
}