import {
  ILoader,
  ITextSplitter,
  IEmbeddingClient,
  IVectorStore,
  INotificationAdapter,
  IMetricsAdapter,
} from '../types';
import { logger } from './logger';

/**
 * Plugin metadata
 */
export interface PluginMetadata {
  name: string;
  version: string;
  description?: string;
  author?: string;
}

/**
 * Plugin interface
 */
export interface Plugin {
  metadata: PluginMetadata;
  loaders?: Map<string, () => ILoader>;
  splitters?: Map<string, () => ITextSplitter>;
  embeddingClients?: Map<string, () => IEmbeddingClient>;
  vectorStores?: Map<string, () => IVectorStore>;
  notificationAdapters?: Map<string, () => INotificationAdapter>;
  metricsAdapters?: Map<string, () => IMetricsAdapter>;
  hooks?: {
    beforeIngest?: (config: any) => Promise<any>;
    afterIngest?: (result: any) => Promise<void>;
    beforeSearch?: (query: any) => Promise<any>;
    afterSearch?: (results: any) => Promise<any>;
  };
}

/**
 * Plugin registry for managing extensions
 */
class PluginRegistry {
  private plugins: Map<string, Plugin> = new Map();
  private loaders: Map<string, () => ILoader> = new Map();
  private splitters: Map<string, () => ITextSplitter> = new Map();
  private embeddingClients: Map<string, () => IEmbeddingClient> = new Map();
  private vectorStores: Map<string, () => IVectorStore> = new Map();
  private notificationAdapters: Map<string, () => INotificationAdapter> = new Map();
  private metricsAdapters: Map<string, () => IMetricsAdapter> = new Map();
  private hooks: Plugin['hooks'][] = [];

  /**
   * Register a plugin
   */
  register(plugin: Plugin): void {
    const pluginId = `${plugin.metadata.name}@${plugin.metadata.version}`;

    if (this.plugins.has(pluginId)) {
      logger.warn(`Plugin ${pluginId} is already registered, skipping`);
      return;
    }

    this.plugins.set(pluginId, plugin);

    // Register loaders
    if (plugin.loaders) {
      for (const [name, factory] of plugin.loaders.entries()) {
        this.loaders.set(name, factory);
      }
    }

    // Register splitters
    if (plugin.splitters) {
      for (const [name, factory] of plugin.splitters.entries()) {
        this.splitters.set(name, factory);
      }
    }

    // Register embedding clients
    if (plugin.embeddingClients) {
      for (const [name, factory] of plugin.embeddingClients.entries()) {
        this.embeddingClients.set(name, factory);
      }
    }

    // Register vector stores
    if (plugin.vectorStores) {
      for (const [name, factory] of plugin.vectorStores.entries()) {
        this.vectorStores.set(name, factory);
      }
    }

    // Register notification adapters
    if (plugin.notificationAdapters) {
      for (const [name, factory] of plugin.notificationAdapters.entries()) {
        this.notificationAdapters.set(name, factory);
      }
    }

    // Register metrics adapters
    if (plugin.metricsAdapters) {
      for (const [name, factory] of plugin.metricsAdapters.entries()) {
        this.metricsAdapters.set(name, factory);
      }
    }

    // Register hooks
    if (plugin.hooks) {
      this.hooks.push(plugin.hooks);
    }

    logger.info(`Registered plugin: ${pluginId}`, {
      loaders: plugin.loaders?.size || 0,
      splitters: plugin.splitters?.size || 0,
      embeddingClients: plugin.embeddingClients?.size || 0,
      vectorStores: plugin.vectorStores?.size || 0,
      hasHooks: !!plugin.hooks,
    });
  }

  /**
   * Get a loader by name
   */
  getLoader(name: string): ILoader | null {
    const factory = this.loaders.get(name);
    return factory ? factory() : null;
  }

  /**
   * Get a splitter by name
   */
  getSplitter(name: string): ITextSplitter | null {
    const factory = this.splitters.get(name);
    return factory ? factory() : null;
  }

  /**
   * Get an embedding client by name
   */
  getEmbeddingClient(name: string): IEmbeddingClient | null {
    const factory = this.embeddingClients.get(name);
    return factory ? factory() : null;
  }

  /**
   * Get a vector store by name
   */
  getVectorStore(name: string): IVectorStore | null {
    const factory = this.vectorStores.get(name);
    return factory ? factory() : null;
  }

  /**
   * Get a notification adapter by name
   */
  getNotificationAdapter(name: string): INotificationAdapter | null {
    const factory = this.notificationAdapters.get(name);
    return factory ? factory() : null;
  }

  /**
   * Get a metrics adapter by name
   */
  getMetricsAdapter(name: string): IMetricsAdapter | null {
    const factory = this.metricsAdapters.get(name);
    return factory ? factory() : null;
  }

  /**
   * Execute beforeIngest hooks
   */
  async executeBeforeIngestHooks(config: any): Promise<any> {
    let result = config;
    for (const hook of this.hooks) {
      if (hook.beforeIngest) {
        result = await hook.beforeIngest(result);
      }
    }
    return result;
  }

  /**
   * Execute afterIngest hooks
   */
  async executeAfterIngestHooks(result: any): Promise<void> {
    for (const hook of this.hooks) {
      if (hook.afterIngest) {
        await hook.afterIngest(result);
      }
    }
  }

  /**
   * Execute beforeSearch hooks
   */
  async executeBeforeSearchHooks(query: any): Promise<any> {
    let result = query;
    for (const hook of this.hooks) {
      if (hook.beforeSearch) {
        result = await hook.beforeSearch(result);
      }
    }
    return result;
  }

  /**
   * Execute afterSearch hooks
   */
  async executeAfterSearchHooks(results: any): Promise<any> {
    let result = results;
    for (const hook of this.hooks) {
      if (hook.afterSearch) {
        result = await hook.afterSearch(result);
      }
    }
    return result;
  }

  /**
   * List all registered plugins
   */
  listPlugins(): PluginMetadata[] {
    return Array.from(this.plugins.values()).map(p => p.metadata);
  }

  /**
   * List available components
   */
  listComponents(): {
    loaders: string[];
    splitters: string[];
    embeddingClients: string[];
    vectorStores: string[];
    notificationAdapters: string[];
    metricsAdapters: string[];
  } {
    return {
      loaders: Array.from(this.loaders.keys()),
      splitters: Array.from(this.splitters.keys()),
      embeddingClients: Array.from(this.embeddingClients.keys()),
      vectorStores: Array.from(this.vectorStores.keys()),
      notificationAdapters: Array.from(this.notificationAdapters.keys()),
      metricsAdapters: Array.from(this.metricsAdapters.keys()),
    };
  }

  /**
   * Clear all plugins
   */
  clear(): void {
    this.plugins.clear();
    this.loaders.clear();
    this.splitters.clear();
    this.embeddingClients.clear();
    this.vectorStores.clear();
    this.notificationAdapters.clear();
    this.metricsAdapters.clear();
    this.hooks = [];
  }
}

/**
 * Global plugin registry
 */
export const pluginRegistry = new PluginRegistry();
