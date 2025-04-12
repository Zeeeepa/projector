import React, { useState, useEffect } from 'react';
import { useProjectStore } from '../store';
import { PRReviewBotConfig } from '../types';
import { prReviewBotService } from '../services/pr_review_bot';

interface PRReviewBotTabProps {
  apiBaseUrl: string;
}

export function PRReviewBotTab({ apiBaseUrl }: PRReviewBotTabProps) {
  const { 
    prReviewBotConfigs, 
    addPRReviewBotConfig, 
    updatePRReviewBotConfig, 
    deletePRReviewBotConfig, 
    activePRReviewBotConfigId, 
    setActivePRReviewBotConfig,
    apiSettings
  } = useProjectStore();
  
  const [configName, setConfigName] = useState('');
  const [githubToken, setGithubToken] = useState(apiSettings.githubToken || '');
  const [aiProvider, setAiProvider] = useState<'anthropic' | 'openai'>('anthropic');
  const [aiApiKey, setAiApiKey] = useState('');
  const [botStatus, setBotStatus] = useState<'stopped' | 'running' | 'error'>('stopped');
  const [botConnectionStatus, setBotConnectionStatus] = useState<'connected' | 'disconnected'>('disconnected');
  
  const [editingConfigId, setEditingConfigId] = useState<string | null>(null);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [activeTab, setActiveTab] = useState<'saved_configs' | 'new_config'>('saved_configs');
  const [isStartingBot, setIsStartingBot] = useState(false);
  const [isStoppingBot, setIsStoppingBot] = useState(false);
  
  // Initialize PR Review Bot service with API base URL
  useEffect(() => {
    prReviewBotService.updateApiBaseUrl(apiBaseUrl);
  }, [apiBaseUrl]);
  
  // Load active config when changed
  useEffect(() => {
    if (activePRReviewBotConfigId) {
      const activeConfig = prReviewBotConfigs.find(config => config.id === activePRReviewBotConfigId);
      if (activeConfig) {
        setEditingConfigId(activeConfig.id);
        setConfigName(activeConfig.name);
        setGithubToken(activeConfig.githubToken);
        
        // Determine AI provider and key
        if (activeConfig.anthropic_api_key) {
          setAiProvider('anthropic');
          setAiApiKey(activeConfig.anthropic_api_key);
        } else if (activeConfig.openai_api_key) {
          setAiProvider('openai');
          setAiApiKey(activeConfig.openai_api_key);
        }
        
        // Set active config in service
        prReviewBotService.setActiveConfig(activeConfig);
      }
    } else {
      resetConfigForm();
      prReviewBotService.clearActiveConfig();
    }
  }, [activePRReviewBotConfigId, prReviewBotConfigs]);
  
  // Fetch bot status periodically
  useEffect(() => {
    const fetchBotStatus = async () => {
      try {
        const status = await prReviewBotService.getStatus();
        setBotStatus(status.status);
        setBotConnectionStatus(status.connection_status);
      } catch (error) {
        console.error('Error fetching bot status:', error);
      }
    };
    
    fetchBotStatus();
    const interval = setInterval(fetchBotStatus, 5000); // Check every 5 seconds
    
    return () => clearInterval(interval);
  }, []);
  
  const resetConfigForm = () => {
    setEditingConfigId(null);
    setConfigName('');
    setGithubToken(apiSettings.githubToken || '');
    setAiProvider('anthropic');
    setAiApiKey('');
    setTestResult(null);
  };
  
  const handleSaveConfig = () => {
    if (!configName || !githubToken || !aiApiKey) {
      alert('Configuration name, GitHub token, and AI API key are required');
      return;
    }
    
    const configData: Omit<PRReviewBotConfig, 'id'> = {
      name: configName,
      githubToken,
      webhook_secret: 'webhook_secret', // Default value
      auto_review: true,
      monitor_branches: true,
      setup_all_repos_webhooks: true,
      validate_documentation: true,
      documentation_files: ['STRUCTURE.md', 'STEP-BY-STEP.md'],
      isVerified: testResult?.success || false
    };
    
    // Set the appropriate API key based on provider
    if (aiProvider === 'anthropic') {
      configData.anthropic_api_key = aiApiKey;
    } else {
      configData.openai_api_key = aiApiKey;
    }
    
    if (editingConfigId) {
      updatePRReviewBotConfig(editingConfigId, configData);
    } else {
      addPRReviewBotConfig(configData);
    }
    
    resetConfigForm();
    setActiveTab('saved_configs');
  };
  
  const handleDeleteConfig = (id: string) => {
    if (window.confirm('Are you sure you want to delete this configuration?')) {
      deletePRReviewBotConfig(id);
    }
  };
  
  const handleEditConfig = (config: PRReviewBotConfig) => {
    setEditingConfigId(config.id);
    setConfigName(config.name);
    setGithubToken(config.githubToken);
    
    // Determine AI provider and key
    if (config.anthropic_api_key) {
      setAiProvider('anthropic');
      setAiApiKey(config.anthropic_api_key || '');
    } else if (config.openai_api_key) {
      setAiProvider('openai');
      setAiApiKey(config.openai_api_key || '');
    } else {
      setAiProvider('anthropic');
      setAiApiKey('');
    }
    
    setTestResult(config.isVerified ? { success: true, message: 'Configuration verified' } : null);
    
    setActiveTab('new_config');
  };
  
  const handleSetActiveConfig = (id: string) => {
    setActivePRReviewBotConfig(id);
    
    const config = prReviewBotConfigs.find(c => c.id === id);
    if (config) {
      prReviewBotService.setActiveConfig(config);
    }
  };
  
  const testConnection = async () => {
    if (!githubToken || !aiApiKey) return;
    
    setIsTesting(true);
    setTestResult(null);
    
    try {
      // Create a temporary config for testing
      const tempConfig: Partial<PRReviewBotConfig> = {
        githubToken,
        webhook_secret: 'webhook_secret', // Default value
        auto_review: true,
        monitor_branches: true,
        setup_all_repos_webhooks: true,
        validate_documentation: true,
        documentation_files: ['STRUCTURE.md', 'STEP-BY-STEP.md']
      };
      
      // Set the appropriate API key based on provider
      if (aiProvider === 'anthropic') {
        tempConfig.anthropic_api_key = aiApiKey;
      } else {
        tempConfig.openai_api_key = aiApiKey;
      }
      
      const result = await prReviewBotService.updateConfig(tempConfig);
      
      setTestResult({
        success: result.status === 'success',
        message: result.message
      });
    } catch (error) {
      console.error('Error testing PR Review Bot connection:', error);
      setTestResult({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to test connection'
      });
    } finally {
      setIsTesting(false);
    }
  };
  
  const startBot = async () => {
    if (!activePRReviewBotConfigId) {
      alert('Please select a configuration first');
      return;
    }
    
    setIsStartingBot(true);
    
    try {
      const result = await prReviewBotService.startBot();
      if (result.status === 'started' || result.status === 'already_running') {
        setBotStatus('running');
      }
    } catch (error) {
      console.error('Error starting PR Review Bot:', error);
      alert('Failed to start PR Review Bot');
    } finally {
      setIsStartingBot(false);
    }
  };
  
  const stopBot = async () => {
    setIsStoppingBot(true);
    
    try {
      const result = await prReviewBotService.stopBot();
      if (result.status === 'stopped' || result.status === 'not_running' || result.status === 'killed') {
        setBotStatus('stopped');
      }
    } catch (error) {
      console.error('Error stopping PR Review Bot:', error);
      alert('Failed to stop PR Review Bot');
    } finally {
      setIsStoppingBot(false);
    }
  };
  
  return (
    <div className="mt-4">
      <div className="border-b border-gray-700">
        <nav className="-mb-px flex space-x-6">
          <button
            type="button"
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'saved_configs'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-700'
            }`}
            onClick={() => setActiveTab('saved_configs')}
          >
            Saved Configurations
          </button>
          <button
            type="button"
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'new_config'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-700'
            }`}
            onClick={() => {
              setActiveTab('new_config');
              resetConfigForm();
            }}
          >
            {editingConfigId ? 'Edit Configuration' : 'New Configuration'}
          </button>
        </nav>
      </div>
      
      {activeTab === 'saved_configs' && (
        <div className="mt-4">
          {prReviewBotConfigs.length === 0 ? (
            <div className="text-center py-4 text-gray-400">
              <p>No PR Review Bot configurations saved yet.</p>
              <button
                type="button"
                onClick={() => setActiveTab('new_config')}
                className="mt-2 text-indigo-400 hover:text-indigo-300"
              >
                Create your first configuration
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {prReviewBotConfigs.map((config) => (
                <div
                  key={config.id}
                  className={`p-4 rounded-md border ${
                    activePRReviewBotConfigId === config.id
                      ? 'border-indigo-500 bg-gray-800'
                      : 'border-gray-700 bg-gray-900'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-lg font-medium text-gray-100">{config.name}</h3>
                      <p className="text-sm text-gray-400">
                        {config.isVerified ? (
                          <span className="text-green-400">✓ Verified</span>
                        ) : (
                          <span className="text-yellow-400">⚠ Not verified</span>
                        )}
                      </p>
                      <div className="mt-2 text-sm text-gray-400">
                        <p>GitHub Token: {config.githubToken.substring(0, 3)}***</p>
                        <p>AI Provider: {config.anthropic_api_key ? 'Anthropic' : 'OpenAI'}</p>
                      </div>
                    </div>
                    <div className="flex flex-col space-y-2">
                      {activePRReviewBotConfigId === config.id ? (
                        <div className="flex space-x-2">
                          {botStatus === 'running' ? (
                            <button
                              type="button"
                              onClick={stopBot}
                              disabled={isStoppingBot}
                              className="px-3 py-1 text-xs font-medium rounded-md bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
                            >
                              {isStoppingBot ? 'Stopping...' : 'Stop Bot'}
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={startBot}
                              disabled={isStartingBot}
                              className="px-3 py-1 text-xs font-medium rounded-md bg-green-600 text-white hover:bg-green-700 disabled:opacity-50"
                            >
                              {isStartingBot ? 'Starting...' : 'Start Bot'}
                            </button>
                          )}
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleSetActiveConfig(config.id)}
                          className="px-3 py-1 text-xs font-medium rounded-md bg-indigo-600 text-white hover:bg-indigo-700"
                        >
                          Set Active
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => handleEditConfig(config)}
                        className="px-3 py-1 text-xs font-medium rounded-md bg-blue-600 text-white hover:bg-blue-700"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteConfig(config.id)}
                        className="px-3 py-1 text-xs font-medium rounded-md bg-red-600 text-white hover:bg-red-700"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                  
                  {activePRReviewBotConfigId === config.id && (
                    <div className="mt-3 pt-3 border-t border-gray-700">
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-medium text-gray-300">Status:</span>
                        <span className={`text-sm px-2 py-1 rounded ${
                          botStatus === 'running' 
                            ? 'bg-green-900 text-green-200' 
                            : botStatus === 'error'
                              ? 'bg-red-900 text-red-200'
                              : 'bg-gray-700 text-gray-300'
                        }`}>
                          {botStatus === 'running' ? 'Running' : botStatus === 'error' ? 'Error' : 'Stopped'}
                        </span>
                        
                        <span className="text-sm font-medium text-gray-300 ml-4">Connection:</span>
                        <span className={`text-sm px-2 py-1 rounded ${
                          botConnectionStatus === 'connected' 
                            ? 'bg-green-900 text-green-200' 
                            : 'bg-gray-700 text-gray-300'
                        }`}>
                          {botConnectionStatus === 'connected' ? 'Connected' : 'Disconnected'}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      
      {activeTab === 'new_config' && (
        <div className="mt-4 space-y-4">
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
              placeholder="My PR Review Bot Config"
            />
          </div>
          
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
              placeholder="Enter GitHub token"
            />
            <p className="mt-1 text-xs text-gray-400">
              Token used for GitHub API access
            </p>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-300">
              AI Provider
            </label>
            <div className="mt-1 flex space-x-4">
              <label className="flex items-center">
                <input
                  type="radio"
                  checked={aiProvider === 'anthropic'}
                  onChange={() => setAiProvider('anthropic')}
                  className="rounded-full bg-gray-800 border-gray-700 text-indigo-600 focus:ring-indigo-500"
                />
                <span className="ml-2 text-sm text-gray-300">Anthropic</span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  checked={aiProvider === 'openai'}
                  onChange={() => setAiProvider('openai')}
                  className="rounded-full bg-gray-800 border-gray-700 text-indigo-600 focus:ring-indigo-500"
                />
                <span className="ml-2 text-sm text-gray-300">OpenAI</span>
              </label>
            </div>
          </div>
          
          <div>
            <label htmlFor="aiApiKey" className="block text-sm font-medium text-gray-300">
              {aiProvider === 'anthropic' ? 'Anthropic API Key' : 'OpenAI API Key'}
            </label>
            <input
              type="text"
              id="aiApiKey"
              value={aiApiKey}
              onChange={(e) => setAiApiKey(e.target.value)}
              className="mt-1 block w-full rounded-md bg-gray-800 border-gray-700 text-gray-100 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              placeholder={`Enter ${aiProvider === 'anthropic' ? 'Anthropic' : 'OpenAI'} API key`}
            />
            <p className="mt-1 text-xs text-gray-400">
              API key for the selected AI provider
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
              disabled={isTesting || !githubToken || !aiApiKey}
            >
              {isTesting ? 'Testing...' : 'Test Connection'}
            </button>
            
            <button
              type="button"
              onClick={handleSaveConfig}
              className="px-4 py-2 text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 flex-1"
              disabled={!configName || !githubToken || !aiApiKey}
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
      )}
    </div>
  );
}
