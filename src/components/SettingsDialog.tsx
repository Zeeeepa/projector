import React, { useState, useEffect } from 'react';
import { useProjectStore } from '../store';
import { AIProvider, AIConfig } from '../types';
import { apiService } from '../services/api';

interface SettingsDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SettingsDialog({ isOpen, onClose }: SettingsDialogProps) {
  const { 
    apiSettings, 
    updateAPISettings, 
    aiConfigs, 
    addAIConfig, 
    updateAIConfig, 
    deleteAIConfig, 
    activeAIConfigId, 
    setActiveAIConfig 
  } = useProjectStore();
  
  const [apiBaseUrl, setApiBaseUrl] = useState(apiSettings.apiBaseUrl);
  const [githubToken, setGithubToken] = useState(apiSettings.githubToken);
  
  const [configName, setConfigName] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [model, setModel] = useState('');
  const [aiProvider, setAiProvider] = useState<AIProvider>('Open_AI');
  const [customEndpoint, setCustomEndpoint] = useState('');
  const [editingConfigId, setEditingConfigId] = useState<string | null>(null);
  
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [testMessage, setTestMessage] = useState('Hello, can you hear me?');
  const [activeTab, setActiveTab] = useState<'ai' | 'github'>('ai');
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [isLoadingModels, setIsLoadingModels] = useState(false);

  useEffect(() => {
    if (activeAIConfigId) {
      const activeConfig = aiConfigs.find(config => config.id === activeAIConfigId);
      if (activeConfig) {
        setEditingConfigId(activeConfig.id);
        setConfigName(activeConfig.name);
        setApiKey(activeConfig.apiKey);
        setModel(activeConfig.model);
        setAiProvider(activeConfig.aiProvider);
        setCustomEndpoint(activeConfig.customEndpoint || '');
      }
    } else {
      resetConfigForm();
    }
  }, [activeAIConfigId, aiConfigs]);

  const resetConfigForm = () => {
    setEditingConfigId(null);
    setConfigName('');
    setApiKey('');
    setModel('');
    setAiProvider('Open_AI');
    setCustomEndpoint('');
    setTestResult(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    updateAPISettings({
      apiBaseUrl,
      githubToken
    });
    
    onClose();
  };

  const handleSaveConfig = () => {
    if (!configName || !apiKey) {
      alert('Configuration name and API key are required');
      return;
    }
    
    const configData = {
      name: configName,
      apiKey,
      model,
      aiProvider,
      customEndpoint: customEndpoint || undefined,
      isVerified: testResult?.success || false
    };
    
    if (editingConfigId) {
      updateAIConfig(editingConfigId, configData);
    } else {
      addAIConfig(configData);
    }
    
    resetConfigForm();
  };

  const handleDeleteConfig = (id: string) => {
    if (window.confirm('Are you sure you want to delete this configuration?')) {
      deleteAIConfig(id);
    }
  };

  const handleEditConfig = (config: AIConfig) => {
    setEditingConfigId(config.id);
    setConfigName(config.name);
    setApiKey(config.apiKey);
    setModel(config.model);
    setAiProvider(config.aiProvider);
    setCustomEndpoint(config.customEndpoint || '');
    setTestResult(config.isVerified ? { success: true, message: 'Configuration verified' } : null);
  };

  const handleSetActiveConfig = (id: string) => {
    setActiveAIConfig(id);
    
    const config = aiConfigs.find(c => c.id === id);
    if (config) {
      apiService.setActiveConfig(config);
    }
  };

  const fetchModels = async () => {
    setIsLoadingModels(true);
    setAvailableModels([]);
    
    try {
      let endpoint = '';
      let headers: HeadersInit = {
        'Content-Type': 'application/json'
      };
      
      if (apiKey) {
        headers['Authorization'] = `Bearer ${apiKey}`;
      }
      
      if (aiProvider === 'Open_AI') {
        endpoint = 'https://api.openai.com/v1/models';
      } else if (aiProvider === 'Open_AI_Compatible' && customEndpoint) {
        const baseUrl = new URL(customEndpoint);
        endpoint = `${baseUrl.protocol}//${baseUrl.host}/v1/models`;
      } else if (aiProvider === 'Anthropic') {
        setAvailableModels(['claude-3-opus-20240229', 'claude-3-sonnet-20240229', 'claude-3-haiku-20240307']);
        setIsLoadingModels(false);
        return;
      } else if (aiProvider === 'Nvidia') {
        setAvailableModels(['llama-3-70b', 'mixtral-8x7b']);
        setIsLoadingModels(false);
        return;
      }
      
      if (!endpoint) {
        throw new Error('Cannot determine models endpoint');
      }
      
      const response = await fetch(endpoint, {
        method: 'GET',
        headers
      });
      
      if (response.ok) {
        const data = await response.json();
        
        if (aiProvider === 'Open_AI' || aiProvider === 'Open_AI_Compatible') {
          const chatModels = data.data
            .filter((model: any) => model.id.includes('gpt') || model.id.includes('llama') || model.id.includes('mistral'))
            .map((model: any) => model.id);
          
          setAvailableModels(chatModels);
        }
      } else {
        if (aiProvider === 'Open_AI') {
          setAvailableModels(['gpt-4', 'gpt-4-turbo', 'gpt-3.5-turbo']);
        } else if (aiProvider === 'Open_AI_Compatible') {
          setAvailableModels(['llama-3-8b', 'llama-3-70b', 'mistral-7b', 'mixtral-8x7b']);
        }
      }
    } catch (err) {
      console.error('Error fetching models:', err);
      if (aiProvider === 'Open_AI') {
        setAvailableModels(['gpt-4', 'gpt-4-turbo', 'gpt-3.5-turbo']);
      } else if (aiProvider === 'Open_AI_Compatible') {
        setAvailableModels(['llama-3-8b', 'llama-3-70b', 'mistral-7b', 'mixtral-8x7b']);
      } else if (aiProvider === 'Anthropic') {
        setAvailableModels(['claude-3-opus-20240229', 'claude-3-sonnet-20240229', 'claude-3-haiku-20240307']);
      } else if (aiProvider === 'Nvidia') {
        setAvailableModels(['llama-3-70b', 'mixtral-8x7b']);
      }
    } finally {
      setIsLoadingModels(false);
    }
  };

  useEffect(() => {
    if (apiKey && (aiProvider === 'Open_AI' || (aiProvider === 'Open_AI_Compatible' && customEndpoint))) {
      fetchModels();
    }
  }, [aiProvider, apiKey, customEndpoint]);

  const testConnection = async () => {
    setIsTesting(true);
    setTestResult(null);
    
    try {
      const result = await apiService.testAIConfig({
        apiKey,
        model,
        aiProvider,
        customEndpoint,
        name: configName
      }, testMessage);
      
      setTestResult(result);
      
      if (editingConfigId && result.success) {
        updateAIConfig(editingConfigId, { isVerified: true });
      }
    } catch (err) {
      console.error('Error testing connection:', err);
      setTestResult({
        success: false,
        message: err instanceof Error ? err.message : 'Failed to connect to API'
      });
    } finally {
      setIsTesting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-900 rounded-lg shadow-xl w-full max-w-4xl p-6 border border-gray-700 max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-semibold text-gray-100 mb-4">Settings</h2>
        
        <div className="mb-4 flex border-b border-gray-700">
          <button
            className={`px-4 py-2 font-medium ${activeTab === 'ai' ? 'text-blue-400 border-b-2 border-blue-500' : 'text-gray-400 hover:text-gray-200'}`}
            onClick={() => setActiveTab('ai')}
          >
            AI Settings
          </button>
          <button
            className={`px-4 py-2 font-medium ${activeTab === 'github' ? 'text-blue-400 border-b-2 border-blue-500' : 'text-gray-400 hover:text-gray-200'}`}
            onClick={() => setActiveTab('github')}
          >
            GitHub Settings
          </button>
        </div>
        
        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            {activeTab === 'ai' && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium text-gray-200">Saved Configurations</h3>
                    
                    {aiConfigs.length === 0 ? (
                      <div className="text-gray-400 text-sm p-4 border border-gray-700 rounded-md">
                        No AI configurations saved yet. Create one using the form.
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {aiConfigs.map((config) => (
                          <div 
                            key={config.id} 
                            className={`p-3 border rounded-md flex justify-between items-center ${
                              activeAIConfigId === config.id 
                                ? 'bg-blue-900 border-blue-700' 
                                : 'bg-gray-800 border-gray-700'
                            }`}
                          >
                            <div className="flex-1">
                              <div className="flex items-center">
                                <span className="font-medium text-gray-200">{config.name}</span>
                                {config.isVerified && (
                                  <span className="ml-2 text-green-400 text-xs bg-green-900 px-2 py-0.5 rounded-full">
                                    Verified
                                  </span>
                                )}
                                {activeAIConfigId === config.id && (
                                  <span className="ml-2 text-blue-400 text-xs bg-blue-900 px-2 py-0.5 rounded-full">
                                    Active
                                  </span>
                                )}
                              </div>
                              <div className="text-xs text-gray-400 mt-1">
                                {config.aiProvider} • {config.model}
                              </div>
                            </div>
                            <div className="flex space-x-2">
                              <button
                                type="button"
                                onClick={() => handleSetActiveConfig(config.id)}
                                className={`text-xs px-2 py-1 rounded ${
                                  activeAIConfigId === config.id
                                    ? 'bg-blue-700 text-blue-100 cursor-default'
                                    : 'bg-blue-600 text-blue-100 hover:bg-blue-500'
                                }`}
                                disabled={activeAIConfigId === config.id}
                              >
                                {activeAIConfigId === config.id ? 'Active' : 'Use'}
                              </button>
                              <button
                                type="button"
                                onClick={() => handleEditConfig(config)}
                                className="text-xs px-2 py-1 bg-gray-600 text-gray-100 rounded hover:bg-gray-500"
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteConfig(config.id)}
                                className="text-xs px-2 py-1 bg-red-600 text-red-100 rounded hover:bg-red-500"
                              >
                                Delete
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    
                    <div>
                      <label htmlFor="apiBaseUrl" className="block text-sm font-medium text-gray-300">
                        Backend API URL
                      </label>
                      <input
                        type="url"
                        id="apiBaseUrl"
                        value={apiBaseUrl}
                        onChange={(e) => setApiBaseUrl(e.target.value)}
                        className="mt-1 block w-full rounded-md bg-gray-800 border-gray-700 text-gray-100 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                        placeholder="http://localhost:8000"
                      />
                      <p className="mt-1 text-xs text-gray-400">
                        URL for the Projector backend API
                      </p>
                    </div>
                  </div>
                  
                  <div className="space-y-4 border-l border-gray-700 pl-6">
                    <h3 className="text-lg font-medium text-gray-200">
                      {editingConfigId ? 'Edit Configuration' : 'New Configuration'}
                    </h3>
                    
                    <div>
                      <label htmlFor="configName" className="block text-sm font-medium text-gray-300">
                        Configuration Name
                      </label>
                      <input
                        type="text"
                        id="configName"
                        value={configName}
                        onChange={(e) => setConfigName(e.target.value)}
                        className="mt-1 block w-full rounded-md bg-gray-800 border-gray-700 text-gray-100 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                        placeholder="My OpenAI Config"
                      />
                    </div>
                    
                    <div>
                      <label htmlFor="aiProvider" className="block text-sm font-medium text-gray-300">
                        AI Provider
                      </label>
                      <select
                        id="aiProvider"
                        value={aiProvider}
                        onChange={(e) => {
                          setAiProvider(e.target.value as AIProvider);
                          if (e.target.value === 'Open_AI') {
                            setModel('gpt-3.5-turbo');
                          } else if (e.target.value === 'Anthropic') {
                            setModel('claude-3-haiku-20240307');
                          } else if (e.target.value === 'Nvidia') {
                            setModel('llama-3-70b');
                          } else {
                            setModel('');
                          }
                        }}
                        className="mt-1 block w-full rounded-md bg-gray-800 border-gray-700 text-gray-100 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                      >
                        <option value="Open_AI">OpenAI</option>
                        <option value="Anthropic">Anthropic</option>
                        <option value="Open_AI_Compatible">OpenAI Compatible</option>
                        <option value="Nvidia">Nvidia</option>
                      </select>
                    </div>
                    
                    <div>
                      <label htmlFor="apiKey" className="block text-sm font-medium text-gray-300">
                        API Key
                      </label>
                      <input
                        type="password"
                        id="apiKey"
                        value={apiKey}
                        onChange={(e) => setApiKey(e.target.value)}
                        className="mt-1 block w-full rounded-md bg-gray-800 border-gray-700 text-gray-100 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                        placeholder="Enter your API key"
                      />
                    </div>
                    
                    {aiProvider === 'Open_AI_Compatible' && (
                      <div>
                        <label htmlFor="customEndpoint" className="block text-sm font-medium text-gray-300">
                          Custom API Endpoint
                        </label>
                        <input
                          type="url"
                          id="customEndpoint"
                          value={customEndpoint}
                          onChange={(e) => setCustomEndpoint(e.target.value)}
                          className="mt-1 block w-full rounded-md bg-gray-800 border-gray-700 text-gray-100 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                          placeholder="https://your-api-endpoint.com/v1/chat/completions"
                        />
                        <p className="mt-1 text-xs text-gray-400">
                          Full URL to the chat completions endpoint (e.g., https://api.example.com/v1/chat/completions)
                        </p>
                      </div>
                    )}
                    
                    <div>
                      <label htmlFor="model" className="block text-sm font-medium text-gray-300 flex justify-between">
                        <span>AI Model</span>
                        {isLoadingModels && <span className="text-blue-400 text-xs">Loading models...</span>}
                      </label>
                      <select
                        id="model"
                        value={model}
                        onChange={(e) => setModel(e.target.value)}
                        className="mt-1 block w-full rounded-md bg-gray-800 border-gray-700 text-gray-100 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                      >
                        <option value="">Select a model</option>
                        {availableModels.length > 0 ? (
                          availableModels.map((modelName) => (
                            <option key={modelName} value={modelName}>
                              {modelName}
                            </option>
                          ))
                        ) : (
                          <>
                            {aiProvider === 'Open_AI' && (
                              <>
                                <option value="gpt-4">GPT-4</option>
                                <option value="gpt-4-turbo">GPT-4 Turbo</option>
                                <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
                              </>
                            )}
                            {aiProvider === 'Anthropic' && (
                              <>
                                <option value="claude-3-opus-20240229">Claude 3 Opus</option>
                                <option value="claude-3-sonnet-20240229">Claude 3 Sonnet</option>
                                <option value="claude-3-haiku-20240307">Claude 3 Haiku</option>
                              </>
                            )}
                            {aiProvider === 'Nvidia' && (
                              <>
                                <option value="llama-3-70b">Llama 3 70B</option>
                                <option value="mixtral-8x7b">Mixtral 8x7B</option>
                              </>
                            )}
                            {aiProvider === 'Open_AI_Compatible' && (
                              <>
                                <option value="llama-3-8b">Llama 3 8B</option>
                                <option value="llama-3-70b">Llama 3 70B</option>
                                <option value="mistral-7b">Mistral 7B</option>
                                <option value="mixtral-8x7b">Mixtral 8x7B</option>
                              </>
                            )}
                          </>
                        )}
                      </select>
                      {availableModels.length === 0 && !isLoadingModels && apiKey && (
                        <button
                          type="button"
                          onClick={fetchModels}
                          className="mt-1 text-xs text-blue-400 hover:text-blue-300"
                        >
                          Fetch available models
                        </button>
                      )}
                    </div>
                    
                    <div>
                      <label htmlFor="testMessage" className="block text-sm font-medium text-gray-300">
                        Test Message
                      </label>
                      <input
                        type="text"
                        id="testMessage"
                        value={testMessage}
                        onChange={(e) => setTestMessage(e.target.value)}
                        className="mt-1 block w-full rounded-md bg-gray-800 border-gray-700 text-gray-100 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                        placeholder="Enter a test message for the API"
                      />
                      <p className="mt-1 text-xs text-gray-400">
                        This message will be sent to test the API connection
                      </p>
                    </div>
                    
                    {testResult && (
                      <div className={`p-3 rounded-md ${testResult.success ? 'bg-green-900 text-green-100' : 'bg-red-900 text-red-100'}`}>
                        {testResult.message}
                      </div>
                    )}
                    
                    <div className="flex space-x-3">
                      <button
                        type="button"
                        onClick={testConnection}
                        className={`px-4 py-2 text-sm font-medium rounded-md shadow-sm text-white flex-1 ${
                          isTesting ? 'bg-gray-600 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
                        }`}
                        disabled={isTesting || (!apiKey) || (aiProvider === 'Open_AI_Compatible' && !customEndpoint)}
                      >
                        {isTesting ? 'Testing...' : 'Test Connection'}
                      </button>
                      
                      <button
                        type="button"
                        onClick={handleSaveConfig}
                        className="px-4 py-2 text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 flex-1"
                        disabled={!configName || !apiKey || !model}
                      >
                        {editingConfigId ? 'Update Configuration' : 'Save Configuration'}
                      </button>
                    </div>
                    
                    {editingConfigId && (
                      <button
                        type="button"
                        onClick={resetConfigForm}
                        className="w-full px-4 py-2 text-sm font-medium text-gray-300 hover:text-white"
                      >
                        Cancel Editing
                      </button>
                    )}
                  </div>
                </div>
              </>
            )}
            
            {activeTab === 'github' && (
              <div>
                <label htmlFor="githubToken" className="block text-sm font-medium text-gray-300">
                  GitHub Token
                </label>
                <input
                  type="password"
                  id="githubToken"
                  value={githubToken}
                  onChange={(e) => setGithubToken(e.target.value)}
                  className="mt-1 block w-full rounded-md bg-gray-800 border-gray-700 text-gray-100 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  placeholder="Enter your GitHub token"
                />
                <p className="mt-1 text-xs text-gray-400">
                  Used for repository access and operations. Create a token with repo scope at 
                  <a href="https://github.com/settings/tokens" target="_blank" rel="noopener noreferrer" className="ml-1 text-blue-400 hover:text-blue-300">
                    GitHub Settings
                  </a>
                </p>
              </div>
            )}
            
            <div className="flex justify-end space-x-3 pt-4 border-t border-gray-700">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-300 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700"
              >
                Save Settings
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
