// Metrics emitter service - simplified stub

export interface Metric {
  timestamp: number;
  name: string;
  value: number;
  tags?: Record<string, string>;
}

export class MetricsCollector {
  private metrics: Metric[] = [];
  
  emit(name: string, value: number, tags?: Record<string, string>): void {
    this.metrics.push({
      timestamp: Date.now(),
      name,
      value,
      tags,
    });
    
    // Keep only last 1000 metrics
    if (this.metrics.length > 1000) {
      this.metrics = this.metrics.slice(-1000);
    }
  }
  
  getMetrics(): Metric[] {
    return this.metrics;
  }
  
  clear(): void {
    this.metrics = [];
  }
}

export const metrics = new MetricsCollector();

export function emitMetric(name: string, value: number, tags?: Record<string, string>): void {
  metrics.emit(name, value, tags);
}

export function getMetrics(): Metric[] {
  return metrics.getMetrics();
}
