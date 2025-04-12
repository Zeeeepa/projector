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
  
  const [editingConfigId, setEditingConfigId] = useState<string | null>(null);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [activeTab, setActiveTab] = useState<'saved_configs' | 'new_config'>('saved_configs');
  
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
        
        // Determine AI provider and set the appropriate key
        if (activeConfig.anthropicApiKey) {
          setAiProvider('anthropic');
          setAiApiKey(activeConfig.anthropicApiKey);
        } else if (activeConfig.openaiApiKey) {
          setAiProvider('openai');
          setAiApiKey(activeConfig.openaiApiKey);
        }
        
        // Set active config in service
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
    setTestResult(null);
  };
  
  const handleSaveConfig = () => {
    if (!configName || !githubToken || !aiApiKey) {
      alert('Configuration name, GitHub token, and AI API key are required');
      return;
    }
    
    // Create a simplified config with only the required fields
    const configData: Omit<PRReviewBotConfig, 'id'> = {
      name: configName,
      githubToken,
      webhookSecret: 'auto-generated', // Auto-generated on the server
      autoReview: true,
      monitorBranches: true,
      setupAllReposWebhooks: true,
      validateDocumentation: true,
      documentationFiles: ['STRUCTURE.md', 'STEP-BY-STEP.md'],
      isVerified: testResult?.success || false
    };
    
    // Set the appropriate AI API key based on the selected provider
    if (aiProvider === 'anthropic') {
      configData.anthropicApiKey = aiApiKey;
    } else {
      configData.openaiApiKey = aiApiKey;
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
    
    // Determine AI provider and set the appropriate key
    if (config.anthropicApiKey) {
      setAiProvider('anthropic');
      setAiApiKey(config.anthropicApiKey || '');
    } else if (config.openaiApiKey) {
      setAiProvider('openai');
      setAiApiKey(config.openaiApiKey || '');
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
        webhookSecret: 'auto-generated',
        autoReview: true,
        monitorBranches: true,
        setupAllReposWebhooks: true,
        validateDocumentation: true,
        documentationFiles: ['STRUCTURE.md', 'STEP-BY-STEP.md']
      };
      
      // Set the appropriate AI API key based on the selected provider
      if (aiProvider === 'anthropic') {
        tempConfig.anthropicApiKey = aiApiKey;
      } else {
        tempConfig.openaiApiKey = aiApiKey;
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
                        <p>AI Provider: {config.anthropicApiKey ? 'Anthropic' : 'OpenAI'}</p>
                        <p>Auto Review: {config.autoReview ? 'Yes' : 'No'}</p>
                        <p>Monitor Branches: {config.monitorBranches ? 'Yes' : 'No'}</p>
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <button
                        type="button"
                        onClick={() => handleSetActiveConfig(config.id)}
                        className={`px-3 py-1 text-xs font-medium rounded-md ${
                          activePRReviewBotConfigId === config.id
                            ? 'bg-indigo-700 text-white'
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
            <label htmlFor="aiProvider" className="block text-sm font-medium text-gray-300">
              AI Provider
            </label>
            <select
              id="aiProvider"
              value={aiProvider}
              onChange={(e) => setAiProvider(e.target.value as 'anthropic' | 'openai')}
              className="mt-1 block w-full rounded-md bg-gray-800 border-gray-700 text-gray-100 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            >
              <option value="anthropic">Anthropic (Claude)</option>
              <option value="openai">OpenAI (GPT)</option>
            </select>
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
              API key for {aiProvider === 'anthropic' ? 'Anthropic Claude' : 'OpenAI GPT'} models
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
