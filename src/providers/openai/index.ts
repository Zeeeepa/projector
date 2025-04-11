import { BaseModelProvider, ProviderApiError } from '../types';
import { AIProvider } from '../../types';

/**
 * OpenAI API provider implementation
 */
export class OpenAIProvider extends BaseModelProvider {
  private static instance: OpenAIProvider;
  
  private constructor() {
    super('OpenAI', 'Open_AI');
  }
  
  /**
   * Get singleton instance
   */
  public static getInstance(): OpenAIProvider {
    if (!OpenAIProvider.instance) {
      OpenAIProvider.instance = new OpenAIProvider();
    }
    return OpenAIProvider.instance;
  }
  
  /**
   * Validate OpenAI API key
   */
  async validateApiKey(apiKey: string, customEndpoint?: string, apiBaseUrl?: string): Promise<boolean> {
    if (!apiKey) return false;
    
    try {
      // Make a minimal API call to validate the key
      const baseUrl = apiBaseUrl || 'https://api.openai.com';
      const response = await fetch(`${baseUrl}/v1/models`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiKey}`
        }
      });
      
      return response.ok;
    } catch (error) {
      console.error('Error validating OpenAI API key:', error);
      return false;
    }
  }
  
  /**
   * Get available models from OpenAI
   */
  async getAvailableModels(apiKey: string, customEndpoint?: string, apiBaseUrl?: string): Promise<string[]> {
    if (!apiKey) {
      throw new ProviderApiError('API key is required');
    }
    
    try {
      const baseUrl = apiBaseUrl || 'https://api.openai.com';
      const response = await fetch(`${baseUrl}/v1/models`, {
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
        return data.data
          .filter((model: any) => 
            model.id.includes('gpt') || 
            model.id.includes('llama') || 
            model.id.includes('mistral')
          )
          .map((model: any) => model.id);
      }
      
      return this.getDefaultModels();
    } catch (error) {
      console.error('Error fetching OpenAI models:', error);
      return this.getDefaultModels();
    }
  }
  
  /**
   * Test connection to OpenAI API
   */
  async testConnection(apiKey: string, model: string, testMessage: string, customEndpoint?: string, apiBaseUrl?: string): Promise<{ success: boolean; message: string }> {
    if (!apiKey) {
      return { success: false, message: 'API key is required' };
    }
    
    if (!model) {
      return { success: false, message: 'Model is required' };
    }
    
    try {
      const baseUrl = apiBaseUrl || 'https://api.openai.com';
      const response = await fetch(`${baseUrl}/v1/chat/completions`, {
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
      console.error('Error testing OpenAI connection:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to connect to OpenAI API'
      };
    }
  }
  
  /**
   * Send a chat message to OpenAI
   */
  async sendChatMessage(
    apiKey: string,
    model: string,
    messages: { role: string; content: string }[],
    customEndpoint?: string,
    apiBaseUrl?: string
  ): Promise<string> {
    if (!apiKey) {
      throw new ProviderApiError('API key is required');
    }
    
    if (!model) {
      throw new ProviderApiError('Model is required');
    }
    
    try {
      const baseUrl = apiBaseUrl || 'https://api.openai.com';
      const response = await fetch(`${baseUrl}/v1/chat/completions`, {
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
      console.error('Error sending message to OpenAI:', error);
      throw new ProviderApiError(error instanceof Error ? error.message : 'Failed to send message to OpenAI API');
    }
  }
  
  /**
   * Get default models for OpenAI
   */
  getDefaultModels(): string[] {
    return [
      'gpt-4',
      'gpt-4-turbo',
      'gpt-3.5-turbo'
    ];
  }
}

// Export singleton instance
export const openAIProvider = OpenAIProvider.getInstance();
