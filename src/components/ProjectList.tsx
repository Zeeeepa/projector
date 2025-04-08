import React from 'react';
import { ChevronRight, ChevronDown, CheckCircle2, Circle } from 'lucide-react';
import { useProjectStore } from '../store';

export function ProjectList() {
  const { projects, activeProject, setActiveProject } = useProjectStore();
  const [expandedNodes, setExpandedNodes] = React.useState<Set<string>>(new Set());

  const toggleNode = (nodeId: string) => {
    const newExpanded = new Set(expandedNodes);
    if (newExpanded.has(nodeId)) {
      newExpanded.delete(nodeId);
    } else {
      newExpanded.add(nodeId);
    }
    setExpandedNodes(newExpanded);
  };

  const renderProject = (project: any) => {
    const isExpanded = expandedNodes.has(project.id);
    const isActive = activeProject?.id === project.id;

    return (
      <div key={project.id} className="space-y-1">
        <div 
          className={`flex items-center space-x-2 py-1 px-2 hover:bg-gray-700 rounded cursor-pointer ${
            isActive ? 'bg-gray-700' : ''
          }`}
          onClick={() => setActiveProject(project)}
        >
          <button
            onClick={(e) => {
              e.stopPropagation();
              toggleNode(project.id);
            }}
            className="text-gray-400 hover:text-gray-300"
          >
            {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </button>
          {project.initialized ? (
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          ) : (
            <Circle className="h-4 w-4 text-gray-500" />
          )}
          <span className="text-sm text-gray-300">{project.name}</span>
          <div className="flex-1 flex items-center">
            <div className="w-full bg-gray-700 rounded-full h-1.5">
              <div
                className="bg-indigo-500 h-1.5 rounded-full"
                style={{ width: `${project.progress}%` }}
              />
            </div>
            <span className="ml-2 text-xs text-gray-400">{project.progress}%</span>
          </div>
        </div>
        {isExpanded && (
          <div className="pl-6 space-y-1">
            <div className="text-xs text-gray-400">GitHub: {project.githubUrl}</div>
            <div className="text-xs text-gray-400">Slack: {project.slackChannel}</div>
            <div className="text-xs text-gray-400">Threads: {project.threads}</div>
            {project.documentation.length > 0 && (
              <div className="mt-2">
                <div className="text-xs font-medium text-gray-400">Documents:</div>
                {project.documentation.map((doc: string, index: number) => (
                  <div key={index} className="text-xs text-gray-400 pl-2">• {doc}</div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="p-4 space-y-2">
      {projects.length === 0 ? (
        <div className="text-center text-gray-400 text-sm">
          No projects yet. Click "Add Project" to create one.
        </div>
      ) : (
        projects.map(renderProject)
      )}
    </div>
  );
}