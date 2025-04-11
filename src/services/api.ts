import { Project, ChatMessage, APISettings, AIConfig, SlackConfig, AIProvider } from '../types';
import { providerRegistry } from '../providers';

// Default API URL - can be overridden in settings
const DEFAULT_API_URL = 'http://localhost:8000';

/**
 * API service for communicating with the backend
 */
export class ApiService {
  private apiBaseUrl: string;
  private apiKey: string | null;
  private githubToken: string | null;
  private customEndpoint: string | null;
  private aiProvider: AIProvider | null;
  private model: string | null;
  private activeConfig: AIConfig | null = null;
  private activeSlackConfig: SlackConfig | null = null;

  constructor(settings?: APISettings) {
    this.apiBaseUrl = settings?.apiBaseUrl || DEFAULT_API_URL;
    this.apiKey = settings?.apiKey || null;
    this.githubToken = settings?.githubToken || null;
    this.customEndpoint = settings?.customEndpoint || null;
    this.aiProvider = settings?.aiProvider || null;
    this.model = settings?.model || null;
  }

  /**
   * Update API settings
   */
  updateSettings(settings: Partial<APISettings>): void {
    if (settings.apiBaseUrl) {
      this.apiBaseUrl = settings.apiBaseUrl;
    }
    if (settings.apiKey) {
      this.apiKey = settings.apiKey;
    }
    if (settings.githubToken) {
      this.githubToken = settings.githubToken;
    }
    if (settings.customEndpoint !== undefined) {
      this.customEndpoint = settings.customEndpoint;
    }
    if (settings.aiProvider) {
      this.aiProvider = settings.aiProvider;
    }
    if (settings.model) {
      this.model = settings.model;
    }
  }

  /**
   * Set active AI configuration
   */
  setActiveConfig(config: AIConfig | null): void {
    this.activeConfig = config;
    if (config) {
      this.apiKey = config.apiKey;
      this.aiProvider = config.aiProvider;
      this.model = config.model;
      this.customEndpoint = config.customEndpoint || null;
    }
  }
  /**
   * Set active Slack configuration
   */
  setActiveSlackConfig(config: SlackConfig | null): void {
    this.activeSlackConfig = config;
  }

  /**
   * Helper method to build request headers
   */
  private getHeaders(): HeadersInit {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    // Use active config if available, otherwise use global settings
    const apiKey = this.activeConfig?.apiKey || this.apiKey;
    
    if (apiKey) {
      headers['Authorization'] = `Bearer ${apiKey}`;
    }
    
    if (this.githubToken) {
      headers['X-GitHub-Token'] = this.githubToken;
    }

    return headers;
  }

  /**
   * Helper method to handle API responses
   */
  private async handleResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || errorData.error?.message || `API error: ${response.status}`);
    }
    return response.json() as Promise<T>;
  }

  /**
   * Get available models for a provider
   */
  async getAvailableModels(aiProvider: AIProvider, apiKey: string, customEndpoint?: string): Promise<string[]> {
    try {
      if (!apiKey) {
        throw new Error('API key is required');
      }
      
      // Try to use the provider registry first
      const provider = providerRegistry.getProvider(aiProvider);
      if (provider) {
        return await provider.getAvailableModels(apiKey, customEndpoint);
      }
      
      // Fall back to backend API if provider not found
      const response = await fetch(`${this.apiBaseUrl}/api/models/available`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({
          provider_id: aiProvider,
          api_key: apiKey,
          custom_endpoint: customEndpoint
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || `API error: ${response.status}`);
      }
      
      const data = await response.json();
      return data.models || [];
    } catch (error) {
      console.error('Error fetching models:', error);
      
      // Try to get default models from provider registry
      const provider = providerRegistry.getProvider(aiProvider);
      if (provider) {
        return provider.getDefaultModels();
      }
      
      throw error;
    }
  }

  /**
   * Get all available providers
   */
  async getProviders(): Promise<{ id: string; name: string }[]> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/api/models/providers`, {
        method: 'GET',
        headers: this.getHeaders(),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || `API error: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error fetching providers:', error);
      
      // Return provider names from registry if API fails
      const providerNames = providerRegistry.getProviderNames().map(p => ({
        id: p.type,
        name: p.name
      }));
      
      return providerNames.length > 0 ? providerNames : [
        { id: 'openai', name: 'OpenAI' },
        { id: 'anthropic', name: 'Anthropic' },
        { id: 'openai_compatible', name: 'OpenAI Compatible' }
      ];
    }
  }

  /**
   * Validate an API key for a provider
   */
  async validateApiKey(providerId: AIProvider, apiKey: string, customEndpoint?: string): Promise<boolean> {
    try {
      if (!apiKey) {
        return false;
      }
      
      // Try to use the provider registry first
      const provider = providerRegistry.getProvider(providerId);
      if (provider) {
        return await provider.validateApiKey(apiKey, customEndpoint);
      }
      
      // Fall back to backend API if provider not found
      const response = await fetch(`${this.apiBaseUrl}/api/models/validate`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({
          provider_id: providerId,
          api_key: apiKey,
          custom_endpoint: customEndpoint
        }),
      });
      
      if (!response.ok) {
        return false;
      }
      
      const data = await response.json();
      return data.valid || false;
    } catch (error) {
      console.error('Error validating API key:', error);
      return false;
    }
  }

  /**
   * Test AI configuration connection
   */
  async testAIConfig(config: Partial<AIConfig>): Promise<{ success: boolean; message: string }> {
    try {
      const { aiProvider, apiKey, model, customEndpoint } = config;
      
      if (!apiKey) {
        throw new Error('API key is required');
      }
      
      if (!model) {
        throw new Error('Model is required');
      }
      
      if (!aiProvider) {
        throw new Error('AI provider is required');
      }
      
      // Try to use the provider registry first
      const provider = providerRegistry.getProvider(aiProvider);
      if (provider) {
        return await provider.testConnection(apiKey, model, "Hello, this is a test message from Projector.", customEndpoint);
      }
      
      // Fall back to backend API if provider not found
      const response = await fetch(`${this.apiBaseUrl}/api/models/test`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({
          provider_id: aiProvider,
          api_key: apiKey,
          model: model,
          custom_endpoint: customEndpoint
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || `API error: ${response.status}`);
      }
      
      const result = await response.json();
      return result;
    } catch (err) {
      console.error('Error testing connection:', err);
      return {
        success: false,
        message: err instanceof Error ? err.message : 'Failed to connect to API'
      };
    }
  }

  /**
   * Get GitHub repositories for the authenticated user
   */
  async getGithubRepositories(): Promise<{ id: string, name: string, full_name: string, url: string }[]> {
    try {
      if (!this.githubToken) {
        throw new Error('GitHub token is required');
      }
      
      // First, validate the token by making a simple API call
      const validateResponse = await fetch('https://api.github.com/user', {
        method: 'GET',
        headers: {
          'Accept': 'application/vnd.github+json',
          'Authorization': `Bearer ${this.githubToken}`,
          'X-GitHub-Api-Version': '2022-11-28'
        }
      });
      
      if (!validateResponse.ok) {
        const errorData = await validateResponse.json().catch(() => ({}));
        throw new Error(errorData.message || `GitHub API error: ${validateResponse.status}`);
      }
      
      // If token is valid, fetch repositories
      const response = await fetch('https://api.github.com/user/repos?sort=updated&per_page=100', {
        method: 'GET',
        headers: {
          'Accept': 'application/vnd.github+json',
          'Authorization': `Bearer ${this.githubToken}`,
          'X-GitHub-Api-Version': '2022-11-28'
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `GitHub API error: ${response.status}`);
      }
      
      const repos = await response.json();
      return repos.map((repo: any) => ({
        id: repo.id.toString(),
        name: repo.name,
        full_name: repo.full_name,
        url: repo.html_url
      }));
    } catch (error) {
      console.error('Error fetching GitHub repositories:', error);
      throw error;
    }
  }
}

// Create a singleton instance
export const apiService = new ApiService();
