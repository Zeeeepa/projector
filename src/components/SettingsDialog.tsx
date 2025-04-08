import React, { useState, useEffect } from 'react';
import { useProjectStore } from '../store';
import { apiService } from '../services/api';

interface SettingsDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SettingsDialog({ isOpen, onClose }: SettingsDialogProps) {
  const { apiSettings, updateAPISettings } = useProjectStore();
  
  const [apiKey, setApiKey] = useState(apiSettings.apiKey);
  const [apiBaseUrl, setApiBaseUrl] = useState(apiSettings.apiBaseUrl);
  const [model, setModel] = useState(apiSettings.model);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  useEffect(() => {
    setApiKey(apiSettings.apiKey);
    setApiBaseUrl(apiSettings.apiBaseUrl);
    setModel(apiSettings.model);
  }, [apiSettings]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    updateAPISettings({
      apiKey,
      apiBaseUrl,
      model
    });
    
    apiService.updateSettings({
      apiKey,
      apiBaseUrl
    });
    
    onClose();
  };

  const testConnection = async () => {
    setIsTesting(true);
    setTestResult(null);
    
    try {
      apiService.updateSettings({
        apiKey,
        apiBaseUrl
      });
      
      await fetch(`${apiBaseUrl}/api/health`, {
        method: 'GET',
        headers: apiKey ? { 'Authorization': `Bearer ${apiKey}` } : {}
      }).then(async (response) => {
        if (response.ok) {
          setTestResult({
            success: true,
            message: 'Connection successful! API is responding.'
          });
        } else {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.detail || `API error: ${response.status}`);
        }
      });
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
      <div className="bg-gray-800 rounded-lg shadow-xl w-full max-w-md p-6">
        <h2 className="text-xl font-semibold text-gray-100 mb-4">API Settings</h2>
        
        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label htmlFor="apiKey" className="block text-sm font-medium text-gray-300">
                API Key
              </label>
              <input
                type="password"
                id="apiKey"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="mt-1 block w-full rounded-md bg-gray-700 border-gray-600 text-gray-100 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                placeholder="Enter your API key"
              />
            </div>
            
            <div>
              <label htmlFor="apiBaseUrl" className="block text-sm font-medium text-gray-300">
                API Base URL
              </label>
              <input
                type="url"
                id="apiBaseUrl"
                value={apiBaseUrl}
                onChange={(e) => setApiBaseUrl(e.target.value)}
                className="mt-1 block w-full rounded-md bg-gray-700 border-gray-600 text-gray-100 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                placeholder="http://localhost:8000"
              />
            </div>
            
            <div>
              <label htmlFor="model" className="block text-sm font-medium text-gray-300">
                AI Model
              </label>
              <select
                id="model"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                className="mt-1 block w-full rounded-md bg-gray-700 border-gray-600 text-gray-100 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              >
                <option value="gpt-4">GPT-4</option>
                <option value="gpt-4-turbo">GPT-4 Turbo</option>
                <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
                <option value="claude-3-opus">Claude 3 Opus</option>
                <option value="claude-3-sonnet">Claude 3 Sonnet</option>
                <option value="claude-3-haiku">Claude 3 Haiku</option>
              </select>
            </div>
            
            {testResult && (
              <div className={`p-3 rounded-md ${testResult.success ? 'bg-green-900 text-green-100' : 'bg-red-900 text-red-100'}`}>
                {testResult.message}
              </div>
            )}
            
            <div className="flex justify-between">
              <button
                type="button"
                onClick={testConnection}
                className={`px-4 py-2 text-sm font-medium rounded-md shadow-sm text-white ${
                  isTesting ? 'bg-gray-500 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
                }`}
                disabled={isTesting || !apiBaseUrl}
              >
                {isTesting ? 'Testing...' : 'Test Connection'}
              </button>
              
              <div className="flex space-x-3">
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
        </form>
      </div>
    </div>
  );
}