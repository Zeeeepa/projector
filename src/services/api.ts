import { Project, ChatMessage, APISettings } from '../types';

// Default API URL - can be overridden in settings
const DEFAULT_API_URL = 'http://localhost:8000';

/**
 * API service for communicating with the backend
 */
export class ApiService {
  private apiBaseUrl: string;
  private apiKey: string | null;

  constructor(settings?: APISettings) {
    this.apiBaseUrl = settings?.apiBaseUrl || DEFAULT_API_URL;
    this.apiKey = settings?.apiKey || null;
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

    return headers;
  }

  /**
   * Helper method to handle API responses
   */
  private async handleResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || `API error: ${response.status}`);
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

    const data = await this.handleResponse<any[]>(response);
    
    // Transform the backend response to match frontend Project type
    return data.map(item => ({
      id: item.id,
      name: item.name,
      description: '',
      githubUrl: item.git_url,
      slackChannel: item.slack_channel || '',
      threads: item.max_parallel_tasks,
      created_at: item.created_at,
      initialized: item.implementation_plan !== null,
      progress: 0, // Calculate progress based on tasks if needed
      documentation: item.documents || [],
    }));
  }

  /**
   * Get a project by ID
   */
  async getProject(id: string): Promise<Project> {
    const response = await fetch(`${this.apiBaseUrl}/api/projects/${id}`, {
      method: 'GET',
      headers: this.getHeaders(),
    });

    const data = await this.handleResponse<any>(response);
    
    // Transform the backend response to match frontend Project type
    return {
      id: data.id,
      name: data.name,
      description: '',
      githubUrl: data.git_url,
      slackChannel: data.slack_channel || '',
      threads: data.max_parallel_tasks,
      created_at: data.created_at,
      initialized: data.implementation_plan !== null,
      progress: 0, // Calculate progress based on tasks if needed
      documentation: data.documents || [],
    };
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
      slackChannel: data.slack_channel || '',
      threads: data.max_parallel_tasks,
      created_at: data.created_at,
      initialized: data.implementation_plan !== null,
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
      slackChannel: data.slack_channel || '',
      threads: data.max_parallel_tasks,
      created_at: data.created_at,
      initialized: data.implementation_plan !== null,
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

    const response = await fetch(`${this.apiBaseUrl}/api/projects/${projectId}/documents`, {
      method: 'POST',
      headers,
      body: formData,
    });

    const data = await this.handleResponse<{ message: string }>(response);
    return data.message;
  }

  /**
   * Send a chat message and get a response
   */
  async sendChatMessage(message: string, projectId?: string, chatHistory?: ChatMessage[]): Promise<{ response: string, chat_history: ChatMessage[] }> {
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