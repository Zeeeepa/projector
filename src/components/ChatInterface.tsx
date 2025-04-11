import React, { useState, useEffect, useRef } from 'react';
import { useChatStore, useProjectStore } from '../store';
import { apiService } from '../services/api';
import { Project } from '../types';

export function ChatInterface() {
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { messages, addMessage, clearMessages } = useChatStore();
  const { 
    projects, 
    activeProject, 
    setActiveProject, 
    apiSettings, 
    aiConfigs, 
    activeAIConfigId 
  } = useProjectStore();
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(activeProject?.id || null);
  const [selectedAIConfigId, setSelectedAIConfigId] = useState<string | null>(activeAIConfigId);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (activeProject) {
      setSelectedProjectId(activeProject.id);
    }
  }, [activeProject]);

  useEffect(() => {
    setSelectedAIConfigId(activeAIConfigId);
  }, [activeAIConfigId]);

  useEffect(() => {
    clearMessages();
  }, [selectedProjectId, clearMessages]);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const handleProjectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const projectId = e.target.value;
    setSelectedProjectId(projectId);
    
    const project = projects.find(p => p.id === projectId);
    if (project) {
      setActiveProject(project);
    }
  };

  const handleAIConfigChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const configId = e.target.value || null;
    setSelectedAIConfigId(configId);
    
    if (configId) {
      const config = aiConfigs.find(c => c.id === configId);
      if (config) {
        apiService.setActiveConfig(config);
      }
    } else {
      apiService.setActiveConfig(null);
      apiService.updateSettings(apiSettings);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;

    setError(null);

    addMessage({
      content: message,
      sender: 'user',
      projectId: selectedProjectId || undefined,
    });

    setIsLoading(true);

    try {
      if (selectedAIConfigId) {
        const config = aiConfigs.find(c => c.id === selectedAIConfigId);
        if (config) {
          apiService.setActiveConfig(config);
        }
      } else {
        apiService.setActiveConfig(null);
        apiService.updateSettings(apiSettings);
      }

      let contextPrompt = '';
      if (selectedProjectId) {
        const project = projects.find(p => p.id === selectedProjectId);
        if (project) {
          contextPrompt = `[Project Context: ${project.name}]\n\n`;
          
          if (project.description) {
            contextPrompt += `Description: ${project.description}\n\n`;
          }
          
          if (project.githubUrl) {
            contextPrompt += `GitHub URL: ${project.githubUrl}\n\n`;
          }
          
          if (project.documentation && project.documentation.length > 0) {
            contextPrompt += `Project Requirements:\n${project.documentation.join('\n\n')}\n\n`;
          }
          
          if (project.initialized) {
            contextPrompt += `The project has a generated plan. You can modify this plan or the project structure based on user requests.\n\n`;
          }
        }
      }

      try {
        const response = await apiService.sendChatMessage(
          contextPrompt + message,
          selectedProjectId || undefined,
          messages
        );

        addMessage({
          content: response.response,
          sender: 'ai',
          projectId: selectedProjectId || undefined,
        });
      } catch (error) {
        console.error('Error sending message:', error);
        
        const errorMessage = error instanceof Error ? error.message : 'Failed to send message';
        setError(errorMessage);

        addMessage({
          content: `Error: ${errorMessage}`,
          sender: 'ai',
          projectId: selectedProjectId || undefined,
        });
      }
    } catch (error) {
      console.error('Error setting up chat:', error);
      
      const errorMessage = error instanceof Error ? error.message : 'Failed to set up chat';
      setError(errorMessage);

      addMessage({
        content: `Error: ${errorMessage}`,
        sender: 'ai',
        projectId: selectedProjectId || undefined,
      });
    } finally {
      setIsLoading(false);
      setMessage('');
    }
  };

  const filteredMessages = selectedProjectId 
    ? messages.filter(msg => !msg.projectId || msg.projectId === selectedProjectId)
    : messages;

  return (
    <div className="flex flex-col h-96 bg-gray-900 rounded-lg shadow-lg">
      <div className="p-4 border-b border-gray-700 flex justify-between items-center">
        <h3 className="text-lg font-medium text-gray-100">Chat Interface</h3>
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <label htmlFor="aiConfigSelect" className="text-sm text-gray-300">
              AI Config:
            </label>
            <select
              id="aiConfigSelect"
              value={selectedAIConfigId || ''}
              onChange={handleAIConfigChange}
              className="bg-gray-800 border border-gray-700 text-gray-100 text-sm rounded-md focus:ring-blue-500 focus:border-blue-500 p-1.5"
            >
              <option value="">Global Settings</option>
              {aiConfigs.map((config) => (
                <option key={config.id} value={config.id}>
                  {config.name} {config.isVerified ? '✓' : ''}
                </option>
              ))}
            </select>
          </div>
          
          <div className="flex items-center space-x-2">
            <label htmlFor="projectSelect" className="text-sm text-gray-300">
              Project:
            </label>
            <select
              id="projectSelect"
              value={selectedProjectId || ''}
              onChange={handleProjectChange}
              className="bg-gray-800 border border-gray-700 text-gray-100 text-sm rounded-md focus:ring-blue-500 focus:border-blue-500 p-1.5"
            >
              <option value="">Global Chat</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>
      
      {error && (
        <div className="bg-red-900 text-red-100 p-2 text-sm">
          Error: {error}
        </div>
      )}
      
      <div className="flex-1 p-4 overflow-y-auto bg-gray-900">
        <div className="space-y-4">
          {filteredMessages.length === 0 && (
            <div className="text-center text-gray-500 py-4">
              <p>No messages yet. Start a conversation!</p>
              {selectedProjectId && (
                <p className="mt-2 text-xs text-gray-400">
                  Chatting about project: {projects.find(p => p.id === selectedProjectId)?.name}
                </p>
              )}
              {selectedAIConfigId && (
                <p className="mt-2 text-xs text-gray-400">
                  Using AI config: {aiConfigs.find(c => c.id === selectedAIConfigId)?.name}
                </p>
              )}
            </div>
          )}
          {filteredMessages.map((msg) => (
            <div key={msg.id} className={`flex items-start ${msg.sender === 'user' ? 'justify-end' : ''}`}>
              {msg.sender === 'ai' && (
                <div className="flex-shrink-0">
                  <div className="h-8 w-8 rounded-full bg-indigo-600 flex items-center justify-center">
                    <span className="text-sm font-medium text-gray-100">AI</span>
                  </div>
                </div>
              )}
              <div 
                className={`mx-2 rounded-lg p-3 max-w-3xl ${
                  msg.sender === 'ai' 
                    ? 'bg-gray-800 border border-gray-700 text-gray-200' 
                    : 'bg-blue-600 text-white'
                }`}
              >
                <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
              </div>
              {msg.sender === 'user' && (
                <div className="flex-shrink-0">
                  <div className="h-8 w-8 rounded-full bg-gray-700 flex items-center justify-center">
                    <span className="text-sm font-medium text-gray-100">You</span>
                  </div>
                </div>
              )}
            </div>
          ))}
          {isLoading && (
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <div className="h-8 w-8 rounded-full bg-indigo-600 flex items-center justify-center">
                  <span className="text-sm font-medium text-gray-100">AI</span>
                </div>
              </div>
              <div className="ml-3 bg-gray-800 border border-gray-700 rounded-lg p-3">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse"></div>
                  <div className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse delay-100"></div>
                  <div className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse delay-200"></div>
                  <span className="text-sm text-gray-400">Thinking...</span>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>
      <form onSubmit={handleSubmit} className="p-4 border-t border-gray-700">
        <div className="flex space-x-3">
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Type your message..."
            className="flex-1 rounded-md bg-gray-800 border-gray-700 text-gray-100 px-4 py-2 text-sm focus:ring-blue-500 focus:border-blue-500"
            disabled={isLoading}
          />
          <button
            type="submit"
            className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white ${
              isLoading ? 'bg-indigo-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700'
            }`}
            disabled={isLoading}
          >
            {isLoading ? 'Sending...' : 'Send'}
          </button>
        </div>
      </form>
    </div>
  );
}
