import { BaseModelProvider, ProviderApiError } from '../types';
import { AIProvider } from '../../types';

/**
 * Nvidia API provider implementation
 */
export class NvidiaProvider extends BaseModelProvider {
  private static instance: NvidiaProvider;
  
  private constructor() {
    super('Nvidia', 'Nvidia');
  }
  
  /**
   * Get singleton instance
   */
  public static getInstance(): NvidiaProvider {
    if (!NvidiaProvider.instance) {
      NvidiaProvider.instance = new NvidiaProvider();
    }
    return NvidiaProvider.instance;
  }
  
  /**
   * Validate Nvidia API key
   */
  async validateApiKey(apiKey: string): Promise<boolean> {
    if (!apiKey) return false;
    
    try {
      // Make a minimal API call to validate the key
      const response = await fetch('https://api.nvidia.com/v1/models', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiKey}`
        }
      });
      
      return response.ok;
    } catch (error) {
      console.error('Error validating Nvidia API key:', error);
      return false;
    }
  }
  
  /**
   * Get available models from Nvidia
   */
  async getAvailableModels(apiKey: string): Promise<string[]> {
    if (!apiKey) {
      throw new ProviderApiError('API key is required');
    }
    
    try {
      const response = await fetch('https://api.nvidia.com/v1/models', {
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
      console.error('Error fetching Nvidia models:', error);
      return this.getDefaultModels();
    }
  }
  
  /**
   * Test connection to Nvidia API
   */
  async testConnection(apiKey: string, model: string, testMessage: string): Promise<{ success: boolean; message: string }> {
    if (!apiKey) {
      return { success: false, message: 'API key is required' };
    }
    
    if (!model) {
      return { success: false, message: 'Model is required' };
    }
    
    try {
      const response = await fetch('https://api.nvidia.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
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
      const aiResponse = data.choices?.[0]?.message?.content || '';
      
      return {
        success: true,
        message: `Connection successful! Response: "${aiResponse.substring(0, 100)}${aiResponse.length > 100 ? '...' : ''}"`
      };
    } catch (error) {
      console.error('Error testing Nvidia connection:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to connect to Nvidia API'
      };
    }
  }
  
  /**
   * Send a chat message to Nvidia
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
      const response = await fetch('https://api.nvidia.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
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
      return data.choices?.[0]?.message?.content || 'No response from AI';
    } catch (error) {
      console.error('Error sending message to Nvidia:', error);
      throw new ProviderApiError(error instanceof Error ? error.message : 'Failed to send message to Nvidia API');
    }
  }
  
  /**
   * Get default models for Nvidia
   */
  getDefaultModels(): string[] {
    return [
      'llama-3-70b',
      'mixtral-8x7b'
    ];
  }
}

// Export singleton instance
export const nvidiaProvider = NvidiaProvider.getInstance();
