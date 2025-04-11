import { BaseModelProvider, ProviderApiError } from '../types';
import { AIProvider } from '../../types';

/**
 * Anthropic Claude API provider implementation
 */
export class AnthropicProvider extends BaseModelProvider {
  private static instance: AnthropicProvider;
  
  private constructor() {
    super('Anthropic Claude', 'Anthropic');
  }
  
  /**
   * Get singleton instance
   */
  public static getInstance(): AnthropicProvider {
    if (!AnthropicProvider.instance) {
      AnthropicProvider.instance = new AnthropicProvider();
    }
    return AnthropicProvider.instance;
  }
  
  /**
   * Validate Anthropic API key
   */
  async validateApiKey(apiKey: string): Promise<boolean> {
    if (!apiKey) return false;
    
    try {
      // Make a minimal API call to validate the key
      const response = await fetch('https://api.anthropic.com/v1/models', {
        method: 'GET',
        headers: {
          'anthropic-version': '2023-06-01',
          'Authorization': `Bearer ${apiKey}`
        }
      });
      
      return response.ok;
    } catch (error) {
      console.error('Error validating Anthropic API key:', error);
      return false;
    }
  }
  
  /**
   * Get available models from Anthropic
   */
  async getAvailableModels(apiKey: string): Promise<string[]> {
    if (!apiKey) {
      throw new ProviderApiError('API key is required');
    }
    
    try {
      const response = await fetch('https://api.anthropic.com/v1/models', {
        method: 'GET',
        headers: {
          'anthropic-version': '2023-06-01',
          'Authorization': `Bearer ${apiKey}`
        }
      });
      
      if (!response.ok) {
        throw new ProviderApiError(`API error: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Extract model IDs from the response
      if (data.models && Array.isArray(data.models)) {
        return data.models
          .filter((model: any) => model.id.includes('claude'))
          .map((model: any) => model.id);
      }
      
      return this.getDefaultModels();
    } catch (error) {
      console.error('Error fetching Anthropic models:', error);
      return this.getDefaultModels();
    }
  }
  
  /**
   * Test connection to Anthropic API
   */
  async testConnection(apiKey: string, model: string, testMessage: string): Promise<{ success: boolean; message: string }> {
    if (!apiKey) {
      return { success: false, message: 'API key is required' };
    }
    
    if (!model) {
      return { success: false, message: 'Model is required' };
    }
    
    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'anthropic-version': '2023-06-01',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: model,
          messages: [{ role: 'user', content: testMessage }],
          max_tokens: 50
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new ProviderApiError(errorData.error?.message || `API error: ${response.status}`);
      }
      
      const data = await response.json();
      const aiResponse = data.content?.[0]?.text || '';
      
      return {
        success: true,
        message: `Connection successful! Response: "${aiResponse.substring(0, 100)}${aiResponse.length > 100 ? '...' : ''}"`
      };
    } catch (error) {
      console.error('Error testing Anthropic connection:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to connect to Anthropic API'
      };
    }
  }
  
  /**
   * Send a chat message to Anthropic
   */
  async sendChatMessage(
    apiKey: string,
    model: string,
    messages: { role: string; content: string }[]
  ): Promise<string> {
    if (!apiKey) {
      throw new ProviderApiError('API key is required');
    }
    
    if (!model) {
      throw new ProviderApiError('Model is required');
    }
    
    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'anthropic-version': '2023-06-01',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: model,
          messages: messages,
          max_tokens: 1000
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new ProviderApiError(errorData.error?.message || `API error: ${response.status}`);
      }
      
      const data = await response.json();
      return data.content?.[0]?.text || 'No response from AI';
    } catch (error) {
      console.error('Error sending message to Anthropic:', error);
      throw new ProviderApiError(error instanceof Error ? error.message : 'Failed to send message to Anthropic API');
    }
  }
  
  /**
   * Get default models for Anthropic
   */
  getDefaultModels(): string[] {
    return [
      'claude-3-opus-20240229',
      'claude-3-sonnet-20240229',
      'claude-3-haiku-20240307'
    ];
  }
}

// Export singleton instance
export const anthropicProvider = AnthropicProvider.getInstance();
