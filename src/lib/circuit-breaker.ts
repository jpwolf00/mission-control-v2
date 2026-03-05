/**
 * Circuit Breaker Pattern Implementation
 * 
 * Provides resilience against cascading failures by wrapping operations
 * that may fail repeatedly. States:
 * - CLOSED: Normal operation, requests pass through
 * - OPEN: Too many failures, requests fail fast
 * - HALF-OPEN: Testing if service recovered, limited requests allowed
 */

export enum CircuitState {
  CLOSED = 'closed',
  OPEN = 'open',
  HALF_OPEN = 'half-open'
}

export interface CircuitBreakerOptions {
  /** Number of failures before opening the circuit (default: 5) */
  failureThreshold?: number;
  /** Time in ms to wait before attempting recovery (default: 30000) */
  recoveryTimeout?: number;
  /** Number of successes needed in half-open to close (default: 1) */
  successThreshold?: number;
  /** Optional name for logging/identification */
  name?: string;
}

export interface CircuitBreakerStats {
  state: CircuitState;
  failures: number;
  successes: number;
  lastFailureTime: number | null;
  nextAttemptTime: number | null;
}

interface CircuitBreakerConfig {
  failureThreshold: number;
  recoveryTimeout: number;
  successThreshold: number;
  name: string;
}

const DEFAULT_OPTIONS: Required<CircuitBreakerOptions> = {
  failureThreshold: 5,
  recoveryTimeout: 30000,
  successThreshold: 1,
  name: 'circuit-breaker'
};

export class CircuitBreaker {
  private state: CircuitState = CircuitState.CLOSED;
  private failures: number = 0;
  private successes: number = 0;
  private lastFailureTime: number | null = null;
  private nextAttemptTime: number | null = null;
  private config: CircuitBreakerConfig;
  private listeners: ((state: CircuitState, stats: CircuitBreakerStats) => void)[] = [];

  constructor(options: CircuitBreakerOptions = {}) {
    this.config = {
      failureThreshold: options.failureThreshold ?? DEFAULT_OPTIONS.failureThreshold,
      recoveryTimeout: options.recoveryTimeout ?? DEFAULT_OPTIONS.recoveryTimeout,
      successThreshold: options.successThreshold ?? DEFAULT_OPTIONS.successThreshold,
      name: options.name ?? DEFAULT_OPTIONS.name
    };
  }

  /**
   * Execute a function with circuit breaker protection
   */
  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === CircuitState.OPEN) {
      if (this.shouldAttemptRecovery()) {
        this.transitionToHalfOpen();
      } else {
        throw new CircuitOpenError(
          `Circuit '${this.config.name}' is OPEN. Next attempt at ${new Date(this.nextAttemptTime!).toISOString()}`
        );
      }
    }

    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  /**
   * Synchronous execute for non-async operations
   */
  executeSync<T>(operation: () => T): T {
    if (this.state === CircuitState.OPEN) {
      if (this.shouldAttemptRecovery()) {
        this.transitionToHalfOpen();
      } else {
        throw new CircuitOpenError(
          `Circuit '${this.config.name}' is OPEN. Next attempt at ${new Date(this.nextAttemptTime!).toISOString()}`
        );
      }
    }

    try {
      const result = operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  /**
   * Check if circuit allows an attempt (non-throwing)
   * Automatically transitions to half-open if recovery is due
   */
  canAttempt(): boolean {
    if (this.state === CircuitState.CLOSED) {
      return true;
    }

    if (this.state === CircuitState.OPEN) {
      if (this.shouldAttemptRecovery()) {
        this.transitionToHalfOpen();
        return true;
      }
      return false;
    }

    // HALF_OPEN - allow one test request
    return true;
  }

  /**
   * Get current circuit state
   */
  getState(): CircuitState {
    return this.state;
  }

  /**
   * Get current statistics
   */
  getStats(): CircuitBreakerStats {
    return {
      state: this.state,
      failures: this.failures,
      successes: this.successes,
      lastFailureTime: this.lastFailureTime,
      nextAttemptTime: this.nextAttemptTime
    };
  }

  /**
   * Manually reset the circuit to closed state
   */
  reset(): void {
    this.state = CircuitState.CLOSED;
    this.failures = 0;
    this.successes = 0;
    this.lastFailureTime = null;
    this.nextAttemptTime = null;
    this.notifyListeners();
  }

  /**
   * Manually force the circuit to open
   */
  forceOpen(): void {
    this.state = CircuitState.OPEN;
    this.nextAttemptTime = Date.now() + this.config.recoveryTimeout;
    this.notifyListeners();
  }

  /**
   * Subscribe to state changes
   */
  onStateChange(callback: (state: CircuitState, stats: CircuitBreakerStats) => void): () => void {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(l => l !== callback);
    };
  }

  private shouldAttemptRecovery(): boolean {
    if (!this.nextAttemptTime) return false;
    return Date.now() >= this.nextAttemptTime;
  }

  private transitionToHalfOpen(): void {
    this.state = CircuitState.HALF_OPEN;
    this.successes = 0;
    this.notifyListeners();
  }

  private onSuccess(): void {
    if (this.state === CircuitState.HALF_OPEN) {
      this.successes++;
      if (this.successes >= this.config.successThreshold) {
        this.transitionToClosed();
      }
    } else if (this.state === CircuitState.CLOSED) {
      // Reset failures on success in closed state
      this.failures = 0;
    }
  }

  private onFailure(): void {
    this.failures++;
    this.lastFailureTime = Date.now();

    if (this.state === CircuitState.HALF_OPEN) {
      // Any failure in half-open goes back to open
      this.transitionToOpen();
    } else if (this.state === CircuitState.CLOSED) {
      if (this.failures >= this.config.failureThreshold) {
        this.transitionToOpen();
      }
    }
  }

  private transitionToOpen(): void {
    this.state = CircuitState.OPEN;
    this.nextAttemptTime = Date.now() + this.config.recoveryTimeout;
    this.notifyListeners();
  }

  private transitionToClosed(): void {
    this.state = CircuitState.CLOSED;
    this.failures = 0;
    this.successes = 0;
    this.lastFailureTime = null;
    this.nextAttemptTime = null;
    this.notifyListeners();
  }

  private notifyListeners(): void {
    const stats = this.getStats();
    this.listeners.forEach(listener => listener(this.state, stats));
  }
}

/**
 * Error thrown when circuit is open
 */
export class CircuitOpenError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CircuitOpenError';
  }
}

/**
 * Create a circuit breaker with sensible defaults
 */
export function createCircuitBreaker(options?: CircuitBreakerOptions): CircuitBreaker {
  return new CircuitBreaker(options);
}

/**
 * Circuit breaker manager for multiple circuits
 */
export class CircuitBreakerManager {
  private circuits: Map<string, CircuitBreaker> = new Map();

  getOrCreate(name: string, options?: CircuitBreakerOptions): CircuitBreaker {
    let circuit = this.circuits.get(name);
    if (!circuit) {
      circuit = new CircuitBreaker({ ...options, name });
      this.circuits.set(name, circuit);
    }
    return circuit;
  }

  get(name: string): CircuitBreaker | undefined {
    return this.circuits.get(name);
  }

  remove(name: string): void {
    this.circuits.delete(name);
  }

  getAllStats(): Record<string, CircuitBreakerStats> {
    const stats: Record<string, CircuitBreakerStats> = {};
    this.circuits.forEach((circuit, name) => {
      stats[name] = circuit.getStats();
    });
    return stats;
  }

  resetAll(): void {
    this.circuits.forEach(circuit => circuit.reset());
  }
}

// Default manager instance
export const circuitBreakerManager = new CircuitBreakerManager();
