import { BaseModelProvider, ProviderApiError } from '../types';
import { AIProvider } from '../../types';

/**
 * DeepInfra API provider implementation
 */
export class DeepInfraProvider extends BaseModelProvider {
  private static instance: DeepInfraProvider;
  
  private constructor() {
    super('DeepInfra', 'Open_AI_Compatible');
  }
  
  /**
   * Get singleton instance
   */
  public static getInstance(): DeepInfraProvider {
    if (!DeepInfraProvider.instance) {
      DeepInfraProvider.instance = new DeepInfraProvider();
    }
    return DeepInfraProvider.instance;
  }
  
  /**
   * Validate DeepInfra API key
   */
  async validateApiKey(apiKey: string, customEndpoint?: string): Promise<boolean> {
    if (!apiKey) return false;
    
    try {
      // Make a minimal API call to validate the key
      const endpoint = customEndpoint || 'https://api.deepinfra.com/v1/models';
      
      const response = await fetch(endpoint, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiKey}`
        }
      });
      
      return response.ok;
    } catch (error) {
      console.error('Error validating DeepInfra API key:', error);
      return false;
    }
  }
  
  /**
   * Get available models from DeepInfra
   */
  async getAvailableModels(apiKey: string, customEndpoint?: string): Promise<string[]> {
    if (!apiKey) {
      throw new ProviderApiError('API key is required');
    }
    
    try {
      const baseUrl = customEndpoint ? new URL(customEndpoint) : new URL('https://api.deepinfra.com/v1/chat/completions');
      const endpoint = `${baseUrl.protocol}//${baseUrl.host}/v1/models`;
      
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
      console.error('Error fetching DeepInfra models:', error);
      return this.getDefaultModels();
    }
  }
  
  /**
   * Test connection to DeepInfra API
   */
  async testConnection(apiKey: string, model: string, testMessage: string, customEndpoint?: string): Promise<{ success: boolean; message: string }> {
    if (!apiKey) {
      return { success: false, message: 'API key is required' };
    }
    
    if (!model) {
      return { success: false, message: 'Model is required' };
    }
    
    try {
      const endpoint = customEndpoint || 'https://api.deepinfra.com/v1/chat/completions';
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
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
      console.error('Error testing DeepInfra connection:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to connect to DeepInfra API'
      };
    }
  }
  
  /**
   * Send a chat message to DeepInfra
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
      const endpoint = customEndpoint || 'https://api.deepinfra.com/v1/chat/completions';
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
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
      console.error('Error sending message to DeepInfra:', error);
      throw new ProviderApiError(error instanceof Error ? error.message : 'Failed to send message to DeepInfra API');
    }
  }
  
  /**
   * Get default models for DeepInfra
   */
  getDefaultModels(): string[] {
    return [
      'llama-3-8b',
      'llama-3-70b',
      'mistral-7b',
      'mixtral-8x7b'
    ];
  }
}

// Export singleton instance
export const deepInfraProvider = DeepInfraProvider.getInstance();
