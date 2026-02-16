/**
 * Circuit Breaker Pattern
 * 
 * Protects against cascading failures by failing fast when providers are down.
 * Auto-recovery with half-open state testing.
 */

export interface CircuitState {
  provider: string;
  state: 'closed' | 'open' | 'half_open';
  failureCount: number;
  successCount: number;
  lastFailure?: Date;
  lastSuccess?: Date;
  lastStateChange: Date;
}

export class CircuitBreaker {
  private states = new Map<string, CircuitState>();
  private readonly failureThreshold = 5; // Failures before opening
  private readonly successThreshold = 2; // Successes to close from half-open
  private readonly resetTimeout = 60000; // 60s before attempting half-open
  
  /**
   * Execute function with circuit breaker protection
   */
  async execute<T>(
    provider: string,
    fn: () => Promise<T>
  ): Promise<T | null> {
    const state = this.getState(provider);
    
    // Circuit OPEN: fail fast
    if (state.state === 'open') {
      const timeSinceFailure = Date.now() - (state.lastFailure?.getTime() || 0);
      
      if (timeSinceFailure > this.resetTimeout) {
        // Transition to half-open (allow one test request)
        console.log(`[CircuitBreaker] ${provider} transitioning to HALF_OPEN`);
        this.setState(provider, { state: 'half_open' });
      } else {
        console.log(`[CircuitBreaker] ${provider} circuit OPEN, skipping call (${Math.round(timeSinceFailure/1000)}s since failure)`);
        return null;
      }
    }
    
    // Execute function
    try {
      const startTime = Date.now();
      const result = await fn();
      const latency = Date.now() - startTime;
      
      this.recordSuccess(provider, latency);
      return result;
    } catch (error) {
      this.recordFailure(provider, error);
      
      const currentState = this.getState(provider);
      
      // Open circuit if threshold exceeded
      if (currentState.failureCount >= this.failureThreshold) {
        console.error(`[CircuitBreaker] ${provider} circuit OPENED after ${currentState.failureCount} failures`);
        this.setState(provider, { state: 'open' });
      }
      
      return null;
    }
  }
  
  /**
   * Get current state for provider
   */
  private getState(provider: string): CircuitState {
    if (!this.states.has(provider)) {
      this.states.set(provider, {
        provider,
        state: 'closed',
        failureCount: 0,
        successCount: 0,
        lastStateChange: new Date(),
      });
    }
    
    return this.states.get(provider)!;
  }
  
  /**
   * Update state
   */
  private setState(provider: string, updates: Partial<CircuitState>): void {
    const current = this.getState(provider);
    this.states.set(provider, {
      ...current,
      ...updates,
      lastStateChange: new Date(),
    });
  }
  
  /**
   * Record successful execution
   */
  private recordSuccess(provider: string, latency: number): void {
    const state = this.getState(provider);
    
    if (state.state === 'half_open') {
      // Increment success count in half-open
      state.successCount++;
      
      if (state.successCount >= this.successThreshold) {
        // Close circuit after successful tests
        console.log(`[CircuitBreaker] ${provider} circuit CLOSED after ${state.successCount} successes`);
        this.setState(provider, {
          state: 'closed',
          failureCount: 0,
          successCount: 0,
          lastSuccess: new Date(),
        });
      }
    } else {
      // Normal success in closed state
      this.setState(provider, {
        failureCount: Math.max(0, state.failureCount - 1), // Decay failure count
        successCount: state.successCount + 1,
        lastSuccess: new Date(),
      });
    }
  }
  
  /**
   * Record failed execution
   */
  private recordFailure(provider: string, error: any): void {
    const state = this.getState(provider);
    
    console.error(`[CircuitBreaker] ${provider} request failed:`, error.message || error);
    
    if (state.state === 'half_open') {
      // Failure in half-open immediately reopens circuit
      console.error(`[CircuitBreaker] ${provider} circuit REOPENED (failed in half-open)`);
      this.setState(provider, {
        state: 'open',
        failureCount: state.failureCount + 1,
        successCount: 0,
        lastFailure: new Date(),
      });
    } else {
      // Increment failure count
      this.setState(provider, {
        failureCount: state.failureCount + 1,
        lastFailure: new Date(),
      });
    }
  }
  
  /**
   * Get circuit state for monitoring
   */
  getCircuitState(provider: string): CircuitState {
    return this.getState(provider);
  }
  
  /**
   * Get all circuit states
   */
  getAllStates(): CircuitState[] {
    return Array.from(this.states.values());
  }
  
  /**
   * Manually reset circuit (for testing/ops)
   */
  resetCircuit(provider: string): void {
    console.log(`[CircuitBreaker] Manually resetting ${provider} circuit`);
    this.setState(provider, {
      state: 'closed',
      failureCount: 0,
      successCount: 0,
    });
  }
  
  /**
   * Check if circuit is healthy
   */
  isHealthy(provider: string): boolean {
    const state = this.getState(provider);
    return state.state === 'closed';
  }
}

// Singleton instance
export const circuitBreaker = new CircuitBreaker();
