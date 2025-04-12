import React, { useState, useEffect } from 'react';
import { useProjectStore } from '../store';
import { PRReviewBotConfig } from '../types';
import { prReviewBotService } from '../services/pr_review_bot';

interface PRReviewBotSettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

const PRReviewBotSettingsPanel: React.FC<PRReviewBotSettingsPanelProps> = ({ isOpen, onClose }) => {
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
  const [instructions, setInstructions] = useState('');
  const [autoMerge, setAutoMerge] = useState(false);
  const [monitorAllRepos, setMonitorAllRepos] = useState(true);
  
  const [editingConfigId, setEditingConfigId] = useState<string | null>(null);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [activeTab, setActiveTab] = useState<'configuration' | 'edit'>('configuration');
  const [isStartingBot, setIsStartingBot] = useState(false);
  const [isStoppingBot, setIsStoppingBot] = useState(false);
  const [statusError, setStatusError] = useState<string | null>(null);
  
  useEffect(() => {
    const fetchBotStatus = async () => {
      try {
        const status = await prReviewBotService.getStatus();
        setBotStatus(status.status === 'running' ? 'running' : 'stopped');
        setBotConnectionStatus(status.connection_status);
        setStatusError(null);
      } catch (error) {
        console.error('Error fetching bot status:', error);
        setStatusError(error instanceof Error ? error.message : 'Failed to fetch bot status');
        setBotStatus('stopped');
        setBotConnectionStatus('disconnected');
      }
    };
    
    if (isOpen) {
      fetchBotStatus();
      const interval = setInterval(fetchBotStatus, 5000); // Check every 5 seconds
      
      return () => clearInterval(interval);
    }
  }, [isOpen]);
  
  useEffect(() => {
    if (activePRReviewBotConfigId) {
      const activeConfig = prReviewBotConfigs.find(config => config.id === activePRReviewBotConfigId);
      if (activeConfig) {
        setEditingConfigId(activeConfig.id);
        setConfigName(activeConfig.name);
        setGithubToken(activeConfig.githubToken);
        setAutoMerge(activeConfig.auto_review || false);
        setMonitorAllRepos(activeConfig.setup_all_repos_webhooks || false);
        setInstructions(activeConfig.instructions || '');
        
        if (activeConfig.anthropic_api_key) {
          setAiProvider('anthropic');
          setAiApiKey(activeConfig.anthropic_api_key);
        } else if (activeConfig.openai_api_key) {
          setAiProvider('openai');
          setAiApiKey(activeConfig.openai_api_key);
        }
        
        prReviewBotService.setActiveConfig(activeConfig);
      }
    } else {
      resetConfigForm();
      prReviewBotService.clearActiveConfig();
    }
  }, [activePRReviewBotConfigId, prReviewBotConfigs]);
  
  const resetConfigForm = () => {
    setEditingConfigId(null);
    setConfigName('');
    setGithubToken(apiSettings.githubToken || '');
    setAiProvider('anthropic');
    setAiApiKey('');
    setInstructions('');
    setAutoMerge(false);
    setMonitorAllRepos(true);
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
      webhook_secret: 'webhook_secret',
      auto_review: autoMerge,
      monitor_branches: true,
      setup_all_repos_webhooks: monitorAllRepos,
      validate_documentation: true,
      documentation_files: ['STRUCTURE.md', 'STEP-BY-STEP.md'],
      isVerified: testResult?.success || false,
      instructions: instructions
    };
    
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
    setActiveTab('configuration');
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
    setAutoMerge(config.auto_review || false);
    setMonitorAllRepos(config.setup_all_repos_webhooks || false);
    setInstructions(config.instructions || '');
    
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
    
    setActiveTab('edit');
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
      const tempConfig: Partial<PRReviewBotConfig> = {
        githubToken,
        webhook_secret: 'webhook_secret',
        auto_review: autoMerge,
        monitor_branches: true,
        setup_all_repos_webhooks: monitorAllRepos,
        validate_documentation: true,
        documentation_files: ['STRUCTURE.md', 'STEP-BY-STEP.md'],
        instructions: instructions
      };
      
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
      if (result.status === 'success') {
        setBotStatus('running');
        setBotConnectionStatus('connected');
      } else {
        alert(`Failed to start PR Review Bot: ${result.message}`);
      }
    } catch (error) {
      console.error('Error starting PR Review Bot:', error);
      alert('Failed to start PR Review Bot: ' + (error instanceof Error ? error.message : String(error)));
    } finally {
      setIsStartingBot(false);
    }
  };
  
  const stopBot = async () => {
    setIsStoppingBot(true);
    
    try {
      const result = await prReviewBotService.stopBot();
      if (result.status === 'success') {
        setBotStatus('stopped');
      }
    } catch (error) {
      console.error('Error stopping PR Review Bot:', error);
      alert('Failed to stop PR Review Bot');
    } finally {
      setIsStoppingBot(false);
    }
  };
  
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-900 rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-medium text-gray-100">
              PR Review Bot Settings
            </h3>
            <button
              type="button"
              onClick={onClose}
              className="text-gray-400 hover:text-gray-100"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          {statusError && (
            <div className="mb-4 p-3 bg-red-900 text-red-100 rounded-md">
              <p className="font-medium">Error connecting to PR Review Bot:</p>
              <p>{statusError}</p>
              <p className="mt-2 text-sm">
                Make sure the PR Review Bot is running. You can start it with:
                <code className="block mt-1 p-2 bg-gray-800 rounded">
                  cd pr_review_bot && python -m pr_review_bot.main
                </code>
              </p>
            </div>
          )}
          
          <div className="border-b border-gray-700 mb-6">
            <nav className="-mb-px flex space-x-6">
              <button
                type="button"
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'configuration'
                    ? 'border-indigo-500 text-indigo-400'
                    : 'border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-700'
                }`}
                onClick={() => setActiveTab('configuration')}
              >
                Configuration
              </button>
              <button
                type="button"
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'edit'
                    ? 'border-indigo-500 text-indigo-400'
                    : 'border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-700'
                }`}
                onClick={() => {
                  setActiveTab('edit');
                  resetConfigForm();
                }}
              >
                Edit
              </button>
            </nav>
          </div>
          
          {activeTab === 'configuration' && (
            <div>
              <div className="flex justify-between items-center mb-4">
                <h4 className="text-lg font-medium text-gray-200">PR Review Bot Configurations</h4>
                
                <div className="flex space-x-2">
                  {activePRReviewBotConfigId && (
                    <>
                      <button
                        type="button"
                        onClick={startBot}
                        disabled={isStartingBot || botStatus === 'running' || botConnectionStatus === 'connected'}
                        className={`px-4 py-2 text-sm font-medium rounded-md shadow-sm text-white ${
                          isStartingBot || botStatus === 'running' || botConnectionStatus === 'connected'
                            ? 'bg-gray-600 cursor-not-allowed'
                            : 'bg-green-600 hover:bg-green-700'
                        }`}
                      >
                        {isStartingBot ? 'Starting...' : 'Start Bot'}
                      </button>
                      
                      <button
                        type="button"
                        onClick={stopBot}
                        disabled={isStoppingBot || botStatus === 'stopped'}
                        className={`px-4 py-2 text-sm font-medium rounded-md shadow-sm text-white ${
                          isStoppingBot || botStatus === 'stopped'
                            ? 'bg-gray-600 cursor-not-allowed'
                            : 'bg-red-600 hover:bg-red-700'
                        }`}
                      >
                        {isStoppingBot ? 'Stopping...' : 'Stop Bot'}
                      </button>
                    </>
                  )}
                  
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab('edit');
                      resetConfigForm();
                    }}
                    className="px-4 py-2 text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
                  >
                    Add Configuration
                  </button>
                </div>
              </div>
              
              {prReviewBotConfigs.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-400">No PR Review Bot configurations yet.</p>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab('edit');
                      resetConfigForm();
                    }}
                    className="mt-4 px-4 py-2 text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
                  >
                    Add your first configuration
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {prReviewBotConfigs.map(config => (
                    <div
                      key={config.id}
                      className={`p-4 rounded-lg border ${
                        activePRReviewBotConfigId === config.id
                          ? 'border-indigo-500 bg-gray-800'
                          : 'border-gray-700 bg-gray-800/50'
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <h5 className="text-md font-medium text-gray-200">{config.name}</h5>
                          <div className="mt-1 text-sm text-gray-400">
                            <div className="flex items-center space-x-2">
                              <span>GitHub Token:</span>
                              <span className="px-2 py-0.5 rounded bg-gray-700 text-gray-300">
                                {config.githubToken ? config.githubToken.substring(0, 3) + '***' : 'Not set'}
                              </span>
                            </div>
                            <div className="flex items-center space-x-2 mt-1">
                              <span>AI Provider:</span>
                              <span className="px-2 py-0.5 rounded bg-gray-700 text-gray-300">
                                {config.anthropic_api_key ? 'Anthropic' : config.openai_api_key ? 'OpenAI' : 'Not set'}
                              </span>
                            </div>
                            <div className="flex items-center space-x-2 mt-1">
                              <span>Auto Merge:</span>
                              <span className={`px-2 py-0.5 rounded ${
                                config.auto_review
                                  ? 'bg-green-900 text-green-200'
                                  : 'bg-gray-700 text-gray-300'
                              }`}>
                                {config.auto_review ? 'Enabled' : 'Disabled'}
                              </span>
                            </div>
                            <div className="flex items-center space-x-2 mt-1">
                              <span>Monitor All Repos:</span>
                              <span className={`px-2 py-0.5 rounded ${
                                config.setup_all_repos_webhooks
                                  ? 'bg-green-900 text-green-200'
                                  : 'bg-gray-700 text-gray-300'
                              }`}>
                                {config.setup_all_repos_webhooks ? 'Enabled' : 'Disabled'}
                              </span>
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex space-x-2">
                          <button
                            type="button"
                            onClick={() => handleSetActiveConfig(config.id)}
                            disabled={activePRReviewBotConfigId === config.id}
                            className={`px-3 py-1 text-xs font-medium rounded-md ${
                              activePRReviewBotConfigId === config.id
                                ? 'bg-gray-600 text-gray-300 cursor-not-allowed'
                                : 'bg-indigo-600 text-white hover:bg-indigo-700'
                            }`}
                          >
                            {activePRReviewBotConfigId === config.id ? 'Active' : 'Set Active'}
                          </button>
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
          
          {activeTab === 'edit' && (
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
              
              <div>
                <label htmlFor="instructions" className="block text-sm font-medium text-gray-300">
                  Instructions
                </label>
                <textarea
                  id="instructions"
                  value={instructions}
                  onChange={(e) => setInstructions(e.target.value)}
                  rows={4}
                  className="mt-1 block w-full rounded-md bg-gray-800 border-gray-700 text-gray-100 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  placeholder="Custom instructions for the PR review bot..."
                />
                <p className="mt-1 text-xs text-gray-400">
                  Custom instructions to guide the PR review process
                </p>
              </div>
              
              <div className="space-y-3">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={autoMerge}
                    onChange={(e) => setAutoMerge(e.target.checked)}
                    className="rounded bg-gray-800 border-gray-700 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="ml-2 text-sm text-gray-300">Auto Merge</span>
                </label>
                <p className="text-xs text-gray-400 ml-6">
                  When enabled, PRs will be automatically merged after review. When disabled, a dialog will appear with merge/decline options.
                </p>
                
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={monitorAllRepos}
                    onChange={(e) => setMonitorAllRepos(e.target.checked)}
                    className="rounded bg-gray-800 border-gray-700 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="ml-2 text-sm text-gray-300">Monitor All Repositories</span>
                </label>
                <p className="text-xs text-gray-400 ml-6">
                  When enabled, webhooks will be set up for all repositories in your account.
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
                    setActiveTab('configuration');
                  }}
                  className="w-full px-4 py-2 text-sm font-medium text-gray-300 hover:text-white"
                >
                  Cancel Editing
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PRReviewBotSettingsPanel;
