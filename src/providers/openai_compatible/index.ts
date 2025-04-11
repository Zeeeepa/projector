import { BaseModelProvider, ProviderApiError } from '../types';
import { AIProvider } from '../../types';

/**
 * OpenAI Compatible API provider implementation
 * For third-party services that implement the OpenAI API format
 */
export class OpenAICompatibleProvider extends BaseModelProvider {
  private static instance: OpenAICompatibleProvider;
  
  private constructor() {
    super('OpenAI Compatible', 'openai_compatible');
  }
  
  /**
   * Get singleton instance
   */
  public static getInstance(): OpenAICompatibleProvider {
    if (!OpenAICompatibleProvider.instance) {
      OpenAICompatibleProvider.instance = new OpenAICompatibleProvider();
    }
    return OpenAICompatibleProvider.instance;
  }
  
  /**
   * Validate OpenAI Compatible API key
   */
  async validateApiKey(apiKey: string, customEndpoint?: string): Promise<boolean> {
    if (!apiKey || !customEndpoint) return false;
    
    try {
      // Make a minimal API call to validate the key
      const response = await fetch(`${customEndpoint}/models`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        }
      });
      
      return response.ok;
    } catch (error) {
      console.error('Error validating OpenAI Compatible API key:', error);
      return false;
    }
  }
  
  /**
   * Get available models from OpenAI Compatible API
   */
  async getAvailableModels(apiKey: string, customEndpoint?: string): Promise<string[]> {
    if (!apiKey || !customEndpoint) {
      throw new ProviderApiError('API key and endpoint are required');
    }
    
    try {
      const response = await fetch(`${customEndpoint}/models`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('API error response:', errorText);
        throw new ProviderApiError(`API error: ${response.status} - ${errorText}`);
      }
      
      const data = await response.json();
      
      // Extract model IDs from the response
      if (data.data && Array.isArray(data.data)) {
        return data.data.map((model: any) => model.id);
      }
      
      return this.getDefaultModels();
    } catch (error) {
      console.error('Error fetching OpenAI Compatible models:', error);
      return this.getDefaultModels();
    }
  }
  
  /**
   * Test connection to OpenAI Compatible API
   */
  async testConnection(apiKey: string, model: string, testMessage: string, customEndpoint?: string): Promise<{ success: boolean; message: string }> {
    if (!apiKey) {
      return { success: false, message: 'API key is required' };
    }
    
    if (!customEndpoint) {
      return { success: false, message: 'API endpoint is required' };
    }
    
    if (!model) {
      return { success: false, message: 'Model is required' };
    }
    
    try {
      console.log(`Testing connection to ${customEndpoint} with model ${model}`);
      
      const response = await fetch(`${customEndpoint}/chat/completions`, {
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
        const errorText = await response.text();
        console.error('API error response:', errorText);
        
        let errorMessage = `API error: ${response.status}`;
        try {
          const errorData = JSON.parse(errorText);
          if (errorData.error?.message) {
            errorMessage = errorData.error.message;
          }
        } catch (e) {
          // If parsing fails, use the raw error text
          errorMessage += ` - ${errorText}`;
        }
        
        throw new ProviderApiError(errorMessage);
      }
      
      const data = await response.json();
      const aiResponse = data.choices?.[0]?.message?.content || '';
      
      return {
        success: true,
        message: `Connection successful! Response: "${aiResponse.substring(0, 100)}${aiResponse.length > 100 ? '...' : ''}"`
      };
    } catch (error) {
      console.error('Error testing OpenAI Compatible connection:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to connect to OpenAI Compatible API'
      };
    }
  }
  
  /**
   * Send a chat message to OpenAI Compatible API
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
    
    const endpoint = customEndpoint || apiBaseUrl;
    if (!endpoint) {
      throw new ProviderApiError('API endpoint is required');
    }
    
    if (!model) {
      throw new ProviderApiError('Model is required');
    }
    
    try {
      console.log(`Sending message to ${endpoint}/chat/completions with model ${model}`);
      
      const response = await fetch(`${endpoint}/chat/completions`, {
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
        const errorText = await response.text();
        console.error('API error response:', errorText);
        
        let errorMessage = `API error: ${response.status}`;
        try {
          const errorData = JSON.parse(errorText);
          if (errorData.error?.message) {
            errorMessage = errorData.error.message;
          }
        } catch (e) {
          // If parsing fails, use the raw error text
          errorMessage += ` - ${errorText}`;
        }
        
        throw new ProviderApiError(errorMessage);
      }
      
      const data = await response.json();
      return data.choices?.[0]?.message?.content || 'No response from AI';
    } catch (error) {
      console.error('Error sending message to OpenAI Compatible API:', error);
      throw new ProviderApiError(error instanceof Error ? error.message : 'Failed to send message to OpenAI Compatible API');
    }
  }
  
  /**
   * Get default models for OpenAI Compatible
   */
  getDefaultModels(): string[] {
    return [
      'gpt-4',
      'gpt-3.5-turbo',
      'claude-3-opus-20240229',
      'claude-3-sonnet-20240229',
      'llama-2-70b-chat',
      'mistral-7b-instruct'
    ];
  }
}

// Export singleton instance
export const openAICompatibleProvider = OpenAICompatibleProvider.getInstance();
