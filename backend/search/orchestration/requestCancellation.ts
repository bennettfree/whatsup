/**
 * Request Cancellation Manager
 * 
 * Manages AbortControllers for cancelling stale requests.
 * Prevents wasted processing and API calls for abandoned searches.
 */

export interface CancellableRequest {
  requestId: string;
  abortController: AbortController;
  timestamp: Date;
  query: string;
}

export class RequestManager {
  private activeRequests = new Map<string, CancellableRequest>();
  private completedRequests: Array<{ id: string; duration: number; cancelled: boolean }> = [];
  
  /**
   * Create a new request with abort controller
   */
  createRequest(requestId: string, query: string): AbortController {
    // Cancel any existing request with same ID
    this.cancelRequest(requestId);
    
    const abortController = new AbortController();
    
    this.activeRequests.set(requestId, {
      requestId,
      abortController,
      timestamp: new Date(),
      query,
    });
    
    console.log(`[RequestManager] Created request ${requestId.substring(0, 8)} for query: "${query}"`);
    
    return abortController;
  }
  
  /**
   * Cancel a request
   */
  cancelRequest(requestId: string): void {
    const req = this.activeRequests.get(requestId);
    
    if (req) {
      req.abortController.abort();
      this.activeRequests.delete(requestId);
      
      const duration = Date.now() - req.timestamp.getTime();
      this.completedRequests.push({
        id: requestId,
        duration,
        cancelled: true,
      });
      
      console.log(`[RequestManager] Cancelled request ${requestId.substring(0, 8)} after ${duration}ms`);
    }
  }
  
  /**
   * Execute with cancellation support
   */
  async executeWithCancellation<T>(
    requestId: string,
    query: string,
    fn: (signal: AbortSignal) => Promise<T>
  ): Promise<T | null> {
    const controller = this.createRequest(requestId, query);
    const startTime = Date.now();
    
    try {
      const result = await fn(controller.signal);
      
      // Success - clean up
      this.activeRequests.delete(requestId);
      const duration = Date.now() - startTime;
      
      this.completedRequests.push({
        id: requestId,
        duration,
        cancelled: false,
      });
      
      // Keep last 100 completions for stats
      if (this.completedRequests.length > 100) {
        this.completedRequests.shift();
      }
      
      return result;
    } catch (error: any) {
      this.activeRequests.delete(requestId);
      
      if (error.name === 'AbortError') {
        console.log(`[RequestManager] Request ${requestId.substring(0, 8)} was aborted`);
        return null;
      }
      
      throw error;
    }
  }
  
  /**
   * Cancel all active requests
   */
  cancelAll(): void {
    const count = this.activeRequests.size;
    
    for (const [requestId] of this.activeRequests) {
      this.cancelRequest(requestId);
    }
    
    console.log(`[RequestManager] Cancelled ${count} active requests`);
  }
  
  /**
   * Get active request count
   */
  getActiveCount(): number {
    return this.activeRequests.size;
  }
  
  /**
   * Get stats
   */
  getStats(): {
    active: number;
    completed: number;
    avgDuration: number;
    cancelRate: number;
  } {
    const completed = this.completedRequests;
    const cancelled = completed.filter(r => r.cancelled).length;
    const avgDuration = completed.length > 0
      ? completed.reduce((sum, r) => sum + r.duration, 0) / completed.length
      : 0;
    
    return {
      active: this.activeRequests.size,
      completed: completed.length,
      avgDuration,
      cancelRate: completed.length > 0 ? cancelled / completed.length : 0,
    };
  }
  
  /**
   * Clean up old completed requests
   */
  cleanup(): void {
    this.completedRequests = this.completedRequests.slice(-50);
  }
}

// Singleton instance
export const requestManager = new RequestManager();
