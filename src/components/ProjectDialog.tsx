import React, { useState, useEffect } from 'react';
import { useProjectStore } from '../store';
import { apiService } from '../services/api';
import { GitHubRepository } from '../types';

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
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingRepos, setIsLoadingRepos] = useState(false);
  const [selectedRepo, setSelectedRepo] = useState<string>('');
  const [selectedMarkdownFiles, setSelectedMarkdownFiles] = useState<string[]>([]);
  const [availableMarkdownFiles, setAvailableMarkdownFiles] = useState<string[]>([]);
  const [markdownContent, setMarkdownContent] = useState<Record<string, string>>({});
  
  const { 
    addProject, 
    apiSettings, 
    githubRepositories, 
    setGithubRepositories 
  } = useProjectStore();

  useEffect(() => {
    if (isOpen && apiSettings.githubToken && githubRepositories.length === 0) {
      fetchGitHubRepositories();
    }
  }, [isOpen, apiSettings.githubToken, githubRepositories.length]);

  useEffect(() => {
    if (selectedRepo) {
      fetchMarkdownFiles(selectedRepo);
    } else {
      setAvailableMarkdownFiles([]);
      setSelectedMarkdownFiles([]);
      setMarkdownContent({});
    }
  }, [selectedRepo]);

  const fetchGitHubRepositories = async () => {
    if (!apiSettings.githubToken) {
      setError('GitHub token is required. Please add it in Settings.');
      return;
    }

    setIsLoadingRepos(true);
    setError(null);

    try {
      apiService.updateSettings(apiSettings);
      const repositories = await apiService.fetchGitHubRepositories();
      setGithubRepositories(repositories);
    } catch (err) {
      console.error('Error fetching GitHub repositories:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch GitHub repositories');
    } finally {
      setIsLoadingRepos(false);
    }
  };

  const fetchMarkdownFiles = async (repoFullName: string) => {
    setIsLoading(true);
    setError(null);

    try {
      apiService.updateSettings(apiSettings);
      const files = await apiService.fetchGitHubMarkdownFiles(repoFullName);
      setAvailableMarkdownFiles(files);
    } catch (err) {
      console.error('Error fetching markdown files:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch markdown files');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchMarkdownContent = async (repoFullName: string, filePath: string) => {
    setIsLoading(true);
    setError(null);

    try {
      apiService.updateSettings(apiSettings);
      const content = await apiService.fetchGitHubFileContent(repoFullName, filePath);
      setMarkdownContent(prev => ({
        ...prev,
        [filePath]: content
      }));
    } catch (err) {
      console.error('Error fetching markdown content:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch markdown content');
    } finally {
      setIsLoading(false);
    }
  };

  const handleMarkdownFileToggle = async (filePath: string) => {
    if (selectedMarkdownFiles.includes(filePath)) {
      setSelectedMarkdownFiles(prev => prev.filter(f => f !== filePath));
    } else {
      setSelectedMarkdownFiles(prev => [...prev, filePath]);
      
      if (!markdownContent[filePath] && selectedRepo) {
        await fetchMarkdownContent(selectedRepo, filePath);
      }
    }
  };

  const handleRepoSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const repoFullName = e.target.value;
    setSelectedRepo(repoFullName);
    
    if (repoFullName) {
      const repo = githubRepositories.find(r => r.full_name === repoFullName);
      if (repo) {
        setName(repo.name);
        setGithubUrl(repo.url);
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name) {
      setError('Project name is required');
      return;
    }

    setError(null);

    try {
      let combinedDescription = description;
      
      if (selectedMarkdownFiles.length > 0) {
        combinedDescription += '\n\n--- GitHub Documentation ---\n\n';
        
        selectedMarkdownFiles.forEach(filePath => {
          if (markdownContent[filePath]) {
            combinedDescription += `## ${filePath}\n\n${markdownContent[filePath]}\n\n`;
          }
        });
      }

      addProject({
        name,
        description: combinedDescription,
        githubUrl,
        slackChannel,
        threads: 2 // Default value, can be changed in project tab
      });

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
    setSelectedRepo('');
    setSelectedMarkdownFiles([]);
    setAvailableMarkdownFiles([]);
    setMarkdownContent({});
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
      <div className="bg-gray-900 rounded-lg shadow-xl w-full max-w-4xl p-6 border border-gray-700 max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-semibold text-gray-100 mb-4">Add New Project</h2>
        
        {error && (
          <div className="mb-4 p-2 bg-red-900 text-red-100 rounded">
            {error}
          </div>
        )}
        
        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
              
              <div className="space-y-4">
                <div>
                  <label htmlFor="githubRepo" className="block text-sm font-medium text-gray-300">
                    Select GitHub Repository
                  </label>
                  <div className="flex items-center space-x-2">
                    <select
                      id="githubRepo"
                      value={selectedRepo}
                      onChange={handleRepoSelect}
                      className="mt-1 block w-full rounded-md bg-gray-800 border-gray-700 text-gray-100 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      disabled={isLoadingRepos}
                    >
                      <option value="">Select a repository</option>
                      {githubRepositories.map((repo) => (
                        <option key={repo.id} value={repo.full_name}>
                          {repo.full_name} {repo.private ? '(Private)' : ''}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={fetchGitHubRepositories}
                      className="mt-1 px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      disabled={isLoadingRepos || !apiSettings.githubToken}
                    >
                      {isLoadingRepos ? 'Loading...' : 'Refresh'}
                    </button>
                  </div>
                  {!apiSettings.githubToken && (
                    <p className="mt-1 text-xs text-red-400">
                      GitHub token is required. Please add it in Settings.
                    </p>
                  )}
                </div>
                
                {selectedRepo && (
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Select Markdown Files to Include
                    </label>
                    {isLoading ? (
                      <div className="text-gray-400 text-sm">Loading markdown files...</div>
                    ) : availableMarkdownFiles.length > 0 ? (
                      <div className="max-h-60 overflow-y-auto border border-gray-700 rounded-md p-2 bg-gray-800">
                        {availableMarkdownFiles.map((file) => (
                          <div key={file} className="flex items-center py-1">
                            <input
                              type="checkbox"
                              id={`file-${file}`}
                              checked={selectedMarkdownFiles.includes(file)}
                              onChange={() => handleMarkdownFileToggle(file)}
                              className="mr-2 rounded bg-gray-700 border-gray-600 text-blue-500 focus:ring-blue-500"
                            />
                            <label htmlFor={`file-${file}`} className="text-gray-300 text-sm">
                              {file}
                            </label>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-gray-400 text-sm">No markdown files found in this repository.</div>
                    )}
                  </div>
                )}
                
                {selectedMarkdownFiles.length > 0 && (
                  <div>
                    <p className="text-sm text-gray-300">
                      Selected {selectedMarkdownFiles.length} markdown file(s). These will be included in the project context.
                    </p>
                  </div>
                )}
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
                disabled={isLoading || isLoadingRepos}
              >
                Create Project
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
