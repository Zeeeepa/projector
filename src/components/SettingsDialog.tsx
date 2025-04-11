import React, { useState, useEffect } from 'react';
import { useProjectStore } from '../store';
import { AIProvider, AIConfig } from '../types';
import { apiService } from '../services/api';
import { providerRegistry } from '../providers';

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
  const [baseApiEndpoint, setBaseApiEndpoint] = useState('');
  const [apiBaseUrlInput, setApiBaseUrlInput] = useState('');
  const [editingConfigId, setEditingConfigId] = useState<string | null>(null);
  
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [activeTab, setActiveTab] = useState<'saved_configs' | 'new_config' | 'github'>('saved_configs');
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
        setApiBaseUrlInput(activeConfig.apiBaseUrl || '');
        
        if (activeConfig.customEndpoint) {
          const endpointParts = activeConfig.customEndpoint.split('/v1');
          if (endpointParts.length > 1) {
            setBaseApiEndpoint(endpointParts[0]);
          } else {
            setBaseApiEndpoint(activeConfig.customEndpoint);
          }
        }
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
    setBaseApiEndpoint('');
    setApiBaseUrlInput('');
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
    if (aiProvider === 'openai_compatible' && baseApiEndpoint) {
      endpointToSave = baseApiEndpoint;
    } else if (needsCustomEndpoint(aiProvider) && !customEndpoint) {
      alert('Custom API endpoint is required for this provider');
      return;
    }
    
    const configData = {
      name: configName,
      apiKey,
      model: modelToSave,
      aiProvider,
      customEndpoint: endpointToSave || undefined,
      isVerified: testResult?.success || false,
      apiBaseUrl: aiProvider === 'openai_compatible' ? baseApiEndpoint : undefined
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
    setApiBaseUrlInput(config.apiBaseUrl || '');
    
    if (config.customEndpoint) {
      const endpointParts = config.customEndpoint.split('/v1');
      if (endpointParts.length > 1) {
        setBaseApiEndpoint(endpointParts[0]);
      } else {
        setBaseApiEndpoint(config.customEndpoint);
      }
    }
    
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
        if (!baseApiEndpoint || !customModelInput) {
          setTestResult({
            success: false,
            message: 'API endpoint and model name are required'
          });
          setIsTesting(false);
          return;
        }
        
        const endpoint = baseApiEndpoint;
        
        console.log(`Testing OpenAI compatible connection with endpoint: ${endpoint}, model: ${customModelInput}`);
        
        const result = await apiService.testConnection(
          aiProvider,
          apiKey,
          customModelInput,
          endpoint
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
            'Accept': 'application/vnd.github.v3+json'
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
    <div className={`fixed inset-0 z-50 overflow-y-auto ${isOpen ? 'block' : 'hidden'}`}>
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 transition-opacity" aria-hidden="true">
          <div className="absolute inset-0 bg-gray-900 opacity-75"></div>
        </div>
        
        <form onSubmit={handleSubmit} className="inline-block align-bottom bg-gray-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-3xl sm:w-full">
          <div className="bg-gray-800 px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <div className="sm:flex sm:items-start">
              <div className="mt-3 text-center sm:mt-0 sm:text-left w-full">
                <h3 className="text-lg leading-6 font-medium text-gray-100">
                  Settings
                </h3>
                
                <div className="mt-4 border-b border-gray-700">
                  <div className="flex">
                    <button
                      type="button"
                      className={`px-4 py-2 text-sm font-medium ${activeTab === 'saved_configs' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-gray-300 hover:text-gray-100'}`}
                      onClick={() => setActiveTab('saved_configs')}
                    >
                      Saved AI Configurations
                    </button>
                    <button
                      type="button"
                      className={`px-4 py-2 text-sm font-medium ${activeTab === 'new_config' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-gray-300 hover:text-gray-100'}`}
                      onClick={() => {
                        setActiveTab('new_config');
                        resetConfigForm();
                      }}
                    >
                      {editingConfigId ? 'Edit Configuration' : 'Add New Configuration'}
                    </button>
                    <button
                      type="button"
                      className={`px-4 py-2 text-sm font-medium ${activeTab === 'github' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-gray-300 hover:text-gray-100'}`}
                      onClick={() => setActiveTab('github')}
                    >
                      GitHub API
                    </button>
                  </div>
                </div>
                
                <div className="mt-4">
                  <div className="mb-4">
                    <label htmlFor="apiBaseUrl" className="block text-sm font-medium text-gray-300">
                      API Base URL
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
                      Base URL for the backend API (default: http://localhost:8000)
                    </p>
                  </div>
                </div>
                
                {activeTab === 'saved_configs' && (
                  <div className="mt-4">
                    <div className="flex justify-between items-center mb-4">
                      <h4 className="text-md font-medium text-gray-200">Saved AI Configurations</h4>
                      <button
                        type="button"
                        onClick={() => {
                          setActiveTab('new_config');
                          resetConfigForm();
                        }}
                        className="px-3 py-1 text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
                      >
                        Add New
                      </button>
                    </div>
                    
                    {aiConfigs.length === 0 ? (
                      <div className="text-center py-4 text-gray-400">
                        No AI configurations saved yet. Add one to get started.
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {aiConfigs.map((config) => (
                          <div key={config.id} className="p-3 bg-gray-700 rounded-md">
                            <div className="flex justify-between items-center">
                              <div>
                                <h5 className="text-md font-medium text-gray-100 flex items-center">
                                  {config.name}
                                  {config.isVerified && (
                                    <span className="ml-2 text-green-400 text-xs">✓ Verified</span>
                                  )}
                                  {activeAIConfigId === config.id && (
                                    <span className="ml-2 text-blue-400 text-xs">(Active)</span>
                                  )}
                                </h5>
                                <p className="text-sm text-gray-300">
                                  Provider: {config.aiProvider} | Model: {config.model}
                                </p>
                                <p className="text-xs text-gray-400">
                                  API Key: {config.apiKey.substring(0, 5)}...{config.apiKey.substring(config.apiKey.length - 5)}
                                </p>
                                {config.customEndpoint && (
                                  <p className="text-xs text-gray-400">
                                    Endpoint: {config.customEndpoint}
                                  </p>
                                )}
                              </div>
                              <div className="flex space-x-2">
                                <button
                                  type="button"
                                  onClick={() => handleSetActiveConfig(config.id)}
                                  className={`px-2 py-1 text-xs font-medium rounded-md shadow-sm ${
                                    activeAIConfigId === config.id
                                      ? 'bg-blue-700 text-blue-200 cursor-not-allowed'
                                      : 'bg-blue-600 text-white hover:bg-blue-700'
                                  }`}
                                  disabled={activeAIConfigId === config.id}
                                >
                                  {activeAIConfigId === config.id ? 'Active' : 'Use'}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleEditConfig(config)}
                                  className="px-2 py-1 text-xs font-medium rounded-md shadow-sm text-white bg-gray-600 hover:bg-gray-500"
                                >
                                  Edit
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteConfig(config.id)}
                                  className="px-2 py-1 text-xs font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700"
                                >
                                  Delete
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
                
                {activeTab === 'new_config' && (
                  <>
                    <div className="mt-4">
                      <div className="mb-4">
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
                      
                      <div className="mb-4">
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
                      
                      <div className="space-y-4 p-4 border border-gray-700 rounded-md">
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
                            <label htmlFor="baseApiEndpoint" className="block text-sm font-medium text-gray-300">
                              API Base URL
                            </label>
                            <input
                              type="url"
                              id="baseApiEndpoint"
                              value={baseApiEndpoint}
                              onChange={(e) => setBaseApiEndpoint(e.target.value)}
                              className="mt-1 block w-full rounded-md bg-gray-800 border-gray-700 text-gray-100 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                              placeholder="https://api.example.com"
                            />
                            <p className="mt-1 text-xs text-gray-400">
                              Base URL for the API (e.g., https://api.example.com)
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
                              (aiProvider === 'openai_compatible' && (!baseApiEndpoint || !customModelInput))}
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
                  <div>
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
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
