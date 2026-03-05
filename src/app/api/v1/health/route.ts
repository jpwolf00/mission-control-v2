import { NextResponse } from 'next/server';
import { checkDatabaseHealth, checkOrchestratorHealth } from '@/services/health-checks';

export async function GET() {
  const [dbHealth, orchestratorHealth] = await Promise.all([
    checkDatabaseHealth(),
    checkOrchestratorHealth(),
  ]);

  const isHealthy = dbHealth.status === 'healthy' && orchestratorHealth.status === 'healthy';
  const isDegraded = dbHealth.status === 'degraded' || orchestratorHealth.status === 'degraded';

  const status = isHealthy ? 'healthy' : isDegraded ? 'degraded' : 'unhealthy';
  const statusCode = isHealthy ? 200 : isDegraded ? 200 : 503;

  return NextResponse.json(
    {
      status,
      timestamp: new Date().toISOString(),
      components: {
        app: { status: 'healthy', version: process.env.npm_package_version || '0.1.0' },
        database: dbHealth,
        orchestrator: orchestratorHealth,
      },
    },
    { status: statusCode }
  );
}
