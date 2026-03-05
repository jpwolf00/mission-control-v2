/**
 * Agent role domain types
 * Defines the structure for role-based access control
 */

export type AgentRoleId = 
  | 'architect' 
  | 'implementer' 
  | 'reviewer-a' 
  | 'operator' 
  | 'reviewer-b';

export type ToolName =
  | 'read'
  | 'write'
  | 'edit'
  | 'exec'
  | 'web_search'
  | 'web_fetch'
  | 'browser'
  | 'sessions_spawn'
  | 'subagents'
  | 'process'
  | 'exec'
  | 'message';

export type PermissionAction = 'allow' | 'deny' | 'scoped';

export interface ToolPermission {
  tool: ToolName;
  action: PermissionAction;
  scope?: string;
}

export interface AgentRole {
  id: AgentRoleId;
  name: string;
  description: string;
  gates: string[];
  permissions: ToolPermission[];
  evidenceRequirements: string[];
}

export interface AgentSession {
  id: string;
  agentId: string;
  role: AgentRoleId;
  storyId: string;
  gate: string;
  startedAt: Date;
  toolCalls: ToolCall[];
  status: 'active' | 'completed' | 'failed' | 'escalated';
}

export interface ToolCall {
  id: string;
  tool: ToolName;
  params: Record<string, unknown>;
  timestamp: Date;
  allowed: boolean;
  reason?: string;
}

export interface RBACViolation {
  id: string;
  sessionId: string;
  agentId: string;
  role: AgentRoleId;
  attemptedTool: ToolName;
  reason: string;
  timestamp: Date;
  escalated: boolean;
  resolution?: 'blocked' | 'approved' | 'role-changed';
}