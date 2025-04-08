import { create } from 'zustand';
import { Project, ProjectStore, ChatStore, ChatMessage, APISettings } from './types';
import { apiService } from './services/api';

export const useProjectStore = create<ProjectStore>((set, get) => ({
  projects: [],
  activeProject: null,
  apiSettings: {
    apiKey: '',
    apiBaseUrl: 'http://localhost:8000',
    model: 'gpt-4',
  },
  
  loadProjects: async () => {
    try {
      const projects = await apiService.getProjects();
      set({ projects });
      return projects;
    } catch (error) {
      console.error('Failed to load projects:', error);
      return [];
    }
  },
  
  addProject: async (project) => {
    try {
      const newProject = await apiService.createProject(project);
      set((state) => ({
        projects: [...state.projects, newProject],
      }));
      return newProject;
    } catch (error) {
      console.error('Failed to add project:', error);
      throw error;
    }
  },
  
  setActiveProject: (project) => set({ activeProject: project }),
  
  updateProject: async (id, updates) => {
    try {
      const updatedProject = await apiService.updateProject(id, updates);
      set((state) => ({
        projects: state.projects.map((p) => 
          p.id === id ? updatedProject : p
        ),
        activeProject: state.activeProject?.id === id ? updatedProject : state.activeProject
      }));
      return updatedProject;
    } catch (error) {
      console.error('Failed to update project:', error);
      throw error;
    }
  },
  
  initializeProject: async (id) => {
    try {
      await apiService.initializeProject(id);
      const { updateProject } = get();
      await updateProject(id, { initialized: true, progress: 0 });
    } catch (error) {
      console.error('Failed to initialize project:', error);
      throw error;
    }
  },
  
  updateAPISettings: (settings) => {
    set((state) => ({
      apiSettings: { ...state.apiSettings, ...settings }
    }));
    apiService.updateSettings(settings);
  },
  
  addDocument: async (projectId, document, file) => {
    try {
      if (file) {
        await apiService.uploadDocument(projectId, file);
      }
      
      const { updateProject } = get();
      const project = get().projects.find(p => p.id === projectId);
      
      if (project) {
        await updateProject(projectId, { 
          documentation: [...project.documentation, document] 
        });
      }
    } catch (error) {
      console.error('Failed to add document:', error);
      throw error;
    }
  },
  
  removeDocument: async (projectId, document) => {
    try {
      const { updateProject } = get();
      const project = get().projects.find(p => p.id === projectId);
      
      if (project) {
        await updateProject(projectId, { 
          documentation: project.documentation.filter(d => d !== document) 
        });
      }
    } catch (error) {
      console.error('Failed to remove document:', error);
      throw error;
    }
  },
  
  deleteProject: async (id) => {
    try {
      await apiService.deleteProject(id);
      set((state) => ({
        projects: state.projects.filter(p => p.id !== id),
        activeProject: state.activeProject?.id === id ? null : state.activeProject
      }));
    } catch (error) {
      console.error('Failed to delete project:', error);
      throw error;
    }
  }
}));

export const useChatStore = create<ChatStore>((set) => ({
  messages: [],
  
  addMessage: async (message) => {
    const newMessage = {
      ...message,
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
    };
    
    set((state) => ({
      messages: [...state.messages, newMessage],
    }));
    
    if (message.sender === 'user') {
      try {
        const state = set.getState();
        const projectMessages = state.messages.filter(
          m => m.projectId === message.projectId
        );
        
        const response = await apiService.sendChatMessage(
          message.content,
          message.projectId,
          projectMessages
        );
        
        if (response.chat_history.length > 0) {
          const lastMessage = response.chat_history[response.chat_history.length - 1];
          set((state) => ({
            messages: [...state.messages, lastMessage],
          }));
        }
      } catch (error) {
        console.error('Failed to get chat response:', error);
        set((state) => ({
          messages: [...state.messages, {
            id: crypto.randomUUID(),
            content: 'Sorry, I encountered an error processing your request.',
            sender: 'ai',
            timestamp: new Date().toISOString(),
            projectId: message.projectId
          }],
        }));
      }
    }
  },
  
  clearMessages: () => set({ messages: [] }),
}));