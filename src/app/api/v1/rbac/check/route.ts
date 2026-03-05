import { NextRequest, NextResponse } from 'next/server';
import { checkToolPermission, logForbiddenAttempt } from '@/services/role-permissions';
import { ToolName } from '@/domain/agent-roles';

/**
 * RBAC Middleware for Agent Tool Calls
 * 
 * This endpoint validates that agents can only use tools permitted by their role.
 * All agent tool calls should be routed through this endpoint.
 */

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const { 
      tool, 
      params, 
      agentId, 
      role, 
      storyId,
      sessionId 
    } = body;
    
    // Validate required fields
    if (!tool || !agentId || !role || !storyId) {
      return NextResponse.json(
        { error: 'Missing required fields: tool, agentId, role, storyId' },
        { status: 400 }
      );
    }
    
    // Check permission
    const result = checkToolPermission({
      tool: tool as ToolName,
      params: params || {},
      agentId,
      role,
      storyId,
    });
    
    // Log if forbidden
    if (!result.allowed) {
      logForbiddenAttempt(
        { tool: tool as ToolName, params: params || {}, agentId, role, storyId },
        result.reason || 'Unknown'
      );
      
      // Store violation in database
      await storeViolation({
        sessionId: sessionId || 'unknown',
        agentId,
        role,
        attemptedTool: tool as ToolName,
        reason: result.reason || 'Unknown',
        escalated: result.requiresEscalation || false,
      });
    }
    
    return NextResponse.json({
      allowed: result.allowed,
      reason: result.reason,
      requiresEscalation: result.requiresEscalation,
    });
    
  } catch (error) {
    console.error('RBAC check error:', error);
    return NextResponse.json(
      { error: 'Internal RBAC error' },
      { status: 500 }
    );
  }
}

async function storeViolation(violation: {
  sessionId: string;
  agentId: string;
  role: string;
  attemptedTool: ToolName;
  reason: string;
  escalated: boolean;
}) {
  // In production, this would write to the database
  // For now, just log
  console.log('[RBAC] Violation stored:', violation);
}