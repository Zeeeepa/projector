export interface Project {
  id: string;
  name: string;
  description: string;
  githubUrl: string;
  slackChannel: string;
  threads: number;
  created_at: string;
  initialized: boolean;
  progress: number;
  documentation: string[];  // Changed to array of documents
}

export interface ChatMessage {
  id: string;
  content: string;
  sender: 'user' | 'ai';
  projectId?: string;
  timestamp: string;
}

export interface ProjectStore {
  projects: Project[];
  activeProject: Project | null;
  apiSettings: APISettings;
  addProject: (project: Omit<Project, 'id' | 'created_at' | 'initialized' | 'progress' | 'documentation'>) => void;
  setActiveProject: (project: Project) => void;
  updateProject: (id: string, updates: Partial<Project>) => void;
  initializeProject: (id: string) => void;
  updateAPISettings: (settings: Partial<APISettings>) => void;
  addDocument: (projectId: string, document: string) => void;
  removeDocument: (projectId: string, document: string) => void;
}

export interface ChatStore {
  messages: ChatMessage[];
  addMessage: (message: Omit<ChatMessage, 'id' | 'timestamp'>) => void;
  clearMessages: () => void;
}

export interface APISettings {
  apiKey: string;
  apiBaseUrl: string;
  model: string;
  githubToken: string;
  aiProvider: AIProvider;
  customEndpoint?: string;
}

export type AIProvider = 'Open_AI' | 'Anthropic' | 'Open_AI_Compatible' | 'Nvidia';
