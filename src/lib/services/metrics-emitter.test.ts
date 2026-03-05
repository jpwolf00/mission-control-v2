import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  MetricsEmitter,
  getMetricsEmitter,
  resetMetricsEmitter,
  type Metric,
  type GateMetric,
  type FailureMetric,
  type RetryMetric,
  type StuckRunMetric,
} from './metrics-emitter';

describe('MetricsEmitter', () => {
  let emitter: MetricsEmitter;

  beforeEach(() => {
    resetMetricsEmitter();
    emitter = new MetricsEmitter(100);
  });

  describe('emitGateDuration', () => {
    it('should emit a gate duration metric', () => {
      const metric = emitter.emitGateDuration('gate-1', 1500);

      expect(metric.type).toBe('gate_duration');
      expect(metric.gateId).toBe('gate-1');
      expect(metric.durationMs).toBe(1500);
      expect(metric.id).toBeDefined();
      expect(metric.timestamp).toBeDefined();
    });

    it('should accept metadata', () => {
      const metadata = { sessionId: 'session-123', agentId: 'agent-1' };
      const metric = emitter.emitGateDuration('gate-1', 1500, metadata);

      expect(metric.metadata).toEqual(metadata);
    });

    it('should collect multiple metrics', () => {
      emitter.emitGateDuration('gate-1', 1000);
      emitter.emitGateDuration('gate-2', 2000);
      emitter.emitGateDuration('gate-1', 3000);

      const metrics = emitter.getMetricsByType('gate_duration');
      expect(metrics).toHaveLength(3);
    });
  });

  describe('emitFailureRate', () => {
    it('should emit a failure rate metric', () => {
      const metric = emitter.emitFailureRate('gate-1', 100, 10);

      expect(metric.type).toBe('failure_rate');
      expect(metric.gateId).toBe('gate-1');
      expect(metric.totalRuns).toBe(100);
      expect(metric.failedRuns).toBe(10);
      expect(metric.failureRate).toBe(0.1);
    });

    it('should handle zero runs', () => {
      const metric = emitter.emitFailureRate('gate-1', 0, 0);

      expect(metric.failureRate).toBe(0);
    });

    it('should calculate failure rate correctly', () => {
      const metric = emitter.emitFailureRate('gate-1', 50, 25);

      expect(metric.failureRate).toBe(0.5);
    });
  });

  describe('emitRetries', () => {
    it('should emit a retry metric', () => {
      const metric = emitter.emitRetries('gate-1', 3);

      expect(metric.type).toBe('retries');
      expect(metric.gateId).toBe('gate-1');
      expect(metric.totalRetries).toBe(3);
    });
  });

  describe('emitStuckRun', () => {
    it('should emit a stuck run metric', () => {
      const metric = emitter.emitStuckRun('gate-1', 2, 300000);

      expect(metric.type).toBe('stuck_run');
      expect(metric.gateId).toBe('gate-1');
      expect(metric.stuckCount).toBe(2);
      expect(metric.thresholdMs).toBe(300000);
    });

    it('should use default threshold', () => {
      const metric = emitter.emitStuckRun('gate-1', 1);

      expect(metric.thresholdMs).toBe(300000);
    });
  });

  describe('getMetricsByType', () => {
    it('should return metrics by type', () => {
      emitter.emitGateDuration('gate-1', 1000);
      emitter.emitFailureRate('gate-1', 100, 10);
      emitter.emitRetries('gate-1', 2);

      const gateDurations = emitter.getMetricsByType('gate_duration');
      const failureRates = emitter.getMetricsByType('failure_rate');
      const retries = emitter.getMetricsByType('retries');

      expect(gateDurations).toHaveLength(1);
      expect(failureRates).toHaveLength(1);
      expect(retries).toHaveLength(1);
    });
  });

  describe('getMetricsForGate', () => {
    it('should return metrics for a specific gate', () => {
      emitter.emitGateDuration('gate-1', 1000);
      emitter.emitGateDuration('gate-2', 2000);
      emitter.emitFailureRate('gate-1', 100, 10);

      const gate1Metrics = emitter.getMetricsForGate('gate-1');

      expect(gate1Metrics.gateDurations).toHaveLength(1);
      expect(gate1Metrics.failureRates).toHaveLength(1);
      expect(gate1Metrics.gateDurations[0].gateId).toBe('gate-1');
    });
  });

  describe('flush', () => {
    it('should return all metrics and clear collector', () => {
      emitter.emitGateDuration('gate-1', 1000);
      emitter.emitRetries('gate-1', 2);

      const flushed = emitter.flush();

      expect(flushed.gateDurations).toHaveLength(1);
      expect(flushed.retries).toHaveLength(1);

      // Collector should be reset
      const allMetrics = emitter.getAllMetrics();
      expect(allMetrics.gateDurations).toHaveLength(0);
      expect(allMetrics.retries).toHaveLength(0);
    });
  });

  describe('reset', () => {
    it('should clear all metrics without returning them', () => {
      emitter.emitGateDuration('gate-1', 1000);
      emitter.emitRetries('gate-1', 2);

      emitter.reset();

      const allMetrics = emitter.getAllMetrics();
      expect(allMetrics.gateDurations).toHaveLength(0);
      expect(allMetrics.retries).toHaveLength(0);
    });
  });

  describe('getAggregatedStats', () => {
    it('should return aggregated statistics', () => {
      emitter.emitGateDuration('gate-1', 1000);
      emitter.emitGateDuration('gate-1', 2000);
      emitter.emitGateDuration('gate-2', 3000);
      emitter.emitFailureRate('gate-1', 100, 10);
      emitter.emitFailureRate('gate-2', 50, 5);
      emitter.emitRetries('gate-1', 3);
      emitter.emitStuckRun('gate-1', 1);

      const stats = emitter.getAggregatedStats();

      expect(stats.totalGateDurations).toBe(3);
      expect(stats.avgGateDurationMs).toBe(2000);
      expect(stats.totalFailures).toBe(15);
      expect(stats.avgFailureRate).toBe(0.1);
      expect(stats.totalRetries).toBe(3);
      expect(stats.totalStuckRuns).toBe(1);
      expect(stats.gatesWithData).toContain('gate-1');
      expect(stats.gatesWithData).toContain('gate-2');
    });

    it('should handle empty collector', () => {
      const stats = emitter.getAggregatedStats();

      expect(stats.totalGateDurations).toBe(0);
      expect(stats.avgGateDurationMs).toBe(0);
      expect(stats.totalFailures).toBe(0);
      expect(stats.avgFailureRate).toBe(0);
      expect(stats.totalRetries).toBe(0);
      expect(stats.totalStuckRuns).toBe(0);
      expect(stats.gatesWithData).toHaveLength(0);
    });
  });

  describe('maxMetricsPerType', () => {
    it('should limit metrics to max size', () => {
      const limitedEmitter = new MetricsEmitter(3);

      limitedEmitter.emitGateDuration('gate-1', 1000);
      limitedEmitter.emitGateDuration('gate-2', 2000);
      limitedEmitter.emitGateDuration('gate-3', 3000);
      limitedEmitter.emitGateDuration('gate-4', 4000);

      const metrics = limitedEmitter.getMetricsByType('gate_duration');
      expect(metrics).toHaveLength(3);
      // Should keep the most recent 3 (2000, 3000, 4000)
      expect(metrics[0].durationMs).toBe(2000);
      expect(metrics[2].durationMs).toBe(4000);
    });
  });

  describe('subscription', () => {
    it('should notify subscribers of new metrics', () => {
      const listener = vi.fn();
      emitter.subscribe(listener);

      emitter.emitGateDuration('gate-1', 1000);

      expect(listener).toHaveBeenCalledTimes(1);
      expect(listener).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ type: 'gate_duration', durationMs: 1000 }),
        ])
      );
    });

    it('should allow unsubscribing', () => {
      const listener = vi.fn();
      const unsubscribe = emitter.subscribe(listener);

      emitter.emitGateDuration('gate-1', 1000);
      expect(listener).toHaveBeenCalledTimes(1);

      unsubscribe();
      emitter.emitGateDuration('gate-2', 2000);
      expect(listener).toHaveBeenCalledTimes(1);
    });
  });

  describe('getMetricsEmitter singleton', () => {
    it('should return the same instance', () => {
      const emitter1 = getMetricsEmitter();
      const emitter2 = getMetricsEmitter();

      expect(emitter1).toBe(emitter2);
    });

    it('should reset between tests', () => {
      const emitter1 = getMetricsEmitter();
      emitter1.emitGateDuration('gate-1', 1000);

      resetMetricsEmitter();

      const emitter2 = getMetricsEmitter();
      const metrics = emitter2.getMetricsByType('gate_duration');
      expect(metrics).toHaveLength(0);
    });
  });
});
