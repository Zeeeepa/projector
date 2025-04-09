import React, { useState } from 'react';
import { useProjectStore } from '../store';

interface ProjectDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ProjectDialog({ isOpen, onClose }: ProjectDialogProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [githubUrl, setGithubUrl] = useState('');
  const [slackChannel, setSlackChannel] = useState('');
  const [error, setError] = useState<string | null>(null);
  
  const { addProject } = useProjectStore();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name) {
      setError('Project name is required');
      return;
    }

    setError(null);

    try {
      // Add project to the store directly without fetching anything
      addProject({
        name,
        description,
        githubUrl,
        slackChannel,
        threads: 2 // Default value, can be changed in project tab
      });

      // Reset form and close dialog
      resetForm();
      onClose();
    } catch (err) {
      console.error('Error creating project:', err);
      setError(err instanceof Error ? err.message : 'Failed to create project');
    }
  };

  const resetForm = () => {
    setName('');
    setDescription('');
    setGithubUrl('');
    setSlackChannel('');
    setError(null);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
      <div className="bg-gray-900 rounded-lg shadow-xl w-full max-w-md p-6 border border-gray-700">
        <h2 className="text-xl font-semibold text-gray-100 mb-4">Add New Project</h2>
        
        {error && (
          <div className="mb-4 p-2 bg-red-900 text-red-100 rounded">
            {error}
          </div>
        )}
        
        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-300">
                Project Name
              </label>
              <input
                type="text"
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1 block w-full rounded-md bg-gray-800 border-gray-700 text-gray-100 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                required
              />
            </div>
            
            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-300">
                Description
              </label>
              <textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="mt-1 block w-full rounded-md bg-gray-800 border-gray-700 text-gray-100 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
              <p className="mt-1 text-xs text-gray-400">
                This will be used as the context reference for the project
              </p>
            </div>
            
            <div>
              <label htmlFor="githubUrl" className="block text-sm font-medium text-gray-300">
                GitHub URL
              </label>
              <input
                type="url"
                id="githubUrl"
                value={githubUrl}
                onChange={(e) => setGithubUrl(e.target.value)}
                className="mt-1 block w-full rounded-md bg-gray-800 border-gray-700 text-gray-100 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                placeholder="https://github.com/username/repo"
              />
            </div>
            
            <div>
              <label htmlFor="slackChannel" className="block text-sm font-medium text-gray-300">
                Slack Channel ID
              </label>
              <input
                type="text"
                id="slackChannel"
                value={slackChannel}
                onChange={(e) => setSlackChannel(e.target.value)}
                className="mt-1 block w-full rounded-md bg-gray-800 border-gray-700 text-gray-100 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                placeholder="e.g. C01234ABCDE"
              />
              <p className="mt-1 text-xs text-gray-400">
                Find this in Slack by right-clicking on a channel and selecting "Copy Link"
              </p>
            </div>
          </div>
          
          <div className="mt-6 flex justify-end space-x-3">
            <button
              type="button"
              onClick={() => {
                resetForm();
                onClose();
              }}
              className="px-4 py-2 text-sm font-medium text-gray-300 hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
            >
              Create Project
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
