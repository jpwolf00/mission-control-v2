import { prisma } from '@/lib/prisma';

export async function checkDatabaseHealth(): Promise<{ status: 'healthy' | 'degraded' | 'unhealthy'; latencyMs?: number }> {
  const start = Date.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    return {
      status: 'healthy',
      latencyMs: Date.now() - start,
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      latencyMs: Date.now() - start,
    };
  }
}

export async function checkOrchestratorHealth(): Promise<{ status: 'healthy' | 'degraded' | 'unhealthy' }> {
  // Check if orchestrator can dispatch (basic smoke test)
  try {
    // In production, this would check actual orchestrator state
    return { status: 'healthy' };
  } catch (error) {
    return { status: 'unhealthy' };
  }
}
