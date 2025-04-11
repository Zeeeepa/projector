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
  const [aiProvider, setAiProvider] = useState<AIProvider>('openai');
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
    setAiProvider('openai');
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
      if (!endpointToSave.endsWith('/v1')) {
        if (endpointToSave.endsWith('/')) {
          endpointToSave = endpointToSave.slice(0, -1);
        }
        endpointToSave += '/v1';
      }
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
      apiBaseUrl: aiProvider === 'openai_compatible' ? apiBaseUrlInput : undefined
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
        setTestResult({
          success: true,
          message: 'Using custom OpenAI-compatible configuration'
        });
        setIsTesting(false);
        return;
      }
      
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
          setTestResult({
            success: true,
            message: 'Using custom OpenAI-compatible configuration'
          });
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
        (needsCustomEndpoint(aiProvider) && customEndpoint)
      )) {
        validateApiKey();
      }
    }, 1000);
    
    return () => clearTimeout(timer);
  }, [apiKey, aiProvider, customEndpoint]);

  useEffect(() => {
    if (apiKey && needsCustomEndpoint(aiProvider) && customEndpoint && aiProvider !== 'openai_compatible') {
      fetchModels();
    }
  }, [customEndpoint]);

  useEffect(() => {
    if (aiProvider === 'openai_compatible' && baseApiEndpoint) {
      let endpoint = baseApiEndpoint;
      if (!endpoint.endsWith('/v1')) {
        if (endpoint.endsWith('/')) {
          endpoint = endpoint.slice(0, -1);
        }
        endpoint += '/v1';
      }
      setCustomEndpoint(endpoint);
    }
  }, [baseApiEndpoint, aiProvider]);

  useEffect(() => {
    const validateGithubToken = async () => {
      if (!githubToken || isValidatingGithubToken) return;
      
      setIsValidatingGithubToken(true);
      setGithubTokenValid(null);
      
      try {
        apiService.updateSettings({ githubToken });
        
        await fetch('https://api.github.com/user', {
          headers: {
            'Accept': 'application/vnd.github+json',
            'Authorization': `Bearer ${githubToken}`,
            'X-GitHub-Api-Version': '2022-11-28'
          }
        }).then(response => {
          setGithubTokenValid(response.ok);
        });
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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-900 rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          <div className="p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-medium text-gray-100">Settings</h3>
              <button
                type="button"
                onClick={onClose}
                className="text-gray-400 hover:text-white"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="mb-6">
              <div className="flex border-b border-gray-700">
                <button
                  type="button"
                  className={`px-4 py-2 font-medium ${activeTab === 'saved_configs' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-gray-400 hover:text-gray-300'}`}
                  onClick={() => setActiveTab('saved_configs')}
                >
                  Saved AI Configurations
                </button>
                <button
                  type="button"
                  className={`px-4 py-2 font-medium ${activeTab === 'new_config' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-gray-400 hover:text-gray-300'}`}
                  onClick={() => {
                    resetConfigForm();
                    setActiveTab('new_config');
                  }}
                >
                  Add/Edit Configuration
                </button>
                <button
                  type="button"
                  className={`px-4 py-2 font-medium ${activeTab === 'github' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-gray-400 hover:text-gray-300'}`}
                  onClick={() => setActiveTab('github')}
                >
                  GitHub Settings
                </button>
              </div>
            </div>
            
            {activeTab === 'saved_configs' && (
              <div className="space-y-4">
                {aiConfigs.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-gray-400">No AI configurations saved yet.</p>
                    <button
                      type="button"
                      onClick={() => setActiveTab('new_config')}
                      className="mt-4 px-4 py-2 text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
                    >
                      Add New Configuration
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-4">
                    {aiConfigs.map(config => (
                      <div
                        key={config.id}
                        className={`p-4 rounded-lg border ${
                          activeAIConfigId === config.id
                            ? 'border-blue-500 bg-gray-800'
                            : 'border-gray-700 bg-gray-850 hover:bg-gray-800'
                        }`}
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="text-lg font-medium text-gray-100">{config.name}</h4>
                            <p className="text-sm text-gray-400">
                              Provider: {providerRegistry.getProvider(config.aiProvider)?.getName() || config.aiProvider}
                            </p>
                            <p className="text-sm text-gray-400">Model: {config.model}</p>
                            {config.isVerified && (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-900 text-green-100 mt-2">
                                Verified
                              </span>
                            )}
                          </div>
                          <div className="flex space-x-2">
                            <button
                              type="button"
                              onClick={() => handleSetActiveConfig(config.id)}
                              className={`px-3 py-1 text-xs font-medium rounded-md ${
                                activeAIConfigId === config.id
                                  ? 'bg-blue-600 text-white'
                                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                              }`}
                            >
                              {activeAIConfigId === config.id ? 'Active' : 'Use'}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleEditConfig(config)}
                              className="px-3 py-1 text-xs font-medium rounded-md bg-gray-700 text-gray-300 hover:bg-gray-600"
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteConfig(config.id)}
                              className="px-3 py-1 text-xs font-medium rounded-md bg-red-900 text-red-100 hover:bg-red-800"
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
                <div className="space-y-6">
                  <div className="bg-gray-850 p-6 rounded-lg border border-gray-700">
                    <h4 className="text-lg font-medium text-gray-100 mb-4">
                      {editingConfigId ? 'Edit AI Configuration' : 'New AI Configuration'}
                    </h4>
                    
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
        </form>
      </div>
    </div>
  );
}
