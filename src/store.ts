import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Project, ProjectStore, ChatStore, ChatMessage, APISettings, AIConfig, SlackConfig } from './types';

export const useProjectStore = create<ProjectStore>()(
  persist(
    (set) => ({
      projects: [],
      activeProject: null,
      apiSettings: {
        apiKey: '',
        apiBaseUrl: '',
        model: 'gpt-4',
        githubToken: '',
        aiProvider: 'openai',
        customEndpoint: '',
      },
      aiConfigs: [],
      activeAIConfigId: null,
      slackConfigs: [],
      activeSlackConfigId: null,
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
        activeProject: state.activeProject?.id === id ? { ...state.activeProject, ...updates } : state.activeProject
      })),
      initializeProject: (id) => set((state) => ({
        projects: state.projects.map((p) => 
          p.id === id ? { ...p, initialized: true, progress: 0 } : p
        ),
      })),
      updateAPISettings: (settings) => set((state) => ({
        apiSettings: { ...state.apiSettings, ...settings }
      })),
      addAIConfig: (config) => set((state) => {
        const newConfig: AIConfig = {
          ...config,
          id: crypto.randomUUID(),
        };
        return {
          aiConfigs: [...state.aiConfigs, newConfig],
          activeAIConfigId: state.aiConfigs.length === 0 ? newConfig.id : state.activeAIConfigId
        };
      }),
      updateAIConfig: (id, updates) => set((state) => ({
        aiConfigs: state.aiConfigs.map((config) => 
          config.id === id ? { ...config, ...updates } : config
        )
      })),
      deleteAIConfig: (id) => set((state) => {
        const newConfigs = state.aiConfigs.filter((config) => config.id !== id);
        return {
          aiConfigs: newConfigs,
          activeAIConfigId: state.activeAIConfigId === id 
            ? (newConfigs.length > 0 ? newConfigs[0].id : null) 
            : state.activeAIConfigId
        };
      }),
      setActiveAIConfig: (id) => set({ activeAIConfigId: id }),
      addSlackConfig: (config) => set((state) => {
        const newConfig: SlackConfig = {
          ...config,
          id: crypto.randomUUID(),
        };
        return {
          slackConfigs: [...state.slackConfigs, newConfig],
          activeSlackConfigId: state.slackConfigs.length === 0 ? newConfig.id : state.activeSlackConfigId
        };
      }),
      updateSlackConfig: (id, updates) => set((state) => ({
        slackConfigs: state.slackConfigs.map((config) => 
          config.id === id ? { ...config, ...updates } : config
        )
      })),
      deleteSlackConfig: (id) => set((state) => {
        const newConfigs = state.slackConfigs.filter((config) => config.id !== id);
        return {
          slackConfigs: newConfigs,
          activeSlackConfigId: state.activeSlackConfigId === id 
            ? (newConfigs.length > 0 ? newConfigs[0].id : null) 
            : state.activeSlackConfigId
        };
      }),
      setActiveSlackConfig: (id) => set({ activeSlackConfigId: id }),
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
    }),
    {
      name: 'projector-storage',
    }
  )
);

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
