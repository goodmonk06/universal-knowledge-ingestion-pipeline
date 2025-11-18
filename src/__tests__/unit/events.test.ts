import { describe, it, expect, beforeEach } from 'vitest';
import { EventBus } from '../../lib/events';

describe('EventBus', () => {
  let eventBus: EventBus;

  beforeEach(() => {
    eventBus = new EventBus();
  });

  it('should subscribe and emit events', async () => {
    const events: any[] = [];

    eventBus.on('test.event', (event) => {
      events.push(event);
    });

    await eventBus.emit('test.event', { message: 'Hello' });

    expect(events).toHaveLength(1);
    expect(events[0].type).toBe('test.event');
    expect(events[0].payload.message).toBe('Hello');
  });

  it('should call multiple handlers for same event', async () => {
    let handler1Called = false;
    let handler2Called = false;

    eventBus.on('test.event', () => {
      handler1Called = true;
    });

    eventBus.on('test.event', () => {
      handler2Called = true;
    });

    await eventBus.emit('test.event', {});

    expect(handler1Called).toBe(true);
    expect(handler2Called).toBe(true);
  });

  it('should unsubscribe handlers', async () => {
    let callCount = 0;

    const unsubscribe = eventBus.on('test.event', () => {
      callCount++;
    });

    await eventBus.emit('test.event', {});
    expect(callCount).toBe(1);

    unsubscribe();

    await eventBus.emit('test.event', {});
    expect(callCount).toBe(1); // Should not increase
  });

  it('should store event log', async () => {
    await eventBus.emit('test.event1', { data: 1 });
    await eventBus.emit('test.event2', { data: 2 });

    const log = eventBus.getEventLog();

    expect(log).toHaveLength(2);
    expect(log[0].type).toBe('test.event1');
    expect(log[1].type).toBe('test.event2');
  });

  it('should filter event log by type', async () => {
    await eventBus.emit('test.event1', {});
    await eventBus.emit('test.event2', {});
    await eventBus.emit('test.event1', {});

    const log = eventBus.getEventLog('test.event1');

    expect(log).toHaveLength(2);
    expect(log.every(e => e.type === 'test.event1')).toBe(true);
  });

  it('should handle async handlers', async () => {
    let resolved = false;

    eventBus.on('test.event', async () => {
      await new Promise(resolve => setTimeout(resolve, 10));
      resolved = true;
    });

    await eventBus.emit('test.event', {});

    expect(resolved).toBe(true);
  });

  it('should subscribe to multiple events', async () => {
    const events: string[] = [];

    eventBus.onMany(['event1', 'event2', 'event3'], (event) => {
      events.push(event.type);
    });

    await eventBus.emit('event1', {});
    await eventBus.emit('event2', {});
    await eventBus.emit('event3', {});

    expect(events).toEqual(['event1', 'event2', 'event3']);
  });
});
