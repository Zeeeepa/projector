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
  const [webhookSecret, setWebhookSecret] = useState('');
  const [githubToken, setGithubToken] = useState(apiSettings.githubToken || '');
  const [autoReview, setAutoReview] = useState(true);
  const [monitorBranches, setMonitorBranches] = useState(true);
  const [setupAllReposWebhooks, setSetupAllReposWebhooks] = useState(true);
  const [validateDocumentation, setValidateDocumentation] = useState(true);
  const [documentationFiles, setDocumentationFiles] = useState('STRUCTURE.md,STEP-BY-STEP.md');
  const [anthropicApiKey, setAnthropicApiKey] = useState('');
  const [openaiApiKey, setOpenaiApiKey] = useState('');
  const [slackBotToken, setSlackBotToken] = useState('');
  const [slackChannel, setSlackChannel] = useState('');
  
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
        setWebhookSecret(activeConfig.webhookSecret);
        setGithubToken(activeConfig.githubToken);
        setAutoReview(activeConfig.autoReview);
        setMonitorBranches(activeConfig.monitorBranches);
        setSetupAllReposWebhooks(activeConfig.setupAllReposWebhooks);
        setValidateDocumentation(activeConfig.validateDocumentation);
        setDocumentationFiles(activeConfig.documentationFiles.join(','));
        setAnthropicApiKey(activeConfig.anthropicApiKey || '');
        setOpenaiApiKey(activeConfig.openaiApiKey || '');
        setSlackBotToken(activeConfig.slackBotToken || '');
        setSlackChannel(activeConfig.slackChannel || '');
        
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
    setWebhookSecret('');
    setGithubToken(apiSettings.githubToken || '');
    setAutoReview(true);
    setMonitorBranches(true);
    setSetupAllReposWebhooks(true);
    setValidateDocumentation(true);
    setDocumentationFiles('STRUCTURE.md,STEP-BY-STEP.md');
    setAnthropicApiKey('');
    setOpenaiApiKey('');
    setSlackBotToken('');
    setSlackChannel('');
    setTestResult(null);
  };
  
  const handleSaveConfig = () => {
    if (!configName || !webhookSecret || !githubToken) {
      alert('Configuration name, webhook secret, and GitHub token are required');
      return;
    }
    
    const configData: Omit<PRReviewBotConfig, 'id'> = {
      name: configName,
      webhookSecret,
      githubToken,
      autoReview,
      monitorBranches,
      setupAllReposWebhooks,
      validateDocumentation,
      documentationFiles: documentationFiles.split(',').map(file => file.trim()),
      anthropicApiKey: anthropicApiKey || undefined,
      openaiApiKey: openaiApiKey || undefined,
      slackBotToken: slackBotToken || undefined,
      slackChannel: slackChannel || undefined,
      isVerified: testResult?.success || false
    };
    
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
    setWebhookSecret(config.webhookSecret);
    setGithubToken(config.githubToken);
    setAutoReview(config.autoReview);
    setMonitorBranches(config.monitorBranches);
    setSetupAllReposWebhooks(config.setupAllReposWebhooks);
    setValidateDocumentation(config.validateDocumentation);
    setDocumentationFiles(config.documentationFiles.join(','));
    setAnthropicApiKey(config.anthropicApiKey || '');
    setOpenaiApiKey(config.openaiApiKey || '');
    setSlackBotToken(config.slackBotToken || '');
    setSlackChannel(config.slackChannel || '');
    
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
    if (!webhookSecret || !githubToken) return;
    
    setIsTesting(true);
    setTestResult(null);
    
    try {
      // Create a temporary config for testing
      const tempConfig: Partial<PRReviewBotConfig> = {
        webhookSecret,
        githubToken,
        autoReview,
        monitorBranches,
        setupAllReposWebhooks,
        validateDocumentation,
        documentationFiles: documentationFiles.split(',').map(file => file.trim()),
        anthropicApiKey: anthropicApiKey || undefined,
        openaiApiKey: openaiApiKey || undefined,
        slackBotToken: slackBotToken || undefined,
        slackChannel: slackChannel || undefined
      };
      
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
                        <p>Webhook Secret: {config.webhookSecret.substring(0, 3)}***</p>
                        <p>Auto Review: {config.autoReview ? 'Yes' : 'No'}</p>
                        <p>Monitor Branches: {config.monitorBranches ? 'Yes' : 'No'}</p>
                        <p>Setup All Repos Webhooks: {config.setupAllReposWebhooks ? 'Yes' : 'No'}</p>
                        <p>Validate Documentation: {config.validateDocumentation ? 'Yes' : 'No'}</p>
                        <p>Documentation Files: {config.documentationFiles.join(', ')}</p>
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <button
                        type="button"
                        onClick={() => handleSetActiveConfig(config.id)}
                        className={`px-3 py-1 text-xs font-medium rounded-md ${
                          activePRReviewBotConfigId === config.id
                            ? 'bg-indigo-700 text-white cursor-default'
                            : 'bg-indigo-600 text-white hover:bg-indigo-700'
                        }`}
                        disabled={activePRReviewBotConfigId === config.id}
                      >
                        {activePRReviewBotConfigId === config.id ? 'Active' : 'Use'}
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
            <label htmlFor="webhookSecret" className="block text-sm font-medium text-gray-300">
              GitHub Webhook Secret
            </label>
            <input
              type="text"
              id="webhookSecret"
              value={webhookSecret}
              onChange={(e) => setWebhookSecret(e.target.value)}
              className="mt-1 block w-full rounded-md bg-gray-800 border-gray-700 text-gray-100 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              placeholder="Enter webhook secret"
            />
            <p className="mt-1 text-xs text-gray-400">
              Secret used to verify webhook requests from GitHub
            </p>
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
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={autoReview}
                  onChange={(e) => setAutoReview(e.target.checked)}
                  className="rounded bg-gray-800 border-gray-700 text-indigo-600 focus:ring-indigo-500"
                />
                <span className="ml-2 text-sm text-gray-300">Auto Review PRs</span>
              </label>
            </div>
            
            <div>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={monitorBranches}
                  onChange={(e) => setMonitorBranches(e.target.checked)}
                  className="rounded bg-gray-800 border-gray-700 text-indigo-600 focus:ring-indigo-500"
                />
                <span className="ml-2 text-sm text-gray-300">Monitor Branch Creation</span>
              </label>
            </div>
            
            <div>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={setupAllReposWebhooks}
                  onChange={(e) => setSetupAllReposWebhooks(e.target.checked)}
                  className="rounded bg-gray-800 border-gray-700 text-indigo-600 focus:ring-indigo-500"
                />
                <span className="ml-2 text-sm text-gray-300">Setup Webhooks for All Repos</span>
              </label>
            </div>
            
            <div>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={validateDocumentation}
                  onChange={(e) => setValidateDocumentation(e.target.checked)}
                  className="rounded bg-gray-800 border-gray-700 text-indigo-600 focus:ring-indigo-500"
                />
                <span className="ml-2 text-sm text-gray-300">Validate Documentation</span>
              </label>
            </div>
          </div>
          
          <div>
            <label htmlFor="documentationFiles" className="block text-sm font-medium text-gray-300">
              Documentation Files
            </label>
            <input
              type="text"
              id="documentationFiles"
              value={documentationFiles}
              onChange={(e) => setDocumentationFiles(e.target.value)}
              className="mt-1 block w-full rounded-md bg-gray-800 border-gray-700 text-gray-100 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              placeholder="STRUCTURE.md,STEP-BY-STEP.md"
            />
            <p className="mt-1 text-xs text-gray-400">
              Comma-separated list of documentation files to validate against
            </p>
          </div>
          
          <div className="border-t border-gray-700 pt-4">
            <h4 className="text-sm font-medium text-gray-300 mb-2">AI Provider Configuration (Optional)</h4>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="anthropicApiKey" className="block text-sm font-medium text-gray-300">
                  Anthropic API Key
                </label>
                <input
                  type="text"
                  id="anthropicApiKey"
                  value={anthropicApiKey}
                  onChange={(e) => setAnthropicApiKey(e.target.value)}
                  className="mt-1 block w-full rounded-md bg-gray-800 border-gray-700 text-gray-100 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  placeholder="Enter Anthropic API key"
                />
              </div>
              
              <div>
                <label htmlFor="openaiApiKey" className="block text-sm font-medium text-gray-300">
                  OpenAI API Key
                </label>
                <input
                  type="text"
                  id="openaiApiKey"
                  value={openaiApiKey}
                  onChange={(e) => setOpenaiApiKey(e.target.value)}
                  className="mt-1 block w-full rounded-md bg-gray-800 border-gray-700 text-gray-100 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  placeholder="Enter OpenAI API key"
                />
              </div>
            </div>
          </div>
          
          <div className="border-t border-gray-700 pt-4">
            <h4 className="text-sm font-medium text-gray-300 mb-2">Slack Configuration (Optional)</h4>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="slackBotToken" className="block text-sm font-medium text-gray-300">
                  Slack Bot Token
                </label>
                <input
                  type="text"
                  id="slackBotToken"
                  value={slackBotToken}
                  onChange={(e) => setSlackBotToken(e.target.value)}
                  className="mt-1 block w-full rounded-md bg-gray-800 border-gray-700 text-gray-100 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  placeholder="Enter Slack bot token"
                />
              </div>
              
              <div>
                <label htmlFor="slackChannel" className="block text-sm font-medium text-gray-300">
                  Slack Channel
                </label>
                <input
                  type="text"
                  id="slackChannel"
                  value={slackChannel}
                  onChange={(e) => setSlackChannel(e.target.value)}
                  className="mt-1 block w-full rounded-md bg-gray-800 border-gray-700 text-gray-100 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  placeholder="Enter Slack channel"
                />
              </div>
            </div>
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
              disabled={isTesting || !webhookSecret || !githubToken}
            >
              {isTesting ? 'Testing...' : 'Test Connection'}
            </button>
            
            <button
              type="button"
              onClick={handleSaveConfig}
              className="px-4 py-2 text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 flex-1"
              disabled={!configName || !webhookSecret || !githubToken}
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
