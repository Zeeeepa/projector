import { AIProvider } from '../types';

/**
 * Common interface for all model providers
 */
export interface ModelProviderInterface {
  /**
   * Get the name of the provider
   */
  getName(): string;
  
  /**
   * Get the provider type
   */
  getProviderType(): AIProvider;
  
  /**
   * Validate API key
   * @param apiKey API key to validate
   * @param customEndpoint Optional custom endpoint for compatible providers
   * @param apiBaseUrl Optional base URL for the API (for OpenAI)
   */
  validateApiKey(apiKey: string, customEndpoint?: string, apiBaseUrl?: string): Promise<boolean>;
  
  /**
   * Get available models from the provider
   * @param apiKey API key for authentication
   * @param customEndpoint Optional custom endpoint for compatible providers
   * @param apiBaseUrl Optional base URL for the API (for OpenAI)
   */
  getAvailableModels(apiKey: string, customEndpoint?: string, apiBaseUrl?: string): Promise<string[]>;
  
  /**
   * Test connection to the provider
   * @param apiKey API key for authentication
   * @param model Model to test
   * @param testMessage Test message to send
   * @param customEndpoint Optional custom endpoint for compatible providers
   * @param apiBaseUrl Optional base URL for the API (for OpenAI)
   */
  testConnection(
    apiKey: string, 
    model: string, 
    testMessage: string, 
    customEndpoint?: string,
    apiBaseUrl?: string
  ): Promise<{ success: boolean; message: string }>;
  
  /**
   * Send a chat message to the provider
   * @param apiKey API key for authentication
   * @param model Model to use
   * @param messages Array of messages in the conversation
   * @param customEndpoint Optional custom endpoint for compatible providers
   * @param apiBaseUrl Optional base URL for the API (for OpenAI)
   */
  sendChatMessage(
    apiKey: string,
    model: string,
    messages: { role: string; content: string }[],
    customEndpoint?: string,
    apiBaseUrl?: string
  ): Promise<string>;
  
  /**
   * Get default models for this provider
   * Used as fallback when API call fails
   */
  getDefaultModels(): string[];
}

/**
 * Base model provider implementation with common functionality
 */
export abstract class BaseModelProvider implements ModelProviderInterface {
  protected name: string;
  protected providerType: AIProvider;
  
  constructor(name: string, providerType: AIProvider) {
    this.name = name;
    this.providerType = providerType;
  }
  
  getName(): string {
    return this.name;
  }
  
  getProviderType(): AIProvider {
    return this.providerType;
  }
  
  abstract validateApiKey(apiKey: string, customEndpoint?: string, apiBaseUrl?: string): Promise<boolean>;
  abstract getAvailableModels(apiKey: string, customEndpoint?: string, apiBaseUrl?: string): Promise<string[]>;
  abstract testConnection(apiKey: string, model: string, testMessage: string, customEndpoint?: string, apiBaseUrl?: string): Promise<{ success: boolean; message: string }>;
  abstract sendChatMessage(apiKey: string, model: string, messages: { role: string; content: string }[], customEndpoint?: string, apiBaseUrl?: string): Promise<string>;
  abstract getDefaultModels(): string[];
}

/**
 * Error thrown when a provider API call fails
 */
export class ProviderApiError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ProviderApiError';
  }
}
