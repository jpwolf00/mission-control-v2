#!/usr/bin/env ts-node
/**
 * Recovery Monitor CLI
 * 
 * Run anomaly detection checks manually or via cron.
 * 
 * Usage:
 *   npm run recovery:check           # Run checks without escalation
 *   npm run recovery:check --escalate # Run checks and escalate issues
 *   npm run recovery:health          # Get health status
 */

import { runRecoveryMonitor, getRecoveryHealth } from '../src/lib/recovery-monitor';

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  if (command === 'health') {
    const health = await getRecoveryHealth();
    console.log('\n=== Recovery Health Status ===');
    console.log(`Status: ${health.status.toUpperCase()}`);
    console.log(`Active Sessions: ${health.activeSessions}`);
    console.log(`Stale Sessions: ${health.staleSessions}`);
    console.log(`Recent Anomalies (1h): ${health.recentAnomalies}`);
    console.log(`Recent Escalations (1h): ${health.recentEscalations}`);
    console.log(`Last Check: ${health.lastCheck?.toISOString() || 'Never'}`);
    console.log('');
    process.exit(0);
  }

  if (command === 'check') {
    const escalate = args.includes('--escalate');
    console.log(`\n=== Running Recovery Check ${escalate ? '(with escalation)' : ''} ===`);
    
    const result = await runRecoveryMonitor({
      checkIntervalMs: 5 * 60 * 1000,
      escalationCooldownMs: 30 * 60 * 1000,
      pingBeforeEscalate: true,
      autoResolveGhostLocks: false,
    });

    console.log(`\nAnomalies Detected: ${result.anomaliesDetected}`);
    console.log(`Escalations Sent: ${result.escalationsSent}`);
    console.log(`Pings Sent: ${result.pingsSent}`);

    if (result.anomalies.length > 0) {
      console.log('\nAnomalies:');
      for (const anomaly of result.anomalies) {
        console.log(`  - [${anomaly.severity.toUpperCase()}] ${anomaly.type}: ${anomaly.details.description}`);
        if (anomaly.storyId) console.log(`    Story: ${anomaly.storyId}`);
        if (anomaly.sessionId) console.log(`    Session: ${anomaly.sessionId}`);
        if (anomaly.gate) console.log(`    Gate: ${anomaly.gate}`);
      }
    }

    console.log('');
    process.exit(result.anomaliesDetected > 0 ? 1 : 0);
  }

  // Default: show help
  console.log(`
Recovery Monitor CLI

Usage:
  npm run recovery:check           # Run anomaly detection
  npm run recovery:check --escalate # Run and escalate issues
  npm run recovery:health          # Show health status

Examples:
  npx ts-node scripts/recovery-monitor.ts check
  npx ts-node scripts/recovery-monitor.ts check --escalate
  npx ts-node scripts/recovery-monitor.ts health
`);
  process.exit(0);
}

main().catch((error) => {
  console.error('Recovery monitor error:', error);
  process.exit(1);
});
