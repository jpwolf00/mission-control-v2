# Circuit Breaker Pattern

The circuit breaker pattern provides resilience against cascading failures by wrapping operations that may fail repeatedly. When a service experiences repeated failures, the circuit "opens" to fail fast and prevent further strain on the failing service.

## States

```
       ┌──────────┐
       │  CLOSED  │ ←── Normal operation, requests pass through
       └────┬─────┘
            │ failure threshold reached
            ▼
       ┌──────────┐
       │   OPEN  │ ←── Too many failures, requests fail fast
       └────┬─────┘
            │ recovery timeout elapsed
            ▼
   ┌────────┴────────┐
   │   HALF-OPEN    │ ←── Testing if service recovered
   └────────┬────────┘
            │ success threshold reached
            ▼
       ┌──────────┐
       │  CLOSED  │ ←── Recovered, normal operation resumes
       └──────────┘
```

## Usage

### Basic Usage

```typescript
import { CircuitBreaker, CircuitState } from '@/lib/circuit-breaker'

// Create a circuit breaker with custom options
const breaker = new CircuitBreaker({
  failureThreshold: 5,      // Open after 5 failures (default: 5)
  recoveryTimeout: 30000,   // Try recovery after 30s (default: 30000ms)
  successThreshold: 1,     // Successes needed to close (default: 1)
  name: 'my-service'        // Optional name for logging
})

// Wrap your operation
try {
  const result = await breaker.execute(() => 
    fetch('https://api.example.com/data')
      .then(res => res.json())
  )
  console.log('Success:', result)
} catch (error) {
  if (error instanceof CircuitOpenError) {
    // Circuit is open, service is unavailable
    console.log('Service unavailable, try again later')
  }
  // Handle other errors
}
```

### Synchronous Operations

```typescript
// For non-async functions
const result = breaker.executeSync(() => {
  const data = readFileSync('data.json')
  return JSON.parse(data)
})
```

### Checking Circuit State

```typescript
// Non-throwing check
if (breaker.canAttempt()) {
  // Make the call
}

// Get detailed stats
const stats = breaker.getStats()
console.log(stats)
// {
//   state: 'closed',
//   failures: 0,
//   successes: 0,
//   lastFailureTime: null,
//   nextAttemptTime: null
// }
```

### Listening for State Changes

```typescript
const unsubscribe = breaker.onStateChange((state, stats) => {
  console.log(`Circuit '${stats.state}' changed to ${state}`)
  // Send alerts, update dashboards, etc.
})

// Later: unsubscribe
unsubscribe()
```

### Manual Control

```typescript
// Force open (e.g., during maintenance)
breaker.forceOpen()

// Manual reset
breaker.reset()
```

## Circuit Breaker Manager

For managing multiple circuits:

```typescript
import { circuitBreakerManager } from '@/lib/circuit-breaker'

// Get or create a circuit
const apiCircuit = circuitBreakerManager.getOrCreate('external-api', {
  failureThreshold: 3,
  recoveryTimeout: 60000
})

const dbCircuit = circuitBreakerManager.getOrCreate('database', {
  failureThreshold: 10,
  name: 'primary-db'
})

// Get stats for all circuits
const allStats = circuitBreakerManager.getAllStats()

// Reset all circuits
circuitBreakerManager.resetAll()
```

## Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `failureThreshold` | `number` | `5` | Number of failures before opening the circuit |
| `recoveryTimeout` | `number` | `30000` | Time in ms to wait before attempting recovery |
| `successThreshold` | `number` | `1` | Number of successes needed in half-open to close |
| `name` | `string` | `'circuit-breaker'` | Identifier for logging/monitoring |

## Integration Examples

### With External API Calls

```typescript
const externalApiBreaker = new CircuitBreaker({
  failureThreshold: 3,
  recoveryTimeout: 60000,
  name: 'external-payment-api'
})

async function processPayment(paymentData: PaymentData) {
  return externalApiBreaker.execute(async () => {
    const response = await fetch('https://payment-api.example.com/charge', {
      method: 'POST',
      body: JSON.stringify(paymentData),
      headers: { 'Content-Type': 'application/json' }
    })
    
    if (!response.ok) {
      throw new Error(`Payment failed: ${response.status}`)
    }
    
    return response.json()
  })
}
```

### With Database Connections

```typescript
const dbBreaker = new CircuitBreaker({
  failureThreshold: 10,
  recoveryTimeout: 30000,
  successThreshold: 3,
  name: 'primary-database'
})

async function queryWithBreaker<T>(query: string): Promise<T> {
  return dbBreaker.execute(async () => {
    const result = await prisma.$queryRawUnsafe<T>(query)
    return result
  })
}
```

## Best Practices

1. **Set appropriate thresholds** - Consider your service's typical failure patterns
2. **Use meaningful names** - Makes debugging and monitoring easier
3. **Monitor state changes** - Subscribe to state changes for alerting
4. **Configure recovery wisely** - Too short = premature recovery, too long = unnecessary downtime
5. **Handle CircuitOpenError specifically** - Provide fallback behavior or clear error messages

## Testing

Run tests with:

```bash
npm test -- circuit-breaker
```

Or for coverage:

```bash
npm run test:coverage
```
