// Circuit breaker service - simplified stub

export enum CircuitState {
  CLOSED = 'CLOSED',
  OPEN = 'OPEN',
  HALF_OPEN = 'HALF_OPEN',
}

export interface CircuitBreakerConfig {
  failureThreshold: number;
  successThreshold: number;
  timeout: number;
}

export class CircuitBreaker {
  private state: CircuitState = CircuitState.CLOSED;
  private failures: number = 0;
  
  constructor(private config: CircuitBreakerConfig) {}
  
  getState(): CircuitState {
    return this.state;
  }
  
  recordSuccess(): void {
    this.failures = 0;
    this.state = CircuitState.CLOSED;
  }
  
  recordFailure(): void {
    this.failures++;
    if (this.failures >= this.config.failureThreshold) {
      this.state = CircuitState.OPEN;
    }
  }
  
  canExecute(): boolean {
    return this.state !== CircuitState.OPEN;
  }
}

export function createCircuitBreaker(config: CircuitBreakerConfig): CircuitBreaker {
  return new CircuitBreaker(config);
}
