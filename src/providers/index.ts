import { AIProvider } from '../types';
import { ModelProviderInterface } from './types';
import { anthropicProvider } from './anthropic';
import { openAIProvider } from './openai';
import { nvidiaProvider } from './nvidia';
import { deepInfraProvider } from './deepinfra';
import { openRouterProvider } from './openrouter';

/**
 * Registry of all available model providers
 */
class ProviderRegistry {
  private providers: Map<AIProvider, ModelProviderInterface>;
  private static instance: ProviderRegistry;
  
  private constructor() {
    this.providers = new Map();
    this.registerProviders();
  }
  
  /**
   * Get singleton instance
   */
  public static getInstance(): ProviderRegistry {
    if (!ProviderRegistry.instance) {
      ProviderRegistry.instance = new ProviderRegistry();
    }
    return ProviderRegistry.instance;
  }
  
  /**
   * Register all available providers
   */
  private registerProviders(): void {
    // Register built-in providers
    this.registerProvider(openAIProvider);
    this.registerProvider(anthropicProvider);
    this.registerProvider(nvidiaProvider);
    this.registerProvider(deepInfraProvider);
    this.registerProvider(openRouterProvider);
  }
  
  /**
   * Register a provider
   */
  public registerProvider(provider: ModelProviderInterface): void {
    this.providers.set(provider.getProviderType(), provider);
  }
  
  /**
   * Get a provider by type
   */
  public getProvider(type: AIProvider): ModelProviderInterface | undefined {
    return this.providers.get(type);
  }
  
  /**
   * Get all registered providers
   */
  public getAllProviders(): ModelProviderInterface[] {
    return Array.from(this.providers.values());
  }
  
  /**
   * Get provider types
   */
  public getProviderTypes(): AIProvider[] {
    return Array.from(this.providers.keys());
  }
  
  /**
   * Get provider names
   */
  public getProviderNames(): { type: AIProvider; name: string }[] {
    return Array.from(this.providers.entries()).map(([type, provider]) => ({
      type,
      name: provider.getName()
    }));
  }
}

// Export singleton instance
export const providerRegistry = ProviderRegistry.getInstance();

// Export all providers
export { anthropicProvider, openAIProvider, nvidiaProvider, deepInfraProvider, openRouterProvider };

// Export types
export * from './types';
