import { create } from 'zustand';
import { Project, ProjectStore, ChatStore, ChatMessage, APISettings } from './types';

export const useProjectStore = create<ProjectStore>((set) => ({
  projects: [],
  activeProject: null,
  apiSettings: {
    apiKey: '',
    apiBaseUrl: '',
    model: 'gpt-4',
  },
  addProject: (project) => set((state) => ({
    projects: [...state.projects, {
      ...project,
      id: crypto.randomUUID(),
      created_at: new Date().toISOString(),
      initialized: false,
      progress: 0,
      documentation: [],
    }],
  })),
  setActiveProject: (project) => set({ activeProject: project }),
  updateProject: (id, updates) => set((state) => ({
    projects: state.projects.map((p) => 
      p.id === id ? { ...p, ...updates } : p
    ),
  })),
  initializeProject: (id) => set((state) => ({
    projects: state.projects.map((p) => 
      p.id === id ? { ...p, initialized: true, progress: 0 } : p
    ),
  })),
  updateAPISettings: (settings) => set((state) => ({
    apiSettings: { ...state.apiSettings, ...settings }
  })),
  addDocument: (projectId, document) => set((state) => ({
    projects: state.projects.map((p) => 
      p.id === projectId 
        ? { ...p, documentation: [...p.documentation, document] }
        : p
    ),
  })),
  removeDocument: (projectId, document) => set((state) => ({
    projects: state.projects.map((p) => 
      p.id === projectId 
        ? { ...p, documentation: p.documentation.filter(d => d !== document) }
        : p
    ),
  })),
}));

export const useChatStore = create<ChatStore>((set) => ({
  messages: [],
  addMessage: (message) => set((state) => ({
    messages: [...state.messages, {
      ...message,
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
    }],
  })),
  clearMessages: () => set({ messages: [] }),
}));