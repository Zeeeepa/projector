import React, { useState, useEffect } from 'react';
import { useProjectStore } from '../store';
import { apiService } from '../services/api';

export function ProjectList() {
  const { projects, setActiveProject, activeProject, apiSettings } = useProjectStore();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProjects = async () => {
      if (!apiSettings.apiBaseUrl) return;

      setIsLoading(true);
      setError(null);

      try {
        apiService.updateSettings(apiSettings);
        const fetchedProjects = await apiService.getProjects();
        // TODO: Update the store with fetched projects
      } catch (err) {
        console.error('Error fetching projects:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch projects');
      } finally {
        setIsLoading(false);
      }
    };

    fetchProjects();
  }, [apiSettings.apiBaseUrl, apiSettings.apiKey]);

  return (
    <div className="p-4">
      {isLoading && (
        <div className="text-center text-gray-400 py-4">
          Loading projects...
        </div>
      )}

      {error && (
        <div className="p-2 bg-red-900 text-red-100 rounded text-sm mb-4">
          {error}
        </div>
      )}

      {projects.length === 0 ? (
        <div className="text-center text-gray-400 py-4">
          No projects yet. Create a new project to get started.
        </div>
      ) : (
        <ul className="space-y-2">
          {projects.map((project) => (
            <li key={project.id}>
              <button
                onClick={() => setActiveProject(project)}
                className={`w-full text-left px-3 py-2 rounded-md ${
                  activeProject?.id === project.id
                    ? 'bg-indigo-700 text-white'
                    : 'bg-gray-700 text-gray-200 hover:bg-gray-600'
                }`}
              >
                <div className="font-medium">{project.name}</div>
                <div className="text-xs text-gray-400 truncate">{project.githubUrl}</div>
                {project.initialized && (
                  <div className="mt-1 w-full bg-gray-600 rounded-full h-1.5">
                    <div
                      className="bg-indigo-500 h-1.5 rounded-full"
                      style={{ width: `${project.progress}%` }}
                    ></div>
                  </div>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}