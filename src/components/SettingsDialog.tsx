import React, { useState, useEffect } from 'react';
import { useProjectStore } from '../store';
import { AIProvider, AIConfig } from '../types';
import { apiService } from '../services/api';
import { providerRegistry } from '../providers';
import { PRReviewBotTab } from './PRReviewBotTab';

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
  const [isValidatingGithubToken, setIsValidatingGithubToken] = useState(false);
  const [githubTokenValid, setGithubTokenValid] = useState<boolean | null>(null);
  
  const [configName, setConfigName] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [model, setModel] = useState('');
  const [customModelInput, setCustomModelInput] = useState('');
  const [aiProvider, setAiProvider] = useState<AIProvider>('openai_compatible');
  const [customEndpoint, setCustomEndpoint] = useState('');
  const [editingConfigId, setEditingConfigId] = useState<string | null>(null);
  
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [activeTab, setActiveTab] = useState<'saved_configs' | 'new_config' | 'github' | 'pr_review_bot'>('saved_configs');
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [isLoadingModels, setIsLoadingModels] = useState(false);
  const [providerNames, setProviderNames] = useState<{ type: AIProvider; name: string }[]>([]);
  const [isValidatingKey, setIsValidatingKey] = useState(false);

  useEffect(() => {
    setProviderNames(providerRegistry.getProviderNames());
  }, []);

  useEffect(() => {
    if (activeAIConfigId) {
      const activeConfig = aiConfigs.find(config => config.id === activeAIConfigId);
      if (activeConfig) {
        setEditingConfigId(activeConfig.id);
        setConfigName(activeConfig.name);
        setApiKey(activeConfig.apiKey);
        setModel(activeConfig.model);
        setCustomModelInput(activeConfig.model);
        setAiProvider(activeConfig.aiProvider);
        setCustomEndpoint(activeConfig.customEndpoint || '');
      }
    } else {
      resetConfigForm();
    }
  }, [activeAIConfigId, aiConfigs]);

  useEffect(() => {
    setModel('');
    setCustomModelInput('');
    setAvailableModels([]);
  }, [aiProvider]);

  const resetConfigForm = () => {
    setEditingConfigId(null);
    setConfigName('');
    setApiKey('');
    setModel('');
    setCustomModelInput('');
    setAiProvider('openai_compatible');
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
    
    const modelToSave = aiProvider === 'openai_compatible' ? customModelInput : model;
    
    if (!modelToSave) {
      alert('Please enter a model');
      return;
    }
    
    let endpointToSave = customEndpoint;
    if (needsCustomEndpoint(aiProvider) && !customEndpoint) {
      alert('Custom API endpoint is required for this provider');
      return;
    }
    
    const configData = {
      name: configName,
      apiKey,
      model: modelToSave,
      aiProvider,
      customEndpoint: endpointToSave || undefined,
      isVerified: testResult?.success || false
    };
    
    if (editingConfigId) {
      updateAIConfig(editingConfigId, configData);
    } else {
      addAIConfig(configData);
    }
    
    resetConfigForm();
    setActiveTab('saved_configs');
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
    setCustomModelInput(config.model);
    setAiProvider(config.aiProvider);
    setCustomEndpoint(config.customEndpoint || '');
    
    setTestResult(config.isVerified ? { success: true, message: 'Configuration verified' } : null);
    
    setActiveTab('new_config');
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
      if (aiProvider === 'openai_compatible') {
        setIsLoadingModels(false);
        return;
      }
      
      const models = await apiService.getAvailableModels(
        aiProvider,
        apiKey,
        needsCustomEndpoint(aiProvider) ? customEndpoint : undefined
      );
      
      setAvailableModels(models);
    } catch (err) {
      console.error('Error fetching models:', err);
      setAvailableModels([]);
    } finally {
      setIsLoadingModels(false);
    }
  };

  const needsCustomEndpoint = (provider: AIProvider): boolean => {
    return provider === 'openai_compatible' || provider === 'deepinfra' || provider === 'openrouter';
  };

  const testConnection = async () => {
    if (!apiKey) return;
    
    setIsTesting(true);
    setTestResult(null);
    
    try {
      if (aiProvider === 'openai_compatible') {
        if (!customEndpoint || !customModelInput) {
          setTestResult({
            success: false,
            message: 'API endpoint and model name are required'
          });
          setIsTesting(false);
          return;
        }
        
        console.log(`Testing OpenAI compatible connection with endpoint: ${customEndpoint}, model: ${customModelInput}`);
        
        const result = await apiService.testConnection(
          aiProvider,
          apiKey,
          customModelInput,
          customEndpoint
        );
        
        setTestResult(result);
      } else {
        const result = await apiService.testConnection(
          aiProvider,
          apiKey,
          model,
          needsCustomEndpoint(aiProvider) ? customEndpoint : undefined
        );
        
        setTestResult(result);
        
        if (result.success) {
          fetchModels();
        }
      }
    } catch (error) {
      console.error('Error testing connection:', error);
      setTestResult({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to test connection'
      });
    } finally {
      setIsTesting(false);
    }
  };

  useEffect(() => {
    const validateApiKey = async () => {
      if (!apiKey || isValidatingKey) return;
      
      setIsValidatingKey(true);
      try {
        if (aiProvider === 'openai_compatible') {
          setIsValidatingKey(false);
          return;
        }
        
        const isValid = await apiService.validateApiKey(
          aiProvider,
          apiKey,
          needsCustomEndpoint(aiProvider) ? customEndpoint : undefined
        );
        
        if (isValid) {
          setTestResult({
            success: true,
            message: 'API key is valid'
          });
          
          fetchModels();
        } else {
          setTestResult({
            success: false,
            message: 'API key is invalid'
          });
        }
      } catch (error) {
        console.error('Error validating API key:', error);
        setTestResult({
          success: false,
          message: error instanceof Error ? error.message : 'Failed to validate API key'
        });
      } finally {
        setIsValidatingKey(false);
      }
    };
    
    const timer = setTimeout(() => {
      if (apiKey && (
        aiProvider === 'openai' || 
        aiProvider === 'anthropic' || 
        aiProvider === 'nvidia' ||
        (needsCustomEndpoint(aiProvider) && customEndpoint && aiProvider !== 'openai_compatible')
      )) {
        validateApiKey();
      }
    }, 1000);
    
    return () => clearTimeout(timer);
  }, [apiKey, aiProvider, customEndpoint]);

  useEffect(() => {
    const validateGithubToken = async () => {
      if (!githubToken || isValidatingGithubToken) return;
      
      setIsValidatingGithubToken(true);
      setGithubTokenValid(null);
      
      try {
        const response = await fetch('https://api.github.com/user', {
          headers: {
            'Authorization': `token ${githubToken}`,
            'Accept': 'application/vnd.github+json'
          }
        });
        
        setGithubTokenValid(response.ok);
      } catch (error) {
        console.error('Error validating GitHub token:', error);
        setGithubTokenValid(false);
      } finally {
        setIsValidatingGithubToken(false);
      }
    };
    
    const timer = setTimeout(() => {
      if (githubToken) {
        validateGithubToken();
      }
    }, 1000);
    
    return () => clearTimeout(timer);
  }, [githubToken]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 transition-opacity" aria-hidden="true">
          <div className="absolute inset-0 bg-gray-900 opacity-75"></div>
        </div>

        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

        <form onSubmit={handleSubmit} className="inline-block align-bottom bg-gray-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
          <div className="px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <div className="sm:flex sm:items-start">
              <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                <h3 className="text-lg leading-6 font-medium text-gray-100">
                  Settings
                </h3>
                
                <div className="mt-4 border-b border-gray-700">
                  <nav className="-mb-px flex space-x-4">
                    <button
                      type="button"
                      onClick={() => setActiveTab('saved_configs')}
                      className={`${
                        activeTab === 'saved_configs'
                          ? 'border-indigo-500 text-indigo-400'
                          : 'border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-300'
                      } whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm`}
                    >
                      Saved AI Configurations
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setActiveTab('new_config');
                        if (!editingConfigId) resetConfigForm();
                      }}
                      className={`${
                        activeTab === 'new_config'
                          ? 'border-indigo-500 text-indigo-400'
                          : 'border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-300'
                      } whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm`}
                    >
                      {editingConfigId ? 'Edit Configuration' : 'Add New Configuration'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab('github')}
                      className={`${
                        activeTab === 'github'
                          ? 'border-indigo-500 text-indigo-400'
                          : 'border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-300'
                      } whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm`}
                    >
                      GitHub API
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab('pr_review_bot')}
                      className={`${
                        activeTab === 'pr_review_bot'
                          ? 'border-indigo-500 text-indigo-400'
                          : 'border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-300'
                      } whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm`}
                    >
                      PR Review Bot
                    </button>
                  </nav>
                </div>
                
                {activeTab === 'saved_configs' && (
                  <div className="mt-4">
                    <div className="space-y-4">
                      {aiConfigs.length === 0 ? (
                        <div className="text-center py-6">
                          <p className="text-gray-400">No AI configurations saved yet.</p>
                          <button
                            type="button"
                            onClick={() => setActiveTab('new_config')}
                            className="mt-2 inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-indigo-300 bg-indigo-900 hover:bg-indigo-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                          >
                            Add your first configuration
                          </button>
                        </div>
                      ) : (
                        aiConfigs.map((config) => (
                          <div 
                            key={config.id} 
                            className={`p-4 rounded-md border ${
                              config.id === activeAIConfigId 
                                ? 'border-indigo-500 bg-gray-700' 
                                : 'border-gray-700 bg-gray-800 hover:bg-gray-700'
                            }`}
                          >
                            <div className="flex justify-between items-start">
                              <div>
                                <h4 className="text-gray-100 font-medium">{config.name}</h4>
                                <p className="text-gray-400 text-sm mt-1">
                                  {config.aiProvider} • {config.model}
                                </p>
                                {config.customEndpoint && (
                                  <p className="text-gray-500 text-xs mt-1 truncate max-w-xs">
                                    {config.customEndpoint}
                                  </p>
                                )}
                              </div>
                              <div className="flex space-x-2">
                                <button
                                  type="button"
                                  onClick={() => handleEditConfig(config)}
                                  className="text-gray-400 hover:text-gray-300"
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                    <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                                  </svg>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteConfig(config.id)}
                                  className="text-gray-400 hover:text-red-500"
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 10-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                                  </svg>
                                </button>
                              </div>
                            </div>
                            
                            {config.id !== activeAIConfigId && (
                              <button
                                type="button"
                                onClick={() => handleSetActiveConfig(config.id)}
                                className="mt-3 inline-flex items-center px-3 py-1 border border-transparent text-sm leading-4 font-medium rounded-md text-indigo-300 bg-indigo-900 hover:bg-indigo-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                              >
                                Set as Active
                              </button>
                            )}
                            
                            {config.id === activeAIConfigId && (
                              <span className="mt-3 inline-flex items-center px-3 py-1 border border-transparent text-sm leading-4 font-medium rounded-md text-green-300 bg-green-900">
                                Active Configuration
                              </span>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
                
                {activeTab === 'new_config' && (
                  <>
                    <div className="mt-4">
                      <div className="space-y-4">
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
                            placeholder="My AI Configuration"
                          />
                        </div>
                        
                        <div>
                          <label htmlFor="aiProvider" className="block text-sm font-medium text-gray-300">
                            AI Provider
                          </label>
                          <select
                            id="aiProvider"
                            value={aiProvider}
                            onChange={(e) => setAiProvider(e.target.value as AIProvider)}
                            className="mt-1 block w-full rounded-md bg-gray-800 border-gray-700 text-gray-100 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                          >
                            {providerNames.map((provider) => (
                              <option key={provider.type} value={provider.type}>
                                {provider.name}
                              </option>
                            ))}
                          </select>
                        </div>
                        
                        <div>
                          <label htmlFor="apiKey" className="block text-sm font-medium text-gray-300">
                            API Key
                          </label>
                          <input
                            type="text"
                            id="apiKey"
                            value={apiKey}
                            onChange={(e) => setApiKey(e.target.value)}
                            className="mt-1 block w-full rounded-md bg-gray-800 border-gray-700 text-gray-100 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                            placeholder="Enter your API key"
                          />
                        </div>
                        
                        {aiProvider === 'openai_compatible' && (
                          <div>
                            <label htmlFor="customEndpoint" className="block text-sm font-medium text-gray-300">
                              API Base URL
                            </label>
                            <input
                              type="url"
                              id="customEndpoint"
                              value={customEndpoint}
                              onChange={(e) => setCustomEndpoint(e.target.value)}
                              className="mt-1 block w-full rounded-md bg-gray-800 border-gray-700 text-gray-100 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                              placeholder="http://localhost:8000"
                            />
                            <p className="mt-1 text-xs text-gray-400">
                              Base URL for the API (e.g., http://localhost:8000)
                            </p>
                          </div>
                        )}
                        
                        {needsCustomEndpoint(aiProvider) && aiProvider !== 'openai_compatible' && (
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
                              placeholder="https://your-api-endpoint.com/v1"
                            />
                            <p className="mt-1 text-xs text-gray-400">
                              Base URL for the API (e.g., https://api.example.com/v1)
                            </p>
                          </div>
                        )}
                        
                        {aiProvider === 'openai_compatible' ? (
                          <div>
                            <label htmlFor="customModelInput" className="block text-sm font-medium text-gray-300">
                              Model Name
                            </label>
                            <input
                              type="text"
                              id="customModelInput"
                              value={customModelInput}
                              onChange={(e) => setCustomModelInput(e.target.value)}
                              className="mt-1 block w-full rounded-md bg-gray-800 border-gray-700 text-gray-100 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                              placeholder="Enter model name (e.g., claude-3-opus-20240229)"
                            />
                          </div>
                        ) : (
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
                              {availableModels.map((modelName) => (
                                <option key={modelName} value={modelName}>
                                  {modelName}
                                </option>
                              ))}
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
                        )}
                        
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
                            disabled={isTesting || (!apiKey) || 
                              (needsCustomEndpoint(aiProvider) && aiProvider !== 'openai_compatible' && !customEndpoint) ||
                              (aiProvider === 'openai_compatible' && (!customEndpoint || !customModelInput))}
                          >
                            {isTesting ? 'Testing...' : 'Test Connection'}
                          </button>
                          
                          <button
                            type="button"
                            onClick={handleSaveConfig}
                            className="px-4 py-2 text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 flex-1"
                            disabled={!configName || !apiKey || 
                              (aiProvider !== 'openai_compatible' && !model) ||
                              (aiProvider === 'openai_compatible' && !customModelInput)}
                          >
                            {editingConfigId ? 'Update Configuration' : 'Save Configuration'}
                          </button>
                        </div>
                        
                        {editingConfigId && (
                          <button
                            type="button"
                            onClick={() => {
                              resetConfigForm();
                              setActiveTab('saved_configs');
                            }}
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
                  <div className="mt-4">
                    <div className="mb-4">
                      <h4 className="text-sm font-medium text-gray-300">Backend API URL</h4>
                      <input
                        type="url"
                        value={apiBaseUrl}
                        onChange={(e) => setApiBaseUrl(e.target.value)}
                        className="mt-1 block w-full rounded-md bg-gray-800 border-gray-700 text-gray-100 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                        placeholder="http://localhost:8000"
                      />
                      <p className="mt-1 text-xs text-gray-400">
                        Base URL for the backend API (default: http://localhost:8000)
                      </p>
                    </div>
                    
                    <label htmlFor="githubToken" className="block text-sm font-medium text-gray-300">
                      GitHub Token
                    </label>
                    <input
                      type="text"
                      id="githubToken"
                      value={githubToken}
                      onChange={(e) => setGithubToken(e.target.value)}
                      className="mt-1 block w-full rounded-md bg-gray-800 border-gray-700 text-gray-100 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                      placeholder="Enter your GitHub token"
                    />
                    <div className="mt-2">
                      {isValidatingGithubToken && (
                        <p className="text-blue-400 text-sm">Validating token...</p>
                      )}
                      {!isValidatingGithubToken && githubTokenValid === true && (
                        <p className="text-green-400 text-sm">✓ Token is valid</p>
                      )}
                      {!isValidatingGithubToken && githubTokenValid === false && (
                        <p className="text-red-400 text-sm">✗ Token is invalid or has insufficient permissions</p>
                      )}
                    </div>
                    <p className="mt-1 text-xs text-gray-400">
                      Used for repository access and operations. Create a token with repo scope at 
                      <a href="https://github.com/settings/tokens" target="_blank" rel="noopener noreferrer" className="ml-1 text-blue-400 hover:text-blue-300">
                        GitHub Settings
                      </a>
                    </p>
                  </div>
                )}
                
                {activeTab === 'pr_review_bot' && (
                  <PRReviewBotTab apiBaseUrl={apiBaseUrl} />
                )}
                
                <div className="flex justify-end space-x-3 pt-4 border-t border-gray-700 mt-4">
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
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
