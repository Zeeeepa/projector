import { Project, ChatMessage, APISettings } from '../types';

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
   * Helper method to build request headers
   */
  private getHeaders(): HeadersInit {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    if (this.apiKey) {
      headers['Authorization'] = `Bearer ${this.apiKey}`;
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
   * Generate a project plan based on requirements
   */
  async generateProjectPlan(projectId: string, context: string): Promise<{ success: boolean; error?: string }> {
    try {
      // If using direct AI provider, use that instead of backend
      if (this.aiProvider && this.apiKey) {
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
        
        if (this.aiProvider === 'Open_AI' || this.aiProvider === 'Open_AI_Compatible') {
          const endpoint = this.aiProvider === 'Open_AI' 
            ? 'https://api.openai.com/v1/chat/completions'
            : this.customEndpoint;
            
          if (!endpoint) {
            throw new Error('No API endpoint configured');
          }
          
          response = await fetch(endpoint, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${this.apiKey}`
            },
            body: JSON.stringify({
              model: this.model || 'gpt-3.5-turbo',
              messages: [{ role: 'user', content: prompt }],
              max_tokens: 2000,
              temperature: 0.7
            })
          });
          
          const data = await this.handleResponse<any>(response);
          const planText = data.choices?.[0]?.message?.content;
          
          if (planText) {
            // Store the generated plan in the backend
            await this.savePlanToBackend(projectId, planText);
            return { success: true };
          } else {
            throw new Error('Failed to generate plan: No response from AI');
          }
        } else if (this.aiProvider === 'Anthropic') {
          response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'anthropic-version': '2023-06-01',
              'Authorization': `Bearer ${this.apiKey}`
            },
            body: JSON.stringify({
              model: this.model || 'claude-3-haiku-20240307',
              messages: [{ role: 'user', content: prompt }],
              max_tokens: 2000
            })
          });
          
          const data = await this.handleResponse<any>(response);
          const planText = data.content?.[0]?.text;
          
          if (planText) {
            // Store the generated plan in the backend
            await this.savePlanToBackend(projectId, planText);
            return { success: true };
          } else {
            throw new Error('Failed to generate plan: No response from AI');
          }
        } else {
          throw new Error(`Unsupported AI provider: ${this.aiProvider}`);
        }
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
    // If using OpenAI Compatible endpoint, use that directly
    if (this.customEndpoint) {
      try {
        // Format the chat history for the OpenAI API
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
        
        // Make the request to the custom endpoint
        const response = await fetch(this.customEndpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.apiKey}`
          },
          body: JSON.stringify({
            model: this.model || 'gpt-3.5-turbo',
            messages,
            max_tokens: 1000,
            temperature: 0.7
          })
        });
        
        const data = await this.handleResponse<any>(response);
        
        // Extract the response from the OpenAI API
        const aiResponse = data.choices?.[0]?.message?.content || 'No response from AI';
        
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
        console.error('Error using custom endpoint:', error);
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
}

// Create a singleton instance
export const apiService = new ApiService();
