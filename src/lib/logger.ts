import { ILogger } from '../types';

/**
 * Structured logger with correlation ID support
 */
class Logger implements ILogger {
  private context: string;
  private correlationId?: string;

  constructor(context: string = 'app', correlationId?: string) {
    this.context = context;
    this.correlationId = correlationId;
  }

  private formatMessage(level: string, message: string, meta?: Record<string, any>) {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level,
      context: this.context,
      message,
      ...(this.correlationId && { correlationId: this.correlationId }),
      ...(meta && { meta }),
    };

    return JSON.stringify(logEntry);
  }

  info(message: string, meta?: Record<string, any>): void {
    console.log(this.formatMessage('INFO', message, meta));
  }

  warn(message: string, meta?: Record<string, any>): void {
    console.warn(this.formatMessage('WARN', message, meta));
  }

  error(message: string, error?: Error, meta?: Record<string, any>): void {
    const errorMeta = error
      ? {
          ...meta,
          error: {
            message: error.message,
            stack: error.stack,
            name: error.name,
          },
        }
      : meta;

    console.error(this.formatMessage('ERROR', message, errorMeta));
  }

  debug(message: string, meta?: Record<string, any>): void {
    if (process.env.NODE_ENV !== 'production') {
      console.debug(this.formatMessage('DEBUG', message, meta));
    }
  }

  /**
   * Create a child logger with a new context
   */
  child(context: string, correlationId?: string): Logger {
    return new Logger(
      `${this.context}:${context}`,
      correlationId || this.correlationId
    );
  }

  /**
   * Set correlation ID for request tracing
   */
  withCorrelationId(correlationId: string): Logger {
    return new Logger(this.context, correlationId);
  }
}

/**
 * Default logger instance
 */
export const logger = new Logger('ukip');

/**
 * Create a logger for a specific context
 */
export function createLogger(context: string): Logger {
  return new Logger(context);
}
