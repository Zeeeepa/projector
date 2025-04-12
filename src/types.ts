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

export interface AIConfig {
  id: string;
  name: string;
  apiKey: string;
  model: string;
  aiProvider: AIProvider;
  customEndpoint?: string;
  isVerified?: boolean;
  apiBaseUrl?: string;
}

export interface SlackConfig {
  id: string;
  name: string;
  token: string;
  defaultChannel: string;
  sendAsUser: boolean;
  isVerified?: boolean;
}

export interface PRReviewBotConfig {
  id: string;
  name: string;
  githubToken: string;
  webhook_secret: string;
  auto_review: boolean;
  monitor_branches: boolean;
  setup_all_repos_webhooks: boolean;
  validate_documentation: boolean;
  documentation_files: string[];
  anthropic_api_key?: string;
  openai_api_key?: string;
  slack_bot_token?: string;
  slack_channel?: string;
  isVerified?: boolean;
  instructions?: string;
}

export interface PRStatus {
  repo: string;
  number: number;
  title: string;
  status: string;
  url: string;
  type?: 'pr' | 'branch';
  created_at?: string;
}

export interface ProjectStore {
  projects: Project[];
  activeProject: Project | null;
  apiSettings: APISettings;
  aiConfigs: AIConfig[];
  activeAIConfigId: string | null;
  slackConfigs: SlackConfig[];
  activeSlackConfigId: string | null;
  prReviewBotConfigs: PRReviewBotConfig[];
  activePRReviewBotConfigId: string | null;
  addProject: (project: Omit<Project, 'id' | 'created_at' | 'initialized' | 'progress' | 'documentation'>) => void;
  setActiveProject: (project: Project) => void;
  updateProject: (id: string, updates: Partial<Project>) => void;
  updateAIConfig: (id: string, updates: Partial<AIConfig>) => void;
  deleteAIConfig: (id: string) => void;
  setActiveAIConfig: (id: string | null) => void;
  addSlackConfig: (config: Omit<SlackConfig, 'id'>) => void;
  updateSlackConfig: (id: string, updates: Partial<SlackConfig>) => void;
  deleteSlackConfig: (id: string) => void;
  setActiveSlackConfig: (id: string | null) => void;
  addPRReviewBotConfig: (config: Omit<PRReviewBotConfig, 'id'>) => void;
  updatePRReviewBotConfig: (id: string, updates: Partial<PRReviewBotConfig>) => void;
  deletePRReviewBotConfig: (id: string) => void;
  setActivePRReviewBotConfig: (id: string | null) => void;
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

/**
 * Supported AI providers
 * - openai: OpenAI API (GPT models)
 * - anthropic: Anthropic API (Claude models)
 * - nvidia: Nvidia API
 * - openai_compatible: OpenAI-compatible APIs
 * - deepinfra: DeepInfra API
 * - openrouter: OpenRouter API
 */
export type AIProvider = 'openai' | 'anthropic' | 'openai_compatible' | 'nvidia' | 'deepinfra' | 'openrouter';
