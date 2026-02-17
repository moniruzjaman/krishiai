// services/monitoringService.ts
// Comprehensive monitoring for Krishi AI deployment

export interface MonitoringMetrics {
  // Performance Metrics
  responseTime: number;
  firstContentfulPaint: number;
  timeToInteractive: number;

  // Usage Metrics
  totalAnalyses: number;
  freeTierUsage: number;
  lowCostTierUsage: number;
  premiumTierUsage: number;

  // Cost Metrics
  dailyCost: number;
  monthlyCostEstimate: number;
  costPerAnalysis: number;

  // Error Metrics
  errorRate: number;
  hfFailureRate: number;
  llmFailureRate: number;

  // Quality Metrics
  averageConfidence: number;
  hfConfidenceAvg: number;
  llmConfidenceAvg: number;
}

export interface AnalysisLog {
  timestamp: number;
  modelUsed: string;
  tier: 'free' | 'low-cost' | 'premium';
  confidence: number;
  responseTime: number;
  cropFamily: string;
  diagnosis: string;
  error?: string;
}

class MonitoringService {
  private static instance: MonitoringService;
  private logs: AnalysisLog[] = [];
  private metrics: MonitoringMetrics = {
    responseTime: 0,
    firstContentfulPaint: 0,
    timeToInteractive: 0,
    totalAnalyses: 0,
    freeTierUsage: 0,
    lowCostTierUsage: 0,
    premiumTierUsage: 0,
    dailyCost: 0,
    monthlyCostEstimate: 0,
    costPerAnalysis: 0,
    errorRate: 0,
    hfFailureRate: 0,
    llmFailureRate: 0,
    averageConfidence: 0,
    hfConfidenceAvg: 0,
    llmConfidenceAvg: 0
  };

  private readonly COST_PER_ANALYSIS = {
    free: 0,
    lowCost: 0.02,
    premium: 0.05
  };

  private readonly MAX_LOGS = 1000; // Keep last 1000 analyses

  private constructor() {
    this.loadFromStorage();
    this.startPerformanceMonitoring();
  }

  public static getInstance(): MonitoringService {
    if (!MonitoringService.instance) {
      MonitoringService.instance = new MonitoringService();
    }
    return MonitoringService.instance;
  }

  /**
   * Log an analysis request
   */
  public logAnalysis(log: Omit<AnalysisLog, 'timestamp'>): void {
    const fullLog: AnalysisLog = {
      ...log,
      timestamp: Date.now()
    };

    this.logs.unshift(fullLog); // Add to beginning

    // Trim old logs
    if (this.logs.length > this.MAX_LOGS) {
      this.logs = this.logs.slice(0, this.MAX_LOGS);
    }

    // Update metrics
    this.updateMetrics(fullLog);

    // Save to storage
    this.saveToStorage();

    // Send to analytics (if configured)
    this.sendToAnalytics(fullLog);

    // Check for alerts
    this.checkAlerts(fullLog);
  }

  /**
   * Get current metrics
   */
  public getMetrics(): MonitoringMetrics {
    return { ...this.metrics };
  }

  /**
   * Get logs for specific time range
   */
  public getLogs(hours: number = 24): AnalysisLog[] {
    const cutoff = Date.now() - (hours * 60 * 60 * 1000);
    return this.logs.filter(log => log.timestamp > cutoff);
  }

  /**
   * Get cost breakdown
   */
  public getCostBreakdown(): {
    daily: number;
    weekly: number;
    monthly: number;
    breakdown: Record<string, number>;
  } {
    const now = Date.now();
    const dayAgo = now - (24 * 60 * 60 * 1000);
    const weekAgo = now - (7 * 24 * 60 * 60 * 1000);
    const monthAgo = now - (30 * 24 * 60 * 60 * 1000);

    const dailyLogs = this.logs.filter(log => log.timestamp > dayAgo);
    const weeklyLogs = this.logs.filter(log => log.timestamp > weekAgo);
    const monthlyLogs = this.logs.filter(log => log.timestamp > monthAgo);

    const calculateCost = (logs: AnalysisLog[]) => {
      return logs.reduce((sum, log) => {
        return sum + (this.COST_PER_ANALYSIS[log.tier] || 0);
      }, 0);
    };

    const dailyCost = calculateCost(dailyLogs);

    return {
      daily: dailyCost,
      weekly: dailyCost * 7,
      monthly: dailyCost * 30,
      breakdown: {
        free: dailyLogs.filter(l => l.tier === 'free').length,
        lowCost: dailyLogs.filter(l => l.tier === 'low-cost').length,
        premium: dailyLogs.filter(l => l.tier === 'premium').length
      }
    };
  }

  /**
   * Get performance summary
   */
  public getPerformanceSummary(): {
    avgResponseTime: number;
    p95ResponseTime: number;
    p99ResponseTime: number;
    successRate: number;
    avgConfidence: number;
  } {
    const recentLogs = this.getLogs(24);

    if (recentLogs.length === 0) {
      return {
        avgResponseTime: 0,
        p95ResponseTime: 0,
        p99ResponseTime: 0,
        successRate: 100,
        avgConfidence: 0
      };
    }

    const responseTimes = recentLogs
      .filter(log => !log.error)
      .map(log => log.responseTime)
      .sort((a, b) => a - b);

    const p95Index = Math.floor(responseTimes.length * 0.95);
    const p99Index = Math.floor(responseTimes.length * 0.99);

    const errors = recentLogs.filter(log => log.error).length;
    const confidences = recentLogs.map(log => log.confidence);

    return {
      avgResponseTime: responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length,
      p95ResponseTime: responseTimes[p95Index] || 0,
      p99ResponseTime: responseTimes[p99Index] || 0,
      successRate: ((recentLogs.length - errors) / recentLogs.length) * 100,
      avgConfidence: confidences.reduce((a, b) => a + b, 0) / confidences.length
    };
  }

  /**
   * Export logs for analysis
   */
  public exportLogs(): string {
    return JSON.stringify(this.logs, null, 2);
  }

  /**
   * Clear all logs and metrics
   */
  public clearLogs(): void {
    this.logs = [];
    this.resetMetrics();
    localStorage.removeItem('krishi_ai_monitoring');
  }

  /**
   * Start performance monitoring
   */
  private startPerformanceMonitoring(): void {
    if (typeof window !== 'undefined' && window.performance) {
      // Monitor First Contentful Paint
      new PerformanceObserver((entryList) => {
        const entries = entryList.getEntries();
        for (const entry of entries) {
          if (entry.name === 'first-contentful-paint') {
            this.metrics.firstContentfulPaint = entry.startTime;
          }
        }
      }).observe({ entryTypes: ['paint'] });

      // Monitor Time to Interactive
      new PerformanceObserver((entryList) => {
        const entries = entryList.getEntries();
        for (const entry of entries) {
          if (entry.entryType === 'navigation') {
            const navEntry = entry as PerformanceNavigationTiming;
            this.metrics.timeToInteractive = navEntry.domInteractive;
          }
        }
      }).observe({ entryTypes: ['navigation'] });
    }
  }

  /**
   * Update metrics based on new log
   */
  private updateMetrics(log: AnalysisLog): void {
    this.metrics.totalAnalyses++;

    // Update tier usage
    if (log.tier === 'free') this.metrics.freeTierUsage++;
    else if (log.tier === 'low-cost') this.metrics.lowCostTierUsage++;
    else if (log.tier === 'premium') this.metrics.premiumTierUsage++;

    // Update response time
    this.metrics.responseTime = this.calculateAverage('responseTime');

    // Update confidence
    this.metrics.averageConfidence = this.calculateAverage('confidence');

    // Update error rates
    const recentLogs = this.getLogs(24);
    const errors = recentLogs.filter(l => l.error).length;
    this.metrics.errorRate = (errors / recentLogs.length) * 100;

    // Update costs
    const costBreakdown = this.getCostBreakdown();
    this.metrics.dailyCost = costBreakdown.daily;
    this.metrics.monthlyCostEstimate = costBreakdown.monthly;
    this.metrics.costPerAnalysis = this.metrics.totalAnalyses > 0
      ? this.metrics.dailyCost / this.metrics.totalAnalyses
      : 0;
  }

  /**
   * Calculate average for a specific field
   */
  private calculateAverage(field: keyof AnalysisLog): number {
    const recentLogs = this.getLogs(24);
    const values = recentLogs
      .filter(log => !log.error && typeof log[field] === 'number')
      .map(log => log[field] as number);

    if (values.length === 0) return 0;
    return values.reduce((a, b) => a + b, 0) / values.length;
  }

  /**
   * Save to localStorage
   */
  private saveToStorage(): void {
    try {
      const data = {
        logs: this.logs.slice(0, 100), // Save last 100 logs
        metrics: this.metrics,
        timestamp: Date.now()
      };
      localStorage.setItem('krishi_ai_monitoring', JSON.stringify(data));
    } catch (error) {
      console.warn('Failed to save monitoring data:', error);
    }
  }

  /**
   * Load from localStorage
   */
  private loadFromStorage(): void {
    try {
      const data = localStorage.getItem('krishi_ai_monitoring');
      if (data) {
        const parsed = JSON.parse(data);
        this.logs = parsed.logs || [];
        this.metrics = { ...this.metrics, ...parsed.metrics };
      }
    } catch (error) {
      console.warn('Failed to load monitoring data:', error);
    }
  }

  /**
   * Reset metrics
   */
  private resetMetrics(): void {
    this.metrics = {
      responseTime: 0,
      firstContentfulPaint: 0,
      timeToInteractive: 0,
      totalAnalyses: 0,
      freeTierUsage: 0,
      lowCostTierUsage: 0,
      premiumTierUsage: 0,
      dailyCost: 0,
      monthlyCostEstimate: 0,
      costPerAnalysis: 0,
      errorRate: 0,
      hfFailureRate: 0,
      llmFailureRate: 0,
      averageConfidence: 0,
      hfConfidenceAvg: 0,
      llmConfidenceAvg: 0
    };
  }

  /**
   * Send to analytics service (placeholder for future integration)
   */
  private sendToAnalytics(log: AnalysisLog): void {
    // TODO: Integrate with Google Analytics, Mixpanel, or similar
    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('event', 'analysis_completed', {
        event_category: 'ai_analysis',
        event_label: log.tier,
        value: log.confidence
      });
    }
  }

  /**
   * Check for alerts
   */
  private checkAlerts(log: AnalysisLog): void {
    // Alert on high error rate
    if (this.metrics.errorRate > 10) {
      console.warn('⚠️ ALERT: High error rate detected:', this.metrics.errorRate + '%');
    }

    // Alert on high premium usage
    const premiumPercentage = (this.metrics.premiumTierUsage / this.metrics.totalAnalyses) * 100;
    if (premiumPercentage > 15) {
      console.warn('⚠️ ALERT: High premium tier usage:', premiumPercentage.toFixed(1) + '%');
    }

    // Alert on slow response times
    if (log.responseTime > 10000) {
      console.warn('⚠️ ALERT: Slow response time:', log.responseTime + 'ms');
    }

    // Alert on low confidence
    if (log.confidence < 50) {
      console.warn('⚠️ ALERT: Low confidence analysis:', log.confidence + '%');
    }
  }
}

// Export singleton instance
export const monitoringService = MonitoringService.getInstance();
