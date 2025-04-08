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
  documentation: string[];
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
  loadProjects: () => Promise<Project[]>;
  addProject: (project: Omit<Project, 'id' | 'created_at' | 'initialized' | 'progress' | 'documentation'>) => Promise<Project>;
  setActiveProject: (project: Project) => void;
  updateProject: (id: string, updates: Partial<Project>) => Promise<Project>;
  initializeProject: (id: string) => Promise<void>;
  updateAPISettings: (settings: Partial<APISettings>) => void;
  addDocument: (projectId: string, document: string, file?: File) => Promise<void>;
  removeDocument: (projectId: string, document: string) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;
}

export interface ChatStore {
  messages: ChatMessage[];
  addMessage: (message: Omit<ChatMessage, 'id' | 'timestamp'>) => Promise<void>;
  clearMessages: () => void;
}

export interface APISettings {
  apiKey: string;
  apiBaseUrl: string;
  model: string;
}