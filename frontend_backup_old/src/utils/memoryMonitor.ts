/**
 * Memory Monitor - Development utility to track memory usage
 * Helps identify memory leaks and excessive memory consumption
 */

export class MemoryMonitor {
  private intervalId: NodeJS.Timeout | null = null
  private startMemory: number = 0
  private peakMemory: number = 0
  
  /**
   * Start monitoring memory usage
   * @param intervalMs - How often to check memory (default: 30 seconds)
   * @param logToConsole - Whether to log to console (default: true)
   */
  start(intervalMs: number = 30000, logToConsole: boolean = true): void {
    if (!performance.memory) {
      console.warn('Memory monitoring not available in this browser')
      return
    }
    
    // Clear any existing monitor
    this.stop()
    
    // Record initial memory
    this.startMemory = performance.memory.usedJSHeapSize
    this.peakMemory = this.startMemory
    
    if (logToConsole) {
      console.log('🔍 Memory Monitor Started', this.getMemoryInfo())
    }
    
    // Set up periodic monitoring
    this.intervalId = setInterval(() => {
      const currentMemory = performance.memory.usedJSHeapSize
      
      // Update peak memory
      if (currentMemory > this.peakMemory) {
        this.peakMemory = currentMemory
      }
      
      if (logToConsole) {
        const info = this.getMemoryInfo()
        const memoryDelta = currentMemory - this.startMemory
        const deltaSign = memoryDelta > 0 ? '+' : ''
        
        console.log(
          `📊 Memory Status:`,
          `Used: ${info.used}`,
          `(${deltaSign}${this.formatBytes(memoryDelta)} from start)`,
          `| Peak: ${info.peak}`,
          `| Limit: ${info.limit}`,
          `| Usage: ${info.percentage}`
        )
        
        // Warn if memory usage is high
        if (info.percentageNum > 80) {
          console.warn('⚠️ High memory usage detected:', info.percentage)
        }
      }
    }, intervalMs)
  }
  
  /**
   * Stop monitoring memory
   */
  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId)
      this.intervalId = null
      console.log('🛑 Memory Monitor Stopped')
    }
  }
  
  /**
   * Get current memory information
   */
  getMemoryInfo(): {
    used: string
    total: string
    limit: string
    peak: string
    percentage: string
    percentageNum: number
  } {
    if (!performance.memory) {
      return {
        used: 'N/A',
        total: 'N/A',
        limit: 'N/A',
        peak: 'N/A',
        percentage: 'N/A',
        percentageNum: 0
      }
    }
    
    const used = performance.memory.usedJSHeapSize
    const total = performance.memory.totalJSHeapSize
    const limit = performance.memory.jsHeapSizeLimit
    const percentageNum = (used / limit) * 100
    
    return {
      used: this.formatBytes(used),
      total: this.formatBytes(total),
      limit: this.formatBytes(limit),
      peak: this.formatBytes(this.peakMemory),
      percentage: `${percentageNum.toFixed(1)}%`,
      percentageNum
    }
  }
  
  /**
   * Format bytes to human readable format
   */
  private formatBytes(bytes: number): string {
    const mb = bytes / (1024 * 1024)
    return `${mb.toFixed(1)}MB`
  }
  
  /**
   * Take a memory snapshot and log it
   */
  snapshot(label: string = 'Snapshot'): void {
    const info = this.getMemoryInfo()
    console.log(`📸 Memory ${label}:`, info)
  }
  
  /**
   * Reset peak memory tracking
   */
  resetPeak(): void {
    this.peakMemory = performance.memory?.usedJSHeapSize || 0
  }
}

// Export singleton instance for easy use
export const memoryMonitor = new MemoryMonitor()