/**
 * Metrics Emitter Service
 * 
 * Provides structured metrics collection for observability:
 * - Gate duration metrics
 * - Failure rate metrics
 * - Retry counts
 * - Stuck run detection counts
 * 
 * Features:
 * - In-memory collection with configurable flush capability
 * - Thread-safe operations
 * - Export to external systems (optional)
 */

import { v4 as uuidv4 } from 'uuid';

// Metric types
export type MetricType = 'gate_duration' | 'failure_rate' | 'retries' | 'stuck_run';

export interface GateMetric {
  id: string;
  type: 'gate_duration';
  gateId: string;
  durationMs: number;
  timestamp: number;
  metadata?: Record<string, unknown>;
}

export interface FailureMetric {
  id: string;
  type: 'failure_rate';
  gateId: string;
  totalRuns: number;
  failedRuns: number;
  failureRate: number;
  timestamp: number;
  metadata?: Record<string, unknown>;
}

export interface RetryMetric {
  id: string;
  type: 'retries';
  gateId: string;
  totalRetries: number;
  timestamp: number;
  metadata?: Record<string, unknown>;
}

export interface StuckRunMetric {
  id: string;
  type: 'stuck_run';
  gateId: string;
  stuckCount: number;
  thresholdMs: number;
  timestamp: number;
  metadata?: Record<string, unknown>;
}

export type Metric = GateMetric | FailureMetric | RetryMetric | StuckRunMetric;

// Collector state
interface MetricsCollectorState {
  gateDurations: GateMetric[];
  failureRates: FailureMetric[];
  retries: RetryMetric[];
  stuckRuns: StuckRunMetric[];
}

/**
 * Metrics Emitter class
 * Collects and manages observability metrics in memory
 */
export class MetricsEmitter {
  private collector: MetricsCollectorState;
  private maxMetricsPerType: number;
  private listeners: ((metrics: Metric[]) => void)[];

  constructor(maxMetricsPerType: number = 1000) {
    this.collector = {
      gateDurations: [],
      failureRates: [],
      retries: [],
      stuckRuns: [],
    };
    this.maxMetricsPerType = maxMetricsPerType;
    this.listeners = [];
  }

  /**
   * Emit a gate duration metric
   */
  emitGateDuration(gateId: string, durationMs: number, metadata?: Record<string, unknown>): GateMetric {
    const metric: GateMetric = {
      id: uuidv4(),
      type: 'gate_duration',
      gateId,
      durationMs,
      timestamp: Date.now(),
      metadata,
    };
    
    this.addMetric('gateDurations', metric);
    this.notifyListeners([metric]);
    return metric;
  }

  /**
   * Emit a failure rate metric
   */
  emitFailureRate(gateId: string, totalRuns: number, failedRuns: number, metadata?: Record<string, unknown>): FailureMetric {
    const failureRate = totalRuns > 0 ? failedRuns / totalRuns : 0;
    
    const metric: FailureMetric = {
      id: uuidv4(),
      type: 'failure_rate',
      gateId,
      totalRuns,
      failedRuns,
      failureRate,
      timestamp: Date.now(),
      metadata,
    };
    
    this.addMetric('failureRates', metric);
    this.notifyListeners([metric]);
    return metric;
  }

  /**
   * Emit a retry count metric
   */
  emitRetries(gateId: string, totalRetries: number, metadata?: Record<string, unknown>): RetryMetric {
    const metric: RetryMetric = {
      id: uuidv4(),
      type: 'retries',
      gateId,
      totalRetries,
      timestamp: Date.now(),
      metadata,
    };
    
    this.addMetric('retries', metric);
    this.notifyListeners([metric]);
    return metric;
  }

  /**
   * Emit a stuck run count metric
   */
  emitStuckRun(gateId: string, stuckCount: number, thresholdMs: number = 300000, metadata?: Record<string, unknown>): StuckRunMetric {
    const metric: StuckRunMetric = {
      id: uuidv4(),
      type: 'stuck_run',
      gateId,
      stuckCount,
      thresholdMs,
      timestamp: Date.now(),
      metadata,
    };
    
    this.addMetric('stuckRuns', metric);
    this.notifyListeners([metric]);
    return metric;
  }

  /**
   * Add a metric to the collector, maintaining max size
   */
  private addMetric<K extends keyof MetricsCollectorState>(
    key: K,
    metric: MetricsCollectorState[K][number]
  ): void {
    this.collector[key].push(metric);
    
    // Trim if exceeding max
    if (this.collector[key].length > this.maxMetricsPerType) {
      this.collector[key] = this.collector[key].slice(-this.maxMetricsPerType);
    }
  }

  /**
   * Get all collected metrics
   */
  getAllMetrics(): MetricsCollectorState {
    return {
      gateDurations: [...this.collector.gateDurations],
      failureRates: [...this.collector.failureRates],
      retries: [...this.collector.retries],
      stuckRuns: [...this.collector.stuckRuns],
    };
  }

  /**
   * Get metrics by type
   */
  getMetricsByType(type: MetricType): Metric[] {
    switch (type) {
      case 'gate_duration':
        return [...this.collector.gateDurations];
      case 'failure_rate':
        return [...this.collector.failureRates];
      case 'retries':
        return [...this.collector.retries];
      case 'stuck_run':
        return [...this.collector.stuckRuns];
    }
  }

  /**
   * Get metrics for a specific gate
   */
  getMetricsForGate(gateId: string): MetricsCollectorState {
    return {
      gateDurations: this.collector.gateDurations.filter(m => m.gateId === gateId),
      failureRates: this.collector.failureRates.filter(m => m.gateId === gateId),
      retries: this.collector.retries.filter(m => m.gateId === gateId),
      stuckRuns: this.collector.stuckRuns.filter(m => m.gateId === gateId),
    };
  }

  /**
   * Flush all metrics and return them
   */
  flush(): MetricsCollectorState {
    const flushed = this.getAllMetrics();
    this.reset();
    return flushed;
  }

  /**
   * Reset all collected metrics
   */
  reset(): void {
    this.collector = {
      gateDurations: [],
      failureRates: [],
      retries: [],
      stuckRuns: [],
    };
  }

  /**
   * Get aggregated statistics
   */
  getAggregatedStats(): {
    totalGateDurations: number;
    avgGateDurationMs: number;
    totalFailures: number;
    avgFailureRate: number;
    totalRetries: number;
    totalStuckRuns: number;
    gatesWithData: string[];
  } {
    const gateDurations = this.collector.gateDurations;
    const failureRates = this.collector.failureRates;
    const retries = this.collector.retries;
    const stuckRuns = this.collector.stuckRuns;

    const allGateIds = new Set([
      ...gateDurations.map(m => m.gateId),
      ...failureRates.map(m => m.gateId),
      ...retries.map(m => m.gateId),
      ...stuckRuns.map(m => m.gateId),
    ]);

    return {
      totalGateDurations: gateDurations.length,
      avgGateDurationMs: gateDurations.length > 0
        ? gateDurations.reduce((sum, m) => sum + m.durationMs, 0) / gateDurations.length
        : 0,
      totalFailures: failureRates.reduce((sum, m) => sum + m.failedRuns, 0),
      avgFailureRate: failureRates.length > 0
        ? failureRates.reduce((sum, m) => sum + m.failureRate, 0) / failureRates.length
        : 0,
      totalRetries: retries.reduce((sum, m) => sum + m.totalRetries, 0),
      totalStuckRuns: stuckRuns.reduce((sum, m) => sum + m.stuckCount, 0),
      gatesWithData: Array.from(allGateIds),
    };
  }

  /**
   * Subscribe to metric events
   */
  subscribe(listener: (metrics: Metric[]) => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  /**
   * Notify all listeners of new metrics
   */
  private notifyListeners(metrics: Metric[]): void {
    for (const listener of this.listeners) {
      try {
        listener(metrics);
      } catch (error) {
        console.error('Metrics listener error:', error);
      }
    }
  }
}

// Default singleton instance
let defaultEmitter: MetricsEmitter | null = null;

/**
 * Get the default metrics emitter instance
 */
export function getMetricsEmitter(): MetricsEmitter {
  if (!defaultEmitter) {
    defaultEmitter = new MetricsEmitter();
  }
  return defaultEmitter;
}

/**
 * Reset the default metrics emitter (useful for testing)
 */
export function resetMetricsEmitter(): void {
  defaultEmitter = null;
}
