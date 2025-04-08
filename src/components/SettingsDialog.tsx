import React, { useState } from 'react';
import { useProjectStore } from '../store';

interface SettingsDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SettingsDialog({ isOpen, onClose }: SettingsDialogProps) {
  const { apiSettings, updateAPISettings } = useProjectStore();
  const [settings, setSettings] = useState(apiSettings);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateAPISettings(settings);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
      <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md">
        <h2 className="text-xl font-bold mb-4 text-gray-100">API Settings</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300">API Key</label>
            <input
              type="password"
              value={settings.apiKey}
              onChange={(e) => setSettings({ ...settings, apiKey: e.target.value })}
              className="mt-1 block w-full rounded-md bg-gray-700 border-gray-600 text-gray-100 px-3 py-2"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300">API Base URL (Optional)</label>
            <input
              type="url"
              value={settings.apiBaseUrl}
              onChange={(e) => setSettings({ ...settings, apiBaseUrl: e.target.value })}
              className="mt-1 block w-full rounded-md bg-gray-700 border-gray-600 text-gray-100 px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300">Model</label>
            <select
              value={settings.model}
              onChange={(e) => setSettings({ ...settings, model: e.target.value })}
              className="mt-1 block w-full rounded-md bg-gray-700 border-gray-600 text-gray-100 px-3 py-2"
            >
              <option value="gpt-4">GPT-4</option>
              <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
              <option value="claude-v2">Claude V2</option>
            </select>
          </div>
          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-300 hover:text-gray-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700"
            >
              Save Settings
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}