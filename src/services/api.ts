import { Project, ChatMessage, APISettings, AIConfig, SlackConfig } from '../types';

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
  private aiProvider: string | null;
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
   * Get all projects
   */
  async getProjects(): Promise<Project[]> {
    const response = await fetch(`${this.apiBaseUrl}/api/projects/`, {
      method: 'GET',
      headers: this.getHeaders(),
    });

    return this.handleResponse<Project[]>(response);
  }

  /**
   * Get a project by ID
   */
  async getProject(id: string): Promise<Project> {
    const response = await fetch(`${this.apiBaseUrl}/api/projects/${id}`, {
      method: 'GET',
      headers: this.getHeaders(),
    });

    return this.handleResponse<Project>(response);
  }

  /**
   * Create a new project
   */
  async createProject(project: Omit<Project, 'id' | 'created_at' | 'initialized' | 'progress' | 'documentation'>): Promise<Project> {
    const response = await fetch(`${this.apiBaseUrl}/api/projects/`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({
        name: project.name,
        git_url: project.githubUrl,
        slack_channel: project.slackChannel,
        max_parallel_tasks: project.threads
      }),
    });

    const data = await this.handleResponse<any>(response);
    
    // Transform the backend response to match frontend Project type
    return {
      id: data.id,
      name: data.name,
      description: '',
      githubUrl: data.git_url,
      slackChannel: data.slack_channel,
      threads: data.max_parallel_tasks,
      created_at: data.created_at,
      initialized: false,
      progress: 0,
      documentation: data.documents || [],
    };
  }

  /**
   * Update a project
   */
  async updateProject(id: string, updates: Partial<Project>): Promise<Project> {
    // Transform frontend model to backend model
    const backendUpdates: any = {};
    
    if (updates.name !== undefined) backendUpdates.name = updates.name;
    if (updates.githubUrl !== undefined) backendUpdates.git_url = updates.githubUrl;
    if (updates.slackChannel !== undefined) backendUpdates.slack_channel = updates.slackChannel;
    if (updates.threads !== undefined) backendUpdates.max_parallel_tasks = updates.threads;
    if (updates.documentation !== undefined) backendUpdates.documents = updates.documentation;
    
    const response = await fetch(`${this.apiBaseUrl}/api/projects/${id}`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify(backendUpdates),
    });

    const data = await this.handleResponse<any>(response);
    
    // Transform the backend response to match frontend Project type
    return {
      id: data.id,
      name: data.name,
      description: '',
      githubUrl: data.git_url,
      slackChannel: data.slack_channel,
      threads: data.max_parallel_tasks,
      created_at: data.created_at,
      initialized: updates.initialized !== undefined ? updates.initialized : false,
      progress: updates.progress !== undefined ? updates.progress : 0,
      documentation: data.documents || [],
    };
  }

  /**
   * Delete a project
   */
  async deleteProject(id: string): Promise<void> {
    const response = await fetch(`${this.apiBaseUrl}/api/projects/${id}`, {
      method: 'DELETE',
      headers: this.getHeaders(),
    });

    await this.handleResponse<{ message: string }>(response);
  }

  /**
   * Initialize a project
   */
  async initializeProject(id: string): Promise<void> {
    const response = await fetch(`${this.apiBaseUrl}/api/projects/${id}/analyze`, {
      method: 'POST',
      headers: this.getHeaders(),
    });

    await this.handleResponse<any>(response);
  }

  /**
   * Upload a document to a project
   */
  async uploadDocument(projectId: string, file: File, category: string = 'requirements'): Promise<string> {
    const formData = new FormData();
    formData.append('document', file);
    formData.append('category', category);

    const headers: HeadersInit = {};
    if (this.apiKey) {
      headers['Authorization'] = `Bearer ${this.apiKey}`;
    }
    if (this.githubToken) {
      headers['X-GitHub-Token'] = this.githubToken;
    }

    const response = await fetch(`${this.apiBaseUrl}/api/projects/${projectId}/documents`, {
      method: 'POST',
      headers,
      body: formData,
    });

    const data = await this.handleResponse<{ message: string }>(response);
    return data.message;
  }

  /**
   * Test Slack configuration connection
   */
  async testSlackConfig(config: Partial<SlackConfig>, testMessage: string = 'Test message from Projector'): Promise<{ success: boolean; message: string }> {
    try {
      const { token, defaultChannel, sendAsUser } = config;
      
      if (!token) {
        throw new Error('Slack token is required');
      }
      
      if (!defaultChannel) {
        throw new Error('Default channel is required');
      }
      
      const response = await fetch(`${this.apiBaseUrl}/api/slack/test`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({
          token,
          channel: defaultChannel,
          message: testMessage,
          as_user: sendAsUser
        }),
      });
      
      if (response.ok) {
        const data = await response.json();
        return {
          success: true,
          message: `Message sent successfully to ${defaultChannel}`
        };
      } else {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || errorData.error?.message || `API error: ${response.status}`);
      }
    } catch (err) {
      console.error('Error testing Slack connection:', err);
      return {
        success: false,
        message: err instanceof Error ? err.message : 'Failed to connect to Slack'
      };
    }
  }
  /**
   * Send a message to Slack
   */
  async sendSlackMessage(channel: string, message: string, threadTs?: string): Promise<{ success: boolean; ts?: string; error?: string }> {
    try {
      if (!this.activeSlackConfig && !channel) {
        throw new Error('No active Slack configuration or channel specified');
      }
      
      const slackToken = this.activeSlackConfig?.token;
      const useChannel = channel || this.activeSlackConfig?.defaultChannel;
      const sendAsUser = this.activeSlackConfig?.sendAsUser || false;
      
      if (!slackToken) {
        throw new Error('Slack token is required');
      }
      
      if (!useChannel) {
        throw new Error('Channel is required');
      }
      
      const response = await fetch(`${this.apiBaseUrl}/api/slack/send`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({
          token: slackToken,
          channel: useChannel,
          message,
          thread_ts: threadTs,
          as_user: sendAsUser
        }),
      });
      
      if (response.ok) {
        const data = await response.json();
        return {
          success: true,
          ts: data.ts
        };
      } else {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || errorData.error?.message || `API error: ${response.status}`);
      }
    } catch (err) {
      console.error('Error sending Slack message:', err);
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to send message to Slack'
      };
    }
  /**
   * Generate a project plan based on requirements
   */
  async generateProjectPlan(projectId: string, context: string): Promise<{ success: boolean; error?: string }> {
    try {
      // Use active config if available
      const aiProvider = this.activeConfig?.aiProvider || this.aiProvider;
      const apiKey = this.activeConfig?.apiKey || this.apiKey;
      const model = this.activeConfig?.model || this.model;
      const customEndpoint = this.activeConfig?.customEndpoint || this.customEndpoint;
      
      // If using direct AI provider, use that instead of backend
      if (aiProvider && apiKey) {
        const prompt = `
You are an expert software architect and project planner. 
Based on the following project requirements, create:
1. A step-by-step implementation plan
2. A high-level project structure with key components and their relationships

Requirements:
${context}

Format your response as follows:
IMPLEMENTATION_PLAN:
1. [First step with description]
   - [Subtask 1]
   - [Subtask 2]
2. [Second step with description]
   - [Subtask 1]
   - [Subtask 2]
...

PROJECT_STRUCTURE:
- [Component 1]
  - [Subcomponent 1.1]
  - [Subcomponent 1.2]
- [Component 2]
  - [Subcomponent 2.1]
...

Be specific, practical, and focus on creating a realistic implementation plan.
`;

        let response;
        let aiResponse = '';
        
        if (aiProvider === 'Open_AI' || aiProvider === 'Open_AI_Compatible') {
          const endpoint = aiProvider === 'Open_AI' 
            ? 'https://api.openai.com/v1/chat/completions'
            : customEndpoint;
            
          if (!endpoint) {
            throw new Error('No API endpoint configured');
          }
          
          response = await fetch(endpoint, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
              model: model || 'gpt-3.5-turbo',
              messages: [{ role: 'user', content: prompt }],
              max_tokens: 2000,
              temperature: 0.7
            })
          });
          
          const data = await this.handleResponse<any>(response);
          aiResponse = data.choices?.[0]?.message?.content || 'No response from AI';
        } else if (aiProvider === 'Anthropic') {
          response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'anthropic-version': '2023-06-01',
              'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
              model: model || 'claude-3-haiku-20240307',
              messages: [{ role: 'user', content: prompt }],
              max_tokens: 2000
            })
          });
          
          const data = await this.handleResponse<any>(response);
          aiResponse = data.content?.[0]?.text || 'No response from AI';
        } else if (aiProvider === 'Nvidia') {
          response = await fetch('https://api.nvidia.com/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
              model: model || 'llama-3-70b',
              messages: [{ role: 'user', content: prompt }],
              max_tokens: 2000
            })
          });
          
          const data = await this.handleResponse<any>(response);
          aiResponse = data.choices?.[0]?.message?.content || 'No response from AI';
        const planMatch = aiResponse.match(/IMPLEMENTATION_PLAN:([\s\S]*?)(?=PROJECT_STRUCTURE:|$)/i);
        const structureMatch = aiResponse.match(/PROJECT_STRUCTURE:([\s\S]*?)(?=$)/i);
        
        const plan = planMatch ? planMatch[1].trim() : '';
        const structure = structureMatch ? structureMatch[1].trim() : '';
        
        // Save the plan to the project
        await this.savePlanToBackend(projectId, aiResponse);
        
        return { success: true };
      }
      
      // Otherwise use the backend API
      const response = await fetch(`${this.apiBaseUrl}/api/projects/${projectId}/generate-plan`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({
          context
        }),
      });

      await this.handleResponse<any>(response);
      return { success: true };
    } catch (error) {
      console.error('Error generating project plan:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to generate plan'
      };
    }
  }

  /**
   * Save a generated plan to the backend
   */
  private async savePlanToBackend(projectId: string, planText: string): Promise<void> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/api/projects/${projectId}/save-plan`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({
          plan: planText
        }),
      });

      await this.handleResponse<any>(response);
    } catch (error) {
      console.error('Error saving plan to backend:', error);
      // We don't throw here to avoid breaking the flow if backend storage fails
    }
  }

  /**
   * Send a chat message and get a response
   */
  async sendChatMessage(message: string, projectId?: string, chatHistory?: ChatMessage[]): Promise<{ response: string, chat_history: ChatMessage[] }> {
    // Use active config if available
    const aiProvider = this.activeConfig?.aiProvider || this.aiProvider;
    const apiKey = this.activeConfig?.apiKey || this.apiKey;
    const model = this.activeConfig?.model || this.model;
    const customEndpoint = this.activeConfig?.customEndpoint || this.customEndpoint;
    
    // If using OpenAI Compatible endpoint, use that directly
    if ((aiProvider === 'Open_AI_Compatible' && customEndpoint) || 
        (aiProvider === 'Open_AI' && apiKey) || 
        (aiProvider === 'Anthropic' && apiKey) || 
        (aiProvider === 'Nvidia' && apiKey)) {
      try {
        // Format the chat history for the API
        const messages = chatHistory 
          ? chatHistory.map(msg => ({
              role: msg.sender === 'user' ? 'user' : 'assistant',
              content: msg.content
            }))
          : [];
        
        // Add the new message
        messages.push({
          role: 'user',
          content: message
        });
        
        let response;
        let aiResponse = '';
        
        if (aiProvider === 'Open_AI' || aiProvider === 'Open_AI_Compatible') {
          const endpoint = aiProvider === 'Open_AI' 
            ? 'https://api.openai.com/v1/chat/completions'
            : customEndpoint;
            
          if (!endpoint) {
            throw new Error('No API endpoint configured');
          }
          
          response = await fetch(endpoint, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
              model: model || 'gpt-3.5-turbo',
              messages,
              max_tokens: 1000,
              temperature: 0.7
            })
          });
          
          const data = await this.handleResponse<any>(response);
          aiResponse = data.choices?.[0]?.message?.content || 'No response from AI';
        } else if (aiProvider === 'Anthropic') {
          response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'anthropic-version': '2023-06-01',
              'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
              model: model || 'claude-3-haiku-20240307',
              messages,
              max_tokens: 1000
            })
          });
          
          const data = await this.handleResponse<any>(response);
          aiResponse = data.content?.[0]?.text || 'No response from AI';
        } else if (aiProvider === 'Nvidia') {
          response = await fetch('https://api.nvidia.com/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
              model: model || 'llama-3-70b',
              messages,
              max_tokens: 1000
            })
          });
          
          const data = await this.handleResponse<any>(response);
          aiResponse = data.choices?.[0]?.message?.content || 'No response from AI';
        }
        
        // Add the AI response to the chat history
        messages.push({
          role: 'assistant',
          content: aiResponse
        });
        
        // Transform to our internal format
        return {
          response: aiResponse,
          chat_history: messages.map(msg => ({
            id: crypto.randomUUID(),
            content: msg.content,
            sender: msg.role === 'user' ? 'user' : 'ai',
            timestamp: new Date().toISOString(),
            projectId
          }))
        };
      } catch (error) {
        console.error('Error using AI provider:', error);
        throw error;
      }
    }
    
    // Otherwise use the backend API
    const response = await fetch(`${this.apiBaseUrl}/api/chat/`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({
        project_id: projectId,
        message,
        chat_history: chatHistory ? chatHistory.map(msg => ({
          role: msg.sender === 'user' ? 'user' : 'assistant',
          content: msg.content
        })) : undefined
      }),
    });

    const data = await this.handleResponse<{ response: string, chat_history: { role: string, content: string }[] }>(response);
    
    // Transform the backend response to match frontend ChatMessage type
    return {
      response: data.response,
      chat_history: data.chat_history.map(msg => ({
        id: crypto.randomUUID(),
        content: msg.content,
        sender: msg.role === 'user' ? 'user' : 'ai',
        timestamp: new Date().toISOString(),
        projectId
      }))
    };
  }
  
  /**
   * Test AI configuration connection
   */
  async testAIConfig(config: Partial<AIConfig>, testMessage: string = 'Hello, can you hear me?'): Promise<{ success: boolean; message: string }> {
    try {
      const { aiProvider, apiKey, model, customEndpoint } = config;
      
      if (!apiKey) {
        throw new Error('API key is required');
      }
      
      let endpoint = '';
      let headers: HeadersInit = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      };
      
      let testBody: any = {};
      
      if (aiProvider === 'Open_AI' || aiProvider === 'Open_AI_Compatible') {
        endpoint = aiProvider === 'Open_AI' 
          ? 'https://api.openai.com/v1/chat/completions'
          : customEndpoint || '';
          
        if (aiProvider === 'Open_AI_Compatible' && !endpoint) {
          throw new Error('Custom endpoint is required for OpenAI Compatible provider');
        }
        
        testBody = {
          model: model || 'gpt-3.5-turbo',
          messages: [{ role: 'user', content: testMessage }],
          max_tokens: 50,
          temperature: 0.7
        };
      } else if (aiProvider === 'Anthropic') {
        endpoint = 'https://api.anthropic.com/v1/messages';
        headers['anthropic-version'] = '2023-06-01';
        
        testBody = {
          model: model || 'claude-3-haiku-20240307',
          messages: [{ role: 'user', content: testMessage }],
          max_tokens: 50
        };
      } else if (aiProvider === 'Nvidia') {
        endpoint = 'https://api.nvidia.com/v1/chat/completions';
        
        testBody = {
          model: model || 'llama-3-70b',
          messages: [{ role: 'user', content: testMessage }],
          max_tokens: 50
        };
      } else {
        throw new Error('Unsupported AI provider');
      }
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify(testBody)
      });
      
      if (response.ok) {
        const data = await response.json();
        let aiResponse = '';
        
        if (aiProvider === 'Open_AI' || aiProvider === 'Open_AI_Compatible' || aiProvider === 'Nvidia') {
          aiResponse = data.choices?.[0]?.message?.content || '';
        } else if (aiProvider === 'Anthropic') {
          aiResponse = data.content?.[0]?.text || '';
        }
        
        return {
          success: true,
          message: `Connection successful! Response: "${aiResponse.substring(0, 100)}${aiResponse.length > 100 ? '...' : ''}"`
        };
      } else {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error?.message || `API error: ${response.status}`);
      }
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
