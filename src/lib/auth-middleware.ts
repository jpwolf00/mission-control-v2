// Auth middleware for Mission Control API
// Validates API key from Authorization header

import { NextRequest, NextResponse } from 'next/server';
import { getEnv } from './env';

// Get valid API keys from environment
function getValidApiKeys(): string[] {
  const env = getEnv();
  return env.MC2_API_KEYS.split(',').map(k => k.trim()).filter(Boolean);
}

/**
 * Validate API key from request headers
 */
export function validateAuth(request: NextRequest): { valid: boolean; error?: string; agentId?: string } {
  const VALID_API_KEYS = getValidApiKeys();
  
  const authHeader = request.headers.get('authorization');
  
  // If no auth header, check for API key in custom header
  const apiKey = authHeader?.replace(/^Bearer\s+/i, '') || request.headers.get('x-mc2-api-key');
  
  if (!apiKey) {
    return { valid: false, error: 'Missing authentication credentials' };
  }
  
  // Validate API key
  if (!VALID_API_KEYS.includes(apiKey)) {
    return { valid: false, error: 'Invalid API key' };
  }
  
  // Extract agent ID from header if present (for callback tracking)
  const agentId = request.headers.get('x-agent-id') || 'unknown';
  
  return { valid: true, agentId };
}

/**
 * Require authentication middleware - returns error response if invalid
 */
export function requireAuth(request: NextRequest): NextResponse | null {
  const auth = validateAuth(request);
  
  if (!auth.valid) {
    return NextResponse.json(
      { error: 'Unauthorized', message: auth.error },
      { status: 401 }
    );
  }
  
  return null; // Auth valid, proceed
}

/**
 * Require specific role for access
 */
export function requireRole(request: NextRequest, allowedRoles: string[]): { valid: boolean; error?: string; role?: string } {
  const auth = validateAuth(request);
  
  if (!auth.valid) {
    return { valid: false, error: auth.error };
  }
  
  const role = request.headers.get('x-agent-role') || 'unknown';
  
  if (!allowedRoles.includes(role)) {
    return { valid: false, error: `Access denied. Required roles: ${allowedRoles.join(', ')}` };
  }
  
  return { valid: true, role };
}
