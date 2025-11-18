import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createLogger } from '../../lib/logger';

describe('Logger', () => {
  let consoleLogSpy: any;
  let consoleWarnSpy: any;
  let consoleErrorSpy: any;

  beforeEach(() => {
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    consoleWarnSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  it('should log info messages', () => {
    const logger = createLogger('test');
    logger.info('Test message', { key: 'value' });

    expect(consoleLogSpy).toHaveBeenCalled();
    const logCall = consoleLogSpy.mock.calls[0][0];
    const parsed = JSON.parse(logCall);

    expect(parsed.level).toBe('INFO');
    expect(parsed.message).toBe('Test message');
    expect(parsed.context).toBe('test');
    expect(parsed.meta.key).toBe('value');
  });

  it('should log warning messages', () => {
    const logger = createLogger('test');
    logger.warn('Warning message');

    expect(consoleWarnSpy).toHaveBeenCalled();
    const logCall = consoleWarnSpy.mock.calls[0][0];
    const parsed = JSON.parse(logCall);

    expect(parsed.level).toBe('WARN');
    expect(parsed.message).toBe('Warning message');
  });

  it('should log error messages with error object', () => {
    const logger = createLogger('test');
    const error = new Error('Test error');
    logger.error('Error occurred', error);

    expect(consoleErrorSpy).toHaveBeenCalled();
    const logCall = consoleErrorSpy.mock.calls[0][0];
    const parsed = JSON.parse(logCall);

    expect(parsed.level).toBe('ERROR');
    expect(parsed.message).toBe('Error occurred');
    expect(parsed.meta.error.message).toBe('Test error');
  });

  it('should create child logger with nested context', () => {
    const parentLogger = createLogger('parent');
    const childLogger = parentLogger.child('child');

    childLogger.info('Child message');

    const logCall = consoleLogSpy.mock.calls[0][0];
    const parsed = JSON.parse(logCall);

    expect(parsed.context).toBe('parent:child');
  });

  it('should include correlation ID when set', () => {
    const logger = createLogger('test');
    const loggerWithCorrelation = logger.withCorrelationId('abc-123');

    loggerWithCorrelation.info('Correlated message');

    const logCall = consoleLogSpy.mock.calls[0][0];
    const parsed = JSON.parse(logCall);

    expect(parsed.correlationId).toBe('abc-123');
  });
});
