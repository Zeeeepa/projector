import { Project, ChatMessage, APISettings, AIConfig, SlackConfig, AIProvider } from '../types';
import { providerRegistry } from '../providers';

// Default API URL - can be overridden in settings
const DEFAULT_API_URL = 'http://localhost:8000';

/**
 * API Service for interacting with the backend
 */
class APIService {
  private apiBaseUrl: string;
  private apiKey: string | null;
  private githubToken: string | null;
  private customEndpoint: string | null;
  private aiProvider: AIProvider | null;
  private model: string | null;
  private activeConfig: AIConfig | null = null;
  
  /**
   * Initialize API service with optional settings
   */
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
    if (settings.apiKey !== undefined) {
      this.apiKey = settings.apiKey;
    }
    if (settings.githubToken !== undefined) {
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
  setActiveConfig(config: AIConfig): void {
    this.activeConfig = config;
  }
  
  /**
   * Clear active AI configuration
   */
  clearActiveConfig(): void {
    this.activeConfig = null;
  }
  
  /**
   * Get projects from the API
   */
  async getProjects(): Promise<Project[]> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/api/projects`, {
        headers: this.getHeaders()
      });
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error fetching projects:', error);
      return [];
    }
  }
  
  /**
   * Send a chat message to the AI
   */
  async sendChatMessage(
    message: string, 
    projectId?: string,
    chatHistory: ChatMessage[] = []
  ): Promise<{ response: string; chat_history: ChatMessage[] }> {
    try {
      // Use active config if available, otherwise use global settings
      const apiKey = this.activeConfig?.apiKey || this.apiKey;
      const model = this.activeConfig?.model || this.model;
      const aiProvider = this.activeConfig?.aiProvider || this.aiProvider;
      const customEndpoint = this.activeConfig?.customEndpoint || this.customEndpoint;
      const apiBaseUrl = this.activeConfig?.apiBaseUrl;
      
      if (!apiKey) {
        throw new Error('API key is required');
      }
      
      if (!model) {
        throw new Error('Model is required');
      }
      
      if (!aiProvider) {
        throw new Error('AI provider is required');
      }
      
      // Convert chat history to the format expected by the provider
      const formattedHistory = chatHistory.map(msg => ({
        role: msg.sender === 'user' ? 'user' : 'assistant',
        content: msg.content
      }));
      
      // Add the current message
      formattedHistory.push({ role: 'user', content: message });
      
      // Use provider-specific implementation
      const providerInstance = providerRegistry.getProvider(aiProvider);
      if (!providerInstance) {
        throw new Error(`Provider ${aiProvider} not found`);
      }
      
      // Send the message to the provider
      const response = await providerInstance.sendChatMessage(
        apiKey,
        model,
        formattedHistory,
        customEndpoint,
        apiBaseUrl
      );
      
      // Return the response with updated chat history
      return {
        response,
        chat_history: [
          ...chatHistory,
          { 
            id: crypto.randomUUID(),
            content: message,
            sender: 'user',
            timestamp: new Date().toISOString(),
            projectId
          },
          {
            id: crypto.randomUUID(),
            content: response,
            sender: 'ai',
            timestamp: new Date().toISOString(),
            projectId
          }
        ]
      };
    } catch (error) {
      console.error('Error sending chat message:', error);
      throw error;
    }
  }
  
  /**
   * Create a new project
   */
  async createProject(project: Omit<Project, 'id' | 'created_at' | 'initialized' | 'progress' | 'documentation'>): Promise<Project> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/api/projects`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(project)
      });
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error creating project:', error);
      throw error;
    }
  }
  
  /**
   * Get GitHub repositories for the authenticated user
   */
  async getGitHubRepositories(): Promise<{ name: string; full_name: string; description: string | null }[]> {
    if (!this.githubToken) {
      throw new Error('GitHub token is required');
    }
    
    try {
      // First, validate the token by checking the user endpoint
      const userResponse = await fetch('https://api.github.com/user', {
        headers: {
          'Accept': 'application/vnd.github+json',
          'Authorization': `token ${this.githubToken}`,
          'X-GitHub-Api-Version': '2022-11-28'
        }
      });
      
      if (!userResponse.ok) {
        throw new Error(`GitHub API error: ${userResponse.status} - Invalid token or insufficient permissions`);
      }
      
      // Then fetch repositories
      const response = await fetch('https://api.github.com/user/repos?sort=updated&per_page=100', {
        headers: {
          'Accept': 'application/vnd.github+json',
          'Authorization': `token ${this.githubToken}`,
          'X-GitHub-Api-Version': '2022-11-28'
        }
      });
      
      if (!response.ok) {
        throw new Error(`GitHub API error: ${response.status}`);
      }
      
      const repos = await response.json();
      return repos.map((repo: any) => ({
        name: repo.name,
        full_name: repo.full_name,
        description: repo.description
      }));
    } catch (error) {
      console.error('Error fetching GitHub repositories:', error);
      throw error;
    }
  }
  
  /**
   * Get available AI providers
   */
  getAvailableProviders(): { id: string; name: string }[] {
    const providerNames = providerRegistry.getProviderNames().map(p => ({
      id: p.type,
      name: p.name
    }));
    
    // Add OpenAI Compatible as a separate option
    if (!providerNames.some(p => p.id === 'openai_compatible')) {
      providerNames.push({ id: 'openai_compatible', name: 'OpenAI Compatible' });
    }
    
    return providerNames;
  }
  
  /**
   * Validate API key for a provider
   */
  async validateApiKey(provider: AIProvider, apiKey: string, customEndpoint?: string): Promise<boolean> {
    try {
      const providerInstance = providerRegistry.getProvider(provider);
      if (!providerInstance) {
        throw new Error(`Provider ${provider} not found`);
      }
      
      return await providerInstance.validateApiKey(apiKey, customEndpoint);
    } catch (error) {
      console.error(`Error validating ${provider} API key:`, error);
      return false;
    }
  }
  
  /**
   * Test connection to AI provider
   */
  async testConnection(
    provider: AIProvider,
    apiKey: string,
    model: string,
    customEndpoint?: string
  ): Promise<{ success: boolean; message: string }> {
    try {
      const providerInstance = providerRegistry.getProvider(provider);
      if (!providerInstance) {
        return { success: false, message: `Provider ${provider} not found` };
      }
      
      return await providerInstance.testConnection(
        apiKey,
        model,
        'Hello, this is a test message.',
        customEndpoint
      );
    } catch (error) {
      console.error(`Error testing ${provider} connection:`, error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to test connection'
      };
    }
  }
  
  /**
   * Get available models for a provider
   */
  async getAvailableModels(provider: AIProvider, apiKey: string, customEndpoint?: string): Promise<string[]> {
    try {
      const providerInstance = providerRegistry.getProvider(provider);
      if (!providerInstance) {
        throw new Error(`Provider ${provider} not found`);
      }
      
      return await providerInstance.getAvailableModels(apiKey, customEndpoint);
    } catch (error) {
      console.error(`Error fetching ${provider} models:`, error);
      return [];
    }
  }
  
  /**
   * Get headers for API requests
   */
  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };
    
    if (this.apiKey) {
      headers['X-API-Key'] = this.apiKey;
    }
    
    if (this.githubToken) {
      headers['X-GitHub-Token'] = this.githubToken;
    }
    
    return headers;
  }
}

// Export singleton instance
export const apiService = new APIService();
