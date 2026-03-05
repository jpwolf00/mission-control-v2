import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  CircuitBreaker,
  CircuitState,
  CircuitOpenError,
  createCircuitBreaker,
  CircuitBreakerManager
} from '@/lib/circuit-breaker'

describe('CircuitBreaker', () => {
  let circuitBreaker: CircuitBreaker

  beforeEach(() => {
    circuitBreaker = new CircuitBreaker({
      failureThreshold: 3,
      recoveryTimeout: 1000,
      successThreshold: 2,
      name: 'test-circuit'
    })
  })

  describe('initial state', () => {
    it('starts in CLOSED state', () => {
      expect(circuitBreaker.getState()).toBe(CircuitState.CLOSED)
    })

    it('allows attempts initially', () => {
      expect(circuitBreaker.canAttempt()).toBe(true)
    })
  })

  describe('successful operations', () => {
    it('executes operations successfully in CLOSED state', async () => {
      const result = await circuitBreaker.execute(() => Promise.resolve('success'))
      expect(result).toBe('success')
    })

    it('resets failure count on success', async () => {
      // First fail a few times
      try {
        await circuitBreaker.execute(() => Promise.reject(new Error('fail')))
      } catch {}
      try {
        await circuitBreaker.execute(() => Promise.reject(new Error('fail')))
      } catch {}

      // Then succeed
      await circuitBreaker.execute(() => Promise.resolve('ok'))

      // Should still be closed since failures didn't reach threshold
      expect(circuitBreaker.getState()).toBe(CircuitState.CLOSED)
    })
  })

  describe('failure handling', () => {
    it('opens circuit after threshold failures', async () => {
      // Fail 3 times (threshold)
      for (let i = 0; i < 3; i++) {
        try {
          await circuitBreaker.execute(() => Promise.reject(new Error('fail')))
        } catch {}
      }

      expect(circuitBreaker.getState()).toBe(CircuitState.OPEN)
    })

    it('throws CircuitOpenError when circuit is open', async () => {
      // Open the circuit
      circuitBreaker.forceOpen()

      await expect(
        circuitBreaker.execute(() => Promise.resolve('should not work'))
      ).rejects.toThrow(CircuitOpenError)
    })

    it('tracks failure count correctly', async () => {
      expect(circuitBreaker.getStats().failures).toBe(0)

      try {
        await circuitBreaker.execute(() => Promise.reject(new Error('fail')))
      } catch {}

      expect(circuitBreaker.getStats().failures).toBe(1)

      try {
        await circuitBreaker.execute(() => Promise.reject(new Error('fail')))
      } catch {}

      expect(circuitBreaker.getStats().failures).toBe(2)
    })
  })

  describe('recovery (half-open state)', () => {
    it('transitions to half-open after recovery timeout', async () => {
      // Open the circuit
      circuitBreaker.forceOpen()

      // Wait for recovery timeout
      await new Promise(resolve => setTimeout(resolve, 1100))

      // Should now allow attempt
      expect(circuitBreaker.canAttempt()).toBe(true)
      expect(circuitBreaker.getState()).toBe(CircuitState.HALF_OPEN)
    })

    it('closes circuit after success threshold in half-open', async () => {
      // Open and transition to half-open
      circuitBreaker.forceOpen()
      await new Promise(resolve => setTimeout(resolve, 1100))

      // First success
      await circuitBreaker.execute(() => Promise.resolve('ok'))
      expect(circuitBreaker.getState()).toBe(CircuitState.HALF_OPEN)

      // Second success (meets threshold of 2)
      await circuitBreaker.execute(() => Promise.resolve('ok'))
      expect(circuitBreaker.getState()).toBe(CircuitState.CLOSED)
    })

    it('reopens circuit on failure in half-open', async () => {
      // Open and transition to half-open
      circuitBreaker.forceOpen()
      await new Promise(resolve => setTimeout(resolve, 1100))

      // Fail in half-open
      try {
        await circuitBreaker.execute(() => Promise.reject(new Error('fail')))
      } catch {}

      expect(circuitBreaker.getState()).toBe(CircuitState.OPEN)
    })
  })

  describe('manual controls', () => {
    it('reset() closes the circuit', () => {
      circuitBreaker.forceOpen()
      circuitBreaker.reset()

      expect(circuitBreaker.getState()).toBe(CircuitState.CLOSED)
      expect(circuitBreaker.getStats().failures).toBe(0)
    })

    it('forceOpen() opens the circuit', () => {
      circuitBreaker.forceOpen()

      expect(circuitBreaker.getState()).toBe(CircuitState.OPEN)
      expect(circuitBreaker.getStats().nextAttemptTime).not.toBeNull()
    })
  })

  describe('synchronous operations', () => {
    it('executeSync works correctly', () => {
      const result = circuitBreaker.executeSync(() => 'sync-result')
      expect(result).toBe('sync-result')
    })

    it('executeSync handles failures', () => {
      expect(() => {
        circuitBreaker.executeSync(() => {
          throw new Error('sync fail')
        })
      }).toThrow()

      expect(circuitBreaker.getStats().failures).toBe(1)
    })
  })

  describe('state change listeners', () => {
    it('notifies listeners on state change', () => {
      const callback = vi.fn()
      circuitBreaker.onStateChange(callback)

      circuitBreaker.forceOpen()

      expect(callback).toHaveBeenCalledWith(
        CircuitState.OPEN,
        expect.objectContaining({ state: CircuitState.OPEN })
      )
    })

    it('allows unsubscribing', () => {
      const callback = vi.fn()
      const unsubscribe = circuitBreaker.onStateChange(callback)
      unsubscribe()

      circuitBreaker.forceOpen()
      expect(callback).not.toHaveBeenCalled()
    })
  })
})

describe('createCircuitBreaker', () => {
  it('creates circuit with defaults', () => {
    const cb = createCircuitBreaker()
    expect(cb.getState()).toBe(CircuitState.CLOSED)
  })

  it('creates circuit with custom options', () => {
    const cb = createCircuitBreaker({
      failureThreshold: 10,
      recoveryTimeout: 5000,
      name: 'custom-circuit'
    })
    expect(cb.getStats().state).toBe(CircuitState.CLOSED)
  })
})

describe('CircuitBreakerManager', () => {
  let manager: CircuitBreakerManager

  beforeEach(() => {
    manager = new CircuitBreakerManager()
  })

  it('creates circuits on demand', () => {
    const cb = manager.getOrCreate('test')
    expect(cb).toBeInstanceOf(CircuitBreaker)
  })

  it('returns same circuit for same name', () => {
    const cb1 = manager.getOrCreate('test')
    const cb2 = manager.getOrCreate('test')
    expect(cb1).toBe(cb2)
  })

  it('gets existing circuit', () => {
    manager.getOrCreate('test')
    const cb = manager.get('test')
    expect(cb).toBeInstanceOf(CircuitBreaker)
  })

  it('returns undefined for non-existent circuit', () => {
    expect(manager.get('nonexistent')).toBeUndefined()
  })

  it('removes circuits', () => {
    manager.getOrCreate('test')
    manager.remove('test')
    expect(manager.get('test')).toBeUndefined()
  })

  it('gets all stats', () => {
    manager.getOrCreate('circuit1')
    manager.getOrCreate('circuit2')

    const stats = manager.getAllStats()
    expect(Object.keys(stats)).toHaveLength(2)
    expect(stats.circuit1).toBeDefined()
    expect(stats.circuit2).toBeDefined()
  })

  it('resets all circuits', () => {
    const cb1 = manager.getOrCreate('circuit1')
    const cb2 = manager.getOrCreate('circuit2')

    cb1.forceOpen()
    cb2.forceOpen()

    manager.resetAll()

    expect(cb1.getState()).toBe(CircuitState.CLOSED)
    expect(cb2.getState()).toBe(CircuitState.CLOSED)
  })
})
