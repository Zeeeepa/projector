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
  const [aiProvider, setAiProvider] = useState<AIProvider>('openai');
  const [customEndpoint, setCustomEndpoint] = useState('');
  const [editingConfigId, setEditingConfigId] = useState<string | null>(null);
  
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [activeTab, setActiveTab] = useState<'ai' | 'github'>('ai');
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
        setAiProvider(activeConfig.aiProvider);
        setCustomEndpoint(activeConfig.customEndpoint || '');
      }
    } else {
      resetConfigForm();
    }
  }, [activeAIConfigId, aiConfigs]);

  useEffect(() => {
    setModel('');
    setAvailableModels([]);
  }, [aiProvider]);

  const resetConfigForm = () => {
    setEditingConfigId(null);
    setConfigName('');
    setApiKey('');
    setModel('');
    setAiProvider('openai');
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
    
    if (!model) {
      alert('Please select a model');
      return;
    }
    
    if (needsCustomEndpoint(aiProvider) && !customEndpoint) {
      alert('Custom API endpoint is required for this provider');
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

  useEffect(() => {
    const validateApiKey = async () => {
      if (!apiKey || isValidatingKey) return;
      
      setIsValidatingKey(true);
      try {
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
    if (apiKey && needsCustomEndpoint(aiProvider) && customEndpoint) {
      fetchModels();
    }
  }, [customEndpoint]);

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
      } else {
        setGithubTokenValid(null);
      }
    }, 1000);
    
    return () => clearTimeout(timer);
  }, [githubToken]);

  const testConnection = async () => {
    setIsTesting(true);
    setTestResult(null);
    
    try {
      const result = await apiService.testAIConfig({
        apiKey,
        model,
        aiProvider,
        customEndpoint: needsCustomEndpoint(aiProvider) ? customEndpoint : undefined,
        name: configName
      });
      
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
                              <div className="font-medium text-gray-200">
                                {config.name}
                                {config.isVerified && (
                                  <span className="ml-2 text-xs text-green-400">
                                    ✓ Verified
                                  </span>
                                )}
                              </div>
                              <div className="text-sm text-gray-400 mt-1">
                                {config.aiProvider} • {config.model}
                              </div>
                            </div>
                            <div className="flex space-x-2">
                              <button
                                type="button"
                                onClick={() => handleSetActiveConfig(config.id)}
                                className={`px-2 py-1 text-xs rounded ${
                                  activeAIConfigId === config.id
                                    ? 'bg-blue-700 text-blue-100 cursor-default'
                                    : 'bg-blue-600 text-blue-100 hover:bg-blue-500'
                                }`}
                              >
                                {activeAIConfigId === config.id ? 'Active' : 'Use'}
                              </button>
                              
                              <button
                                type="button"
                                onClick={() => handleEditConfig(config)}
                                className="px-2 py-1 text-xs bg-gray-600 text-gray-100 rounded hover:bg-gray-500"
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteConfig(config.id)}
                                className="px-2 py-1 text-xs bg-red-600 text-red-100 rounded hover:bg-red-500"
                              >
                                Delete
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  
                  <div className="space-y-4">
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
                        placeholder="e.g., My OpenAI Config"
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
                        type="password"
                        id="apiKey"
                        value={apiKey}
                        onChange={(e) => setApiKey(e.target.value)}
                        className="mt-1 block w-full rounded-md bg-gray-800 border-gray-700 text-gray-100 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                        placeholder="Enter your API key"
                      />
                    </div>
                    
                    {needsCustomEndpoint(aiProvider) && (
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
                        disabled={isTesting || (!apiKey) || (needsCustomEndpoint(aiProvider) && !customEndpoint)}
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
