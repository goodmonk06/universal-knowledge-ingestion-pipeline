import { INotificationAdapter, Notification } from '../../types';
import { logger } from '../logger';

/**
 * Console notification adapter (for development)
 */
export class ConsoleNotificationAdapter implements INotificationAdapter {
  async send(notification: Notification): Promise<void> {
    const icon = {
      info: 'ℹ️',
      warning: '⚠️',
      error: '❌',
      success: '✅',
    }[notification.type];

    console.log(`${icon} [${notification.type.toUpperCase()}] ${notification.title}`);
    console.log(`   ${notification.message}`);

    if (notification.metadata) {
      console.log('   Metadata:', JSON.stringify(notification.metadata, null, 2));
    }
  }
}

/**
 * Webhook notification adapter
 */
export class WebhookNotificationAdapter implements INotificationAdapter {
  constructor(private webhookUrl: string) {}

  async send(notification: Notification): Promise<void> {
    try {
      const response = await fetch(this.webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: notification.type,
          title: notification.title,
          message: notification.message,
          metadata: notification.metadata,
          timestamp: new Date().toISOString(),
        }),
      });

      if (!response.ok) {
        throw new Error(`Webhook returned ${response.status}`);
      }
    } catch (error) {
      logger.error('Failed to send webhook notification', error as Error, {
        webhookUrl: this.webhookUrl,
        notification,
      });
    }
  }
}

/**
 * Multi-channel notification adapter
 */
export class CompositeNotificationAdapter implements INotificationAdapter {
  constructor(private adapters: INotificationAdapter[]) {}

  async send(notification: Notification): Promise<void> {
    await Promise.all(this.adapters.map(adapter => adapter.send(notification)));
  }

  addAdapter(adapter: INotificationAdapter): void {
    this.adapters.push(adapter);
  }
}

/**
 * Default notification adapter
 */
export const defaultNotificationAdapter = new ConsoleNotificationAdapter();
