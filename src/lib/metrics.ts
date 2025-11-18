import { IMetricsAdapter } from '../types';

/**
 * In-memory metrics store (production would use Prometheus/StatsD)
 */
interface MetricEntry {
  name: string;
  type: 'counter' | 'gauge' | 'histogram';
  value: number;
  labels?: Record<string, string>;
  timestamp: Date;
}

export class MetricsCollector implements IMetricsAdapter {
  private metrics: Map<string, MetricEntry[]> = new Map();
  private enabled: boolean;

  constructor(enabled: boolean = true) {
    this.enabled = enabled;
  }

  private createKey(name: string, labels?: Record<string, string>): string {
    if (!labels || Object.keys(labels).length === 0) {
      return name;
    }
    const labelStr = Object.entries(labels)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}="${v}"`)
      .join(',');
    return `${name}{${labelStr}}`;
  }

  private store(
    name: string,
    type: 'counter' | 'gauge' | 'histogram',
    value: number,
    labels?: Record<string, string>
  ): void {
    if (!this.enabled) return;

    const key = this.createKey(name, labels);
    const entry: MetricEntry = {
      name,
      type,
      value,
      labels,
      timestamp: new Date(),
    };

    const existing = this.metrics.get(key) || [];
    existing.push(entry);

    // Keep only last 1000 entries per metric
    if (existing.length > 1000) {
      existing.shift();
    }

    this.metrics.set(key, existing);
  }

  recordCounter(
    name: string,
    value: number = 1,
    labels?: Record<string, string>
  ): void {
    this.store(name, 'counter', value, labels);
  }

  recordGauge(name: string, value: number, labels?: Record<string, string>): void {
    this.store(name, 'gauge', value, labels);
  }

  recordHistogram(
    name: string,
    value: number,
    labels?: Record<string, string>
  ): void {
    this.store(name, 'histogram', value, labels);
  }

  /**
   * Get metric statistics
   */
  getMetrics(name?: string): Record<string, any> {
    const result: Record<string, any> = {};

    for (const [key, entries] of this.metrics.entries()) {
      if (name && !key.startsWith(name)) continue;

      const latestEntry = entries[entries.length - 1];
      const values = entries.map(e => e.value);

      result[key] = {
        type: latestEntry.type,
        count: entries.length,
        latest: latestEntry.value,
        ...(latestEntry.type === 'histogram' && {
          min: Math.min(...values),
          max: Math.max(...values),
          avg: values.reduce((a, b) => a + b, 0) / values.length,
          p95: this.percentile(values, 95),
          p99: this.percentile(values, 99),
        }),
        ...(latestEntry.type === 'counter' && {
          total: values.reduce((a, b) => a + b, 0),
        }),
        labels: latestEntry.labels,
        lastUpdated: latestEntry.timestamp,
      };
    }

    return result;
  }

  private percentile(values: number[], p: number): number {
    const sorted = [...values].sort((a, b) => a - b);
    const index = Math.ceil((p / 100) * sorted.length) - 1;
    return sorted[index];
  }

  /**
   * Reset all metrics
   */
  reset(): void {
    this.metrics.clear();
  }

  /**
   * Get Prometheus-compatible output
   */
  toPrometheus(): string {
    const lines: string[] = [];

    for (const [key, entries] of this.metrics.entries()) {
      const latestEntry = entries[entries.length - 1];
      let metricLine = latestEntry.name;

      if (latestEntry.labels && Object.keys(latestEntry.labels).length > 0) {
        const labelStr = Object.entries(latestEntry.labels)
          .map(([k, v]) => `${k}="${v}"`)
          .join(',');
        metricLine += `{${labelStr}}`;
      }

      if (latestEntry.type === 'counter') {
        const total = entries.reduce((sum, e) => sum + e.value, 0);
        metricLine += ` ${total}`;
      } else {
        metricLine += ` ${latestEntry.value}`;
      }

      lines.push(metricLine);
    }

    return lines.join('\n');
  }
}

/**
 * Global metrics instance
 */
export const metrics = new MetricsCollector(
  process.env.ENABLE_METRICS !== 'false'
);

/**
 * Common metric names
 */
export const MetricNames = {
  // Ingestion metrics
  DOCUMENTS_INGESTED: 'documents_ingested_total',
  CHUNKS_CREATED: 'chunks_created_total',
  INGESTION_DURATION: 'ingestion_duration_ms',
  INGESTION_ERRORS: 'ingestion_errors_total',

  // Search metrics
  SEARCHES_PERFORMED: 'searches_performed_total',
  SEARCH_LATENCY: 'search_latency_ms',
  SEARCH_RESULTS: 'search_results_count',

  // Job metrics
  JOBS_CREATED: 'jobs_created_total',
  JOBS_COMPLETED: 'jobs_completed_total',
  JOBS_FAILED: 'jobs_failed_total',
  JOB_DURATION: 'job_duration_ms',

  // API metrics
  HTTP_REQUESTS: 'http_requests_total',
  HTTP_REQUEST_DURATION: 'http_request_duration_ms',
  HTTP_ERRORS: 'http_errors_total',

  // System metrics
  ACTIVE_CONNECTIONS: 'active_connections',
  MEMORY_USAGE: 'memory_usage_bytes',
  CPU_USAGE: 'cpu_usage_percent',
};
