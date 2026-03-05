# Metrics Emitter (MC2-E8)

> Structured metrics collection for Mission Control observability

## Overview

The Metrics Emitter provides a centralized service for collecting and reporting observability metrics related to gate operations, including duration, failures, retries, and stuck run detection.

## Installation

The metrics emitter is included in the Mission Control codebase. No additional installation required.

```typescript
import { MetricsEmitter, getMetricsEmitter } from '@/lib/services/metrics-emitter';
```

## Features

- **Gate Duration Tracking** - Measure how long gates take to execute
- **Failure Rate Monitoring** - Track success/failure ratios per gate
- **Retry Counting** - Monitor retry attempts across gates
- **Stuck Run Detection** - Count runs that exceed expected duration thresholds
- **In-Memory Collection** - Efficient storage with configurable limits
- **Flush Capability** - Export and clear metrics on demand
- **Real-time Subscriptions** - Subscribe to metric events as they occur

## Usage

### Basic Usage

```typescript
import { MetricsEmitter } from '@/lib/services/metrics-emitter';

// Create a new emitter instance
const emitter = new MetricsEmitter();

// Emit metrics
emitter.emitGateDuration('deploy-gate', 4500); // 4.5 seconds
emitter.emitFailureRate('deploy-gate', 100, 5); // 5% failure rate
emitter.emitRetries('deploy-gate', 3); // 3 retries
emitter.emitStuckRun('deploy-gate', 1, 300000); // 1 stuck run over 5 min threshold
```

### Using the Singleton

```typescript
import { getMetricsEmitter } from '@/lib/services/metrics-emitter';

const emitter = getMetricsEmitter();
emitter.emitGateDuration('test-gate', 2000);
```

### Retrieving Metrics

```typescript
// Get all metrics
const allMetrics = emitter.getAllMetrics();

// Get metrics by type
const durations = emitter.getMetricsByType('gate_duration');
const failures = emitter.getMetricsByType('failure_rate');

// Get metrics for a specific gate
const gateMetrics = emitter.getMetricsForGate('deploy-gate');
```

### Aggregated Statistics

```typescript
const stats = emitter.getAggregatedStats();
/*
{
  totalGateDurations: 15,
  avgGateDurationMs: 3250,
  totalFailures: 7,
  avgFailureRate: 0.08,
  totalRetries: 12,
  totalStuckRuns: 2,
  gatesWithData: ['deploy-gate', 'test-gate', 'build-gate']
}
*/
```

### Flushing Metrics

```typescript
// Export and clear all metrics
const flushed = emitter.flush();

// Or just reset without returning
emitter.reset();
```

### Subscribing to Metrics

```typescript
const unsubscribe = emitter.subscribe((metrics) => {
  console.log('New metrics:', metrics);
  
  // Send to external system (e.g., DataDog, Prometheus)
  // await sendToMetricsBackend(metrics);
});

// Later, stop receiving updates
unsubscribe();
```

## Configuration

### Custom Max Metrics

```typescript
// Limit to last 500 metrics per type
const emitter = new MetricsEmitter(500);
```

## Metric Types

### Gate Duration

```typescript
interface GateMetric {
  id: string;
  type: 'gate_duration';
  gateId: string;
  durationMs: number;
  timestamp: number;
  metadata?: Record<string, unknown>;
}
```

### Failure Rate

```typescript
interface FailureMetric {
  id: string;
  type: 'failure_rate';
  gateId: string;
  totalRuns: number;
  failedRuns: number;
  failureRate: number;
  timestamp: number;
  metadata?: Record<string, unknown>;
}
```

### Retries

```typescript
interface RetryMetric {
  id: string;
  type: 'retries';
  gateId: string;
  totalRetries: number;
  timestamp: number;
  metadata?: Record<string, unknown>;
}
```

### Stuck Runs

```typescript
interface StuckRunMetric {
  id: string;
  type: 'stuck_run';
  gateId: string;
  stuckCount: number;
  thresholdMs: number;
  timestamp: number;
  metadata?: Record<string, unknown>;
}
```

## Integration with Gate Contracts

The metrics emitter integrates with the gate contracts system:

```typescript
import { MetricsEmitter } from '@/lib/services/metrics-emitter';
import { executeGate } from '@/lib/gate-contracts';

const emitter = new MetricsEmitter();

async function monitoredGateExecution(gateId: string, fn: () => Promise<void>) {
  const startTime = Date.now();
  
  try {
    await fn();
    const duration = Date.now() - startTime;
    emitter.emitGateDuration(gateId, duration);
  } catch (error) {
    const duration = Date.now() - startTime;
    emitter.emitGateDuration(gateId, duration);
    emitter.emitFailureRate(gateId, 1, 1);
    throw error;
  }
}
```

## Testing

Run tests with:

```bash
npm test -- src/lib/services/metrics-emitter.test.ts
```

## Best Practices

1. **Use the singleton** for application-wide metrics collection
2. **Add metadata** to metrics for detailed debugging
3. **Subscribe to metrics** for real-time export to monitoring systems
4. **Flush regularly** to prevent memory buildup in long-running processes
5. **Monitor stuck runs** with appropriate thresholds for your gates
