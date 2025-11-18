import { describe, it, expect, beforeEach } from 'vitest';
import { MetricsCollector } from '../../lib/metrics';

class TestMetricsCollector extends MetricsCollector {
  // Expose for testing
  public getMetricsInternal() {
    return this.getMetrics();
  }
}

describe('MetricsCollector', () => {
  let metrics: TestMetricsCollector;

  beforeEach(() => {
    metrics = new TestMetricsCollector(true);
  });

  it('should record counter metrics', () => {
    metrics.recordCounter('test_counter', 1);
    metrics.recordCounter('test_counter', 1);

    const data = metrics.getMetricsInternal();
    const counter = data['test_counter'];

    expect(counter).toBeDefined();
    expect(counter.type).toBe('counter');
    expect(counter.total).toBe(2);
  });

  it('should record gauge metrics', () => {
    metrics.recordGauge('test_gauge', 100);
    metrics.recordGauge('test_gauge', 150);

    const data = metrics.getMetricsInternal();
    const gauge = data['test_gauge'];

    expect(gauge).toBeDefined();
    expect(gauge.type).toBe('gauge');
    expect(gauge.latest).toBe(150);
  });

  it('should record histogram metrics', () => {
    metrics.recordHistogram('test_histogram', 10);
    metrics.recordHistogram('test_histogram', 20);
    metrics.recordHistogram('test_histogram', 30);

    const data = metrics.getMetricsInternal();
    const histogram = data['test_histogram'];

    expect(histogram).toBeDefined();
    expect(histogram.type).toBe('histogram');
    expect(histogram.min).toBe(10);
    expect(histogram.max).toBe(30);
    expect(histogram.avg).toBe(20);
  });

  it('should handle labels in metrics', () => {
    metrics.recordCounter('requests', 1, { method: 'GET', path: '/api' });
    metrics.recordCounter('requests', 1, { method: 'POST', path: '/api' });

    const data = metrics.getMetricsInternal();

    expect(Object.keys(data)).toHaveLength(2);
    expect(data['requests{method="GET",path="/api"}']).toBeDefined();
    expect(data['requests{method="POST",path="/api"}']).toBeDefined();
  });

  it('should reset metrics', () => {
    metrics.recordCounter('test', 1);

    metrics.reset();

    const data = metrics.getMetricsInternal();
    expect(Object.keys(data)).toHaveLength(0);
  });

  it('should generate Prometheus format', () => {
    metrics.recordCounter('test_counter', 5);
    metrics.recordGauge('test_gauge', 100);

    const prometheus = metrics.toPrometheus();

    expect(prometheus).toContain('test_counter 5');
    expect(prometheus).toContain('test_gauge 100');
  });
});
