import React, { useState, useEffect } from 'react';
import { useProjectStore } from '../store';
import { apiService } from '../services/api';

interface ProjectDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

interface GithubRepo {
  name: string;
  full_name: string;
  description: string | null;
  initialized?: boolean;
}

export function ProjectDialog({ isOpen, onClose }: ProjectDialogProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [githubUrl, setGithubUrl] = useState('');
  const [slackChannel, setSlackChannel] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [githubRepos, setGithubRepos] = useState<GithubRepo[]>([]);
  const [selectedRepo, setSelectedRepo] = useState<string>('');
  const [checkingInitialization, setCheckingInitialization] = useState(false);
  
  const { addProject, apiSettings } = useProjectStore();

  useEffect(() => {
    if (isOpen && apiSettings.githubToken) {
      fetchGithubRepos();
    }
  }, [isOpen, apiSettings.githubToken]);

  const fetchGithubRepos = async () => {
    try {
      setLoading(true);
      setError(null);
      const repos = await apiService.getGitHubRepositories();
      
      const reposWithInitStatus = await Promise.all(
        repos.map(async (repo) => {
          try {
            const initStatus = await checkRepoInitialization(repo.full_name);
            return { ...repo, initialized: initStatus };
          } catch (err) {
            console.error(`Error checking initialization for ${repo.full_name}:`, err);
            return { ...repo, initialized: false };
          }
        })
      );
      
      setGithubRepos(reposWithInitStatus);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching GitHub repositories:', error);
      setError('Failed to fetch GitHub repositories. Please check your GitHub token in settings.');
      setLoading(false);
    }
  };

  const checkRepoInitialization = async (repoFullName: string): Promise<boolean> => {
    try {
      const files = ['README.md', 'STRUCTURE.md', 'STEP-BY-STEP.md'];
      const results = await Promise.all(
        files.map(async (file) => {
          try {
            const response = await fetch(`https://api.github.com/repos/${repoFullName}/contents/${file}`, {
              headers: {
                'Authorization': `token ${apiSettings.githubToken}`,
                'Accept': 'application/vnd.github+json'
              }
            });
            return response.ok;
          } catch (err) {
            return false;
          }
        })
      );
      
      return results.every(exists => exists);
    } catch (error) {
      console.error(`Error checking initialization for ${repoFullName}:`, error);
      return false;
    }
  };

  const initializeRepository = async (repoFullName: string) => {
    try {
      setCheckingInitialization(true);
      setError(null);
      
      const files = ['README.md', 'STRUCTURE.md', 'STEP-BY-STEP.md'];
      const fileExistence = await Promise.all(
        files.map(async (file) => {
          try {
            const response = await fetch(`https://api.github.com/repos/${repoFullName}/contents/${file}`, {
              headers: {
                'Authorization': `token ${apiSettings.githubToken}`,
                'Accept': 'application/vnd.github+json'
              }
            });
            return { file, exists: response.ok };
          } catch (err) {
            return { file, exists: false };
          }
        })
      );
      
      const filesToCreate = fileExistence.filter(f => !f.exists).map(f => f.file);
      
      if (filesToCreate.length === 0) {
        setCheckingInitialization(false);
        return true;
      }
      
      await Promise.all(
        filesToCreate.map(async (file) => {
          const content = getDefaultFileContent(file);
          const encodedContent = btoa(content);
          
          const response = await fetch(`https://api.github.com/repos/${repoFullName}/contents/${file}`, {
            method: 'PUT',
            headers: {
              'Authorization': `token ${apiSettings.githubToken}`,
              'Accept': 'application/vnd.github+json',
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              message: `Initialize project with ${file}`,
              content: encodedContent
            })
          });
          
          if (!response.ok) {
            throw new Error(`Failed to create ${file}: ${response.statusText}`);
          }
          
          return response.ok;
        })
      );
      
      setGithubRepos(prevRepos => 
        prevRepos.map(repo => 
          repo.full_name === repoFullName ? { ...repo, initialized: true } : repo
        )
      );
      
      setCheckingInitialization(false);
      return true;
    } catch (error) {
      console.error(`Error initializing repository ${repoFullName}:`, error);
      setError(`Failed to initialize repository: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setCheckingInitialization(false);
      return false;
    }
  };

  const getDefaultFileContent = (fileName: string): string => {
    switch (fileName) {
      case 'README.md':
        return `# ${selectedRepo.split('/')[1] || 'Project'}\n\nThis is the README file for the project.\n`;
      case 'STRUCTURE.md':
        return `# Project Structure\n\nThis document outlines the structure of the project.\n`;
      case 'STEP-BY-STEP.md':
        return `# Step-by-Step Development Guide\n\nThis document provides a step-by-step guide for developing this project.\n`;
      default:
        return '';
    }
  };

  const handleRepoSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const repoName = e.target.value;
    setSelectedRepo(repoName);
    
    if (repoName) {
      const repo = githubRepos.find(r => r.full_name === repoName);
      if (repo) {
        setGithubUrl(`https://github.com/${repo.full_name}`);
        if (!name) {
          setName(repo.name);
        }
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
      addProject({
        name,
        description,
        githubUrl,
        slackChannel,
        threads: 2,
        initialized: selectedRepo ? githubRepos.find(r => r.full_name === selectedRepo)?.initialized || false : false
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
    setSelectedRepo('');
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
              <label htmlFor="githubRepo" className="block text-sm font-medium text-gray-300">
                GitHub Repository
              </label>
              {loading ? (
                <div className="mt-1 text-gray-400">Loading repositories...</div>
              ) : githubRepos.length > 0 ? (
                <>
                  <select
                    id="githubRepo"
                    value={selectedRepo}
                    onChange={handleRepoSelect}
                    className="mt-1 block w-full rounded-md bg-gray-800 border-gray-700 text-gray-100 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  >
                    <option value="">Select a repository</option>
                    {githubRepos.map(repo => (
                      <option key={repo.full_name} value={repo.full_name}>
                        {repo.full_name} {repo.initialized ? '(Initialized)' : ''}
                      </option>
                    ))}
                  </select>
                  
                  {selectedRepo && (
                    <div className="mt-2">
                      {checkingInitialization ? (
                        <div className="text-blue-400">Checking repository...</div>
                      ) : githubRepos.find(r => r.full_name === selectedRepo)?.initialized ? (
                        <div className="text-green-400">✓ Repository is initialized with required files</div>
                      ) : (
                        <div className="flex items-center">
                          <span className="text-yellow-400 mr-2">Repository needs initialization</span>
                          <button
                            type="button"
                            onClick={() => initializeRepository(selectedRepo)}
                            className="px-2 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700"
                          >
                            Initialize
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </>
              ) : apiSettings.githubToken ? (
                <div className="mt-1 text-yellow-400">
                  No repositories found. Make sure your GitHub token has the correct permissions.
                </div>
              ) : (
                <div className="mt-1 text-yellow-400">
                  Add a GitHub token in Settings to see your repositories.
                </div>
              )}
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
              <p className="mt-1 text-xs text-gray-400">
                You can manually enter a URL or select from your repositories above
              </p>
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
