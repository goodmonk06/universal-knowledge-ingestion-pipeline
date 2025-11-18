import { DomainEvent } from '../types';
import { logger } from './logger';
import { v4 as uuidv4 } from 'uuid';

/**
 * Event handler function
 */
export type EventHandler<T = any> = (event: DomainEvent<T>) => Promise<void> | void;

/**
 * Event bus for pub/sub messaging
 */
class EventBus {
  private handlers: Map<string, EventHandler[]> = new Map();
  private eventLog: DomainEvent[] = [];
  private maxLogSize: number = 1000;

  /**
   * Subscribe to an event type
   */
  on<T = any>(eventType: string, handler: EventHandler<T>): () => void {
    const handlers = this.handlers.get(eventType) || [];
    handlers.push(handler as EventHandler);
    this.handlers.set(eventType, handlers);

    // Return unsubscribe function
    return () => {
      const currentHandlers = this.handlers.get(eventType) || [];
      const index = currentHandlers.indexOf(handler as EventHandler);
      if (index > -1) {
        currentHandlers.splice(index, 1);
        this.handlers.set(eventType, currentHandlers);
      }
    };
  }

  /**
   * Subscribe to multiple event types
   */
  onMany<T = any>(eventTypes: string[], handler: EventHandler<T>): () => void {
    const unsubscribers = eventTypes.map(type => this.on(type, handler));
    return () => unsubscribers.forEach(unsub => unsub());
  }

  /**
   * Emit an event
   */
  async emit<T = any>(
    eventType: string,
    payload: T,
    metadata?: Partial<DomainEvent<T>['metadata']>
  ): Promise<void> {
    const event: DomainEvent<T> = {
      id: uuidv4(),
      type: eventType,
      payload,
      metadata: {
        timestamp: new Date(),
        source: 'ukip',
        ...metadata,
      },
    };

    // Add to log
    this.eventLog.push(event);
    if (this.eventLog.length > this.maxLogSize) {
      this.eventLog.shift();
    }

    // Get handlers
    const handlers = this.handlers.get(eventType) || [];

    if (handlers.length === 0) {
      logger.debug(`No handlers for event: ${eventType}`);
      return;
    }

    // Execute handlers
    const promises = handlers.map(async handler => {
      try {
        await handler(event);
      } catch (error) {
        logger.error(`Error in event handler for ${eventType}`, error as Error, {
          event,
        });
      }
    });

    await Promise.all(promises);
  }

  /**
   * Get event history
   */
  getEventLog(eventType?: string, limit: number = 100): DomainEvent[] {
    let events = this.eventLog;

    if (eventType) {
      events = events.filter(e => e.type === eventType);
    }

    return events.slice(-limit);
  }

  /**
   * Clear event history
   */
  clearEventLog(): void {
    this.eventLog = [];
  }

  /**
   * Get all registered event types
   */
  getRegisteredEvents(): string[] {
    return Array.from(this.handlers.keys());
  }

  /**
   * Get handler count for an event type
   */
  getHandlerCount(eventType: string): number {
    return (this.handlers.get(eventType) || []).length;
  }

  /**
   * Remove all handlers
   */
  clear(): void {
    this.handlers.clear();
  }
}

/**
 * Global event bus instance
 */
export const eventBus = new EventBus();

/**
 * Common event types
 */
export const EventTypes = {
  // Document events
  DOCUMENT_INGESTED: 'document.ingested',
  DOCUMENT_UPDATED: 'document.updated',
  DOCUMENT_DELETED: 'document.deleted',
  DOCUMENT_VERSIONED: 'document.versioned',

  // Job events
  JOB_CREATED: 'job.created',
  JOB_STARTED: 'job.started',
  JOB_PROGRESS: 'job.progress',
  JOB_COMPLETED: 'job.completed',
  JOB_FAILED: 'job.failed',
  JOB_CANCELLED: 'job.cancelled',

  // Search events
  SEARCH_PERFORMED: 'search.performed',
  SEARCH_FAILED: 'search.failed',

  // Webhook events
  WEBHOOK_TRIGGERED: 'webhook.triggered',
  WEBHOOK_FAILED: 'webhook.failed',

  // Collection events
  COLLECTION_CREATED: 'collection.created',
  COLLECTION_DELETED: 'collection.deleted',

  // Tag events
  TAG_CREATED: 'tag.created',
  TAG_APPLIED: 'tag.applied',
  TAG_REMOVED: 'tag.removed',

  // System events
  SYSTEM_ERROR: 'system.error',
  SYSTEM_WARNING: 'system.warning',
};

/**
 * Event payload types
 */
export interface DocumentIngestedPayload {
  documentId: number;
  collection: string;
  chunksCreated: number;
  sourceType: string;
}

export interface JobProgressPayload {
  jobId: string;
  total: number;
  processed: number;
  failed: number;
}

export interface SearchPerformedPayload {
  query: string;
  collection?: string;
  results: number;
  latencyMs: number;
}
