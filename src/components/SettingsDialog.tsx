import React, { useState, useEffect } from 'react';
import { useProjectStore } from '../store';
import { AIProvider } from '../types';

interface SettingsDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SettingsDialog({ isOpen, onClose }: SettingsDialogProps) {
  const { apiSettings, updateAPISettings } = useProjectStore();
  
  const [apiKey, setApiKey] = useState(apiSettings.apiKey);
  const [apiBaseUrl, setApiBaseUrl] = useState(apiSettings.apiBaseUrl);
  const [model, setModel] = useState(apiSettings.model);
  const [githubToken, setGithubToken] = useState(apiSettings.githubToken);
  const [aiProvider, setAiProvider] = useState<AIProvider>(apiSettings.aiProvider);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [customEndpoint, setCustomEndpoint] = useState(apiSettings.customEndpoint || '');
  const [testMessage, setTestMessage] = useState('Hello, can you hear me?');
  const [activeTab, setActiveTab] = useState<'ai' | 'github'>('ai');
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [isLoadingModels, setIsLoadingModels] = useState(false);

  useEffect(() => {
    setApiKey(apiSettings.apiKey);
    setApiBaseUrl(apiSettings.apiBaseUrl);
    setModel(apiSettings.model);
    setGithubToken(apiSettings.githubToken);
    setAiProvider(apiSettings.aiProvider);
    setCustomEndpoint(apiSettings.customEndpoint || '');
  }, [apiSettings]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    updateAPISettings({
      apiKey,
      apiBaseUrl,
      model,
      githubToken,
      aiProvider,
      customEndpoint
    });
    
    onClose();
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
      let endpoint = apiBaseUrl;
      let testUrl = '';
      let headers: HeadersInit = {
        'Content-Type': 'application/json'
      };
      
      if (apiKey) {
        headers['Authorization'] = `Bearer ${apiKey}`;
      }
      
      if (aiProvider === 'Open_AI' || aiProvider === 'Open_AI_Compatible') {
        testUrl = aiProvider === 'Open_AI' 
          ? 'https://api.openai.com/v1/chat/completions'
          : customEndpoint;
          
        const testBody = {
          model: model || 'gpt-3.5-turbo',
          messages: [{ role: 'user', content: testMessage }],
          max_tokens: 50,
          temperature: 0.7
        };
        
        const response = await fetch(testUrl, {
          method: 'POST',
          headers,
          body: JSON.stringify(testBody)
        });
        
        if (response.ok) {
          const data = await response.json();
          const aiResponse = data.choices?.[0]?.message?.content || '';
          
          setTestResult({
            success: true,
            message: `Connection successful! Response: "${aiResponse.substring(0, 100)}${aiResponse.length > 100 ? '...' : ''}"`
          });
          
          updateAPISettings({
            apiKey,
            apiBaseUrl,
            model,
            githubToken,
            aiProvider,
            customEndpoint
          });
        } else {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error?.message || `API error: ${response.status}`);
        }
      } else if (aiProvider === 'Anthropic') {
        testUrl = 'https://api.anthropic.com/v1/messages';
        headers['anthropic-version'] = '2023-06-01';
        
        const testBody = {
          model: model || 'claude-3-haiku-20240307',
          messages: [{ role: 'user', content: testMessage }],
          max_tokens: 50
        };
        
        const response = await fetch(testUrl, {
          method: 'POST',
          headers,
          body: JSON.stringify(testBody)
        });
        
        if (response.ok) {
          const data = await response.json();
          const aiResponse = data.content?.[0]?.text || '';
          
          setTestResult({
            success: true,
            message: `Connection successful! Response: "${aiResponse.substring(0, 100)}${aiResponse.length > 100 ? '...' : ''}"`
          });
          
          updateAPISettings({
            apiKey,
            apiBaseUrl,
            model,
            githubToken,
            aiProvider,
            customEndpoint
          });
        } else {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error?.message || `API error: ${response.status}`);
        }
      } else if (aiProvider === 'Nvidia') {
        testUrl = 'https://api.nvidia.com/v1/chat/completions';
        
        const testBody = {
          model: model || 'llama-3-70b',
          messages: [{ role: 'user', content: testMessage }],
          max_tokens: 50
        };
        
        const response = await fetch(testUrl, {
          method: 'POST',
          headers,
          body: JSON.stringify(testBody)
        });
        
        if (response.ok) {
          const data = await response.json();
          const aiResponse = data.choices?.[0]?.message?.content || '';
          
          setTestResult({
            success: true,
            message: `Connection successful! Response: "${aiResponse.substring(0, 100)}${aiResponse.length > 100 ? '...' : ''}"`
          });
          
          updateAPISettings({
            apiKey,
            apiBaseUrl,
            model,
            githubToken,
            aiProvider,
            customEndpoint
          });
        } else {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error?.message || `API error: ${response.status}`);
        }
      } else {
        throw new Error('Unsupported AI provider');
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
      <div className="bg-gray-900 rounded-lg shadow-xl w-full max-w-md p-6 border border-gray-700">
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
                
                <div>
                  <button
                    type="button"
                    onClick={testConnection}
                    className={`px-4 py-2 text-sm font-medium rounded-md shadow-sm text-white w-full ${
                      isTesting ? 'bg-gray-600 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
                    }`}
                    disabled={isTesting || (!apiKey) || (aiProvider === 'Open_AI_Compatible' && !customEndpoint)}
                  >
                    {isTesting ? 'Testing...' : 'Test Connection'}
                  </button>
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
