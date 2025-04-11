import { BaseModelProvider, ProviderApiError } from '../types';
import { AIProvider } from '../../types';

/**
 * OpenRouter API provider implementation
 */
export class OpenRouterProvider extends BaseModelProvider {
  private static instance: OpenRouterProvider;
  
  private constructor() {
    super('OpenRouter', 'Open_AI_Compatible');
  }
  
  /**
   * Get singleton instance
   */
  public static getInstance(): OpenRouterProvider {
    if (!OpenRouterProvider.instance) {
      OpenRouterProvider.instance = new OpenRouterProvider();
    }
    return OpenRouterProvider.instance;
  }
  
  /**
   * Validate OpenRouter API key
   */
  async validateApiKey(apiKey: string, customEndpoint?: string): Promise<boolean> {
    if (!apiKey) return false;
    
    try {
      // Make a minimal API call to validate the key
      const endpoint = customEndpoint || 'https://openrouter.ai/api/v1/models';
      
      const response = await fetch(endpoint, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiKey}`
        }
      });
      
      return response.ok;
    } catch (error) {
      console.error('Error validating OpenRouter API key:', error);
      return false;
    }
  }
  
  /**
   * Get available models from OpenRouter
   */
  async getAvailableModels(apiKey: string, customEndpoint?: string): Promise<string[]> {
    if (!apiKey) {
      throw new ProviderApiError('API key is required');
    }
    
    try {
      const endpoint = customEndpoint || 'https://openrouter.ai/api/v1/models';
      
      const response = await fetch(endpoint, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiKey}`
        }
      });
      
      if (!response.ok) {
        throw new ProviderApiError(`API error: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Extract model IDs from the response
      if (data.data && Array.isArray(data.data)) {
        return data.data.map((model: any) => model.id);
      }
      
      return this.getDefaultModels();
    } catch (error) {
      console.error('Error fetching OpenRouter models:', error);
      return this.getDefaultModels();
    }
  }
  
  /**
   * Test connection to OpenRouter API
   */
  async testConnection(apiKey: string, model: string, testMessage: string, customEndpoint?: string): Promise<{ success: boolean; message: string }> {
    if (!apiKey) {
      return { success: false, message: 'API key is required' };
    }
    
    if (!model) {
      return { success: false, message: 'Model is required' };
    }
    
    try {
      const endpoint = customEndpoint || 'https://openrouter.ai/api/v1/chat/completions';
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
          'HTTP-Referer': window.location.origin,
          'X-Title': 'Projector'
        },
        body: JSON.stringify({
          model: model,
          messages: [{ role: 'user', content: testMessage }],
          max_tokens: 50,
          temperature: 0.7
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new ProviderApiError(errorData.error?.message || `API error: ${response.status}`);
      }
      
      const data = await response.json();
      const aiResponse = data.choices?.[0]?.message?.content || '';
      
      return {
        success: true,
        message: `Connection successful! Response: "${aiResponse.substring(0, 100)}${aiResponse.length > 100 ? '...' : ''}"`
      };
    } catch (error) {
      console.error('Error testing OpenRouter connection:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to connect to OpenRouter API'
      };
    }
  }
  
  /**
   * Send a chat message to OpenRouter
   */
  async sendChatMessage(
    apiKey: string,
    model: string,
    messages: { role: string; content: string }[],
    customEndpoint?: string
  ): Promise<string> {
    if (!apiKey) {
      throw new ProviderApiError('API key is required');
    }
    
    if (!model) {
      throw new ProviderApiError('Model is required');
    }
    
    try {
      const endpoint = customEndpoint || 'https://openrouter.ai/api/v1/chat/completions';
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
          'HTTP-Referer': window.location.origin,
          'X-Title': 'Projector'
        },
        body: JSON.stringify({
          model: model,
          messages: messages,
          max_tokens: 1000,
          temperature: 0.7
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new ProviderApiError(errorData.error?.message || `API error: ${response.status}`);
      }
      
      const data = await response.json();
      return data.choices?.[0]?.message?.content || 'No response from AI';
    } catch (error) {
      console.error('Error sending message to OpenRouter:', error);
      throw new ProviderApiError(error instanceof Error ? error.message : 'Failed to send message to OpenRouter API');
    }
  }
  
  /**
   * Get default models for OpenRouter
   */
  getDefaultModels(): string[] {
    return [
      'openai/gpt-4',
      'anthropic/claude-3-opus',
      'anthropic/claude-3-sonnet',
      'meta-llama/llama-3-70b-instruct',
      'google/gemini-pro'
    ];
  }
}

// Export singleton instance
export const openRouterProvider = OpenRouterProvider.getInstance();
