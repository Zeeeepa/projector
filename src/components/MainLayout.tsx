import React, { useState, useEffect } from 'react';
import StepGuide from './StepGuide';
import TreeView from './TreeView';
import { ChatInterface } from './ChatInterface';
import { ProjectDialog } from './ProjectDialog';
import { SettingsDialog } from './SettingsDialog';
import RequirementsManager from './RequirementsManager';
import { useProjectStore } from '../store';
import PRBranchDialog from './PRBranchDialog';

const MainLayout: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string | null>(null);
  const [isProjectDialogOpen, setIsProjectDialogOpen] = useState(false);
  const [isSettingsDialogOpen, setIsSettingsDialogOpen] = useState(false);
  const [isPRBranchDialogOpen, setIsPRBranchDialogOpen] = useState(false);
  const [activeView, setActiveView] = useState<'requirements' | 'context'>('context');
  const { projects, setActiveProject, updateProject, activeProject } = useProjectStore();
  const [concurrency, setConcurrency] = useState<number>(2);
  
  useEffect(() => {
    if (projects.length > 0 && activeTab === null) {
      setActiveTab(projects[0].id);
      setActiveProject(projects[0]);
      setConcurrency(projects[0].threads);
    }
  }, [projects, activeTab, setActiveProject]);

  useEffect(() => {
    if (activeProject) {
      setConcurrency(activeProject.threads);
    }
  }, [activeProject]);

  const handleTabClick = (projectId: string) => {
    setActiveTab(projectId);
    const project = projects.find(p => p.id === projectId);
    if (project) {
      setActiveProject(project);
      setConcurrency(project.threads);
    }
  };

  const handleCloseTab = (e: React.MouseEvent, projectId: string) => {
    e.stopPropagation();
    if (activeTab === projectId) {
      const otherProject = projects.find(p => p.id !== projectId);
      if (otherProject) {
        setActiveTab(otherProject.id);
        setActiveProject(otherProject);
        setConcurrency(otherProject.threads);
      } else {
        setActiveTab(null);
      }
    }
  };

  const handleConcurrencyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = parseInt(e.target.value);
    setConcurrency(newValue);
    
    if (activeProject) {
      updateProject(activeProject.id, { threads: newValue });
    }
  };
  
  return (
    <div className="flex flex-col h-screen bg-gray-900 text-gray-100">
      <header className="bg-gray-800 border-b border-gray-700 p-4 flex justify-between items-center shadow-md">
        <div className="flex space-x-4">
          <button 
            className="px-4 py-2 bg-gray-700 rounded-md hover:bg-gray-600 transition text-gray-200"
            onClick={() => setIsSettingsDialogOpen(true)}
          >
            Settings
          </button>
          <button className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition">Dashboard</button>
          <button 
            className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition"
            onClick={() => setIsPRBranchDialogOpen(true)}
          >
            PR/Branch
          </button>
        </div>
        <button 
          className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition flex items-center"
          onClick={() => setIsProjectDialogOpen(true)}
        >
          <span className="mr-1 font-bold">+</span> Add Project
        </button>
      </header>
      
      <div className="flex flex-1 overflow-hidden">
        <div className="w-1/5 border-r border-gray-700 bg-gray-800 overflow-auto">
          <div className="p-2">
            <h3 className="font-semibold text-gray-200 p-2">PRs & Branches</h3>
            <div className="text-gray-400 text-center p-4">
              <p>No PRs or branches yet</p>
              <button 
                className="mt-2 px-3 py-1 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition text-sm"
                onClick={() => setIsPRBranchDialogOpen(true)}
              >
                Create New
              </button>
            </div>
          </div>
        </div>
        
        <div className="w-1/5 border-r border-gray-700 bg-gray-800 overflow-auto">
          <div className="flex flex-col h-full">
            <div className="flex border-b border-gray-700 bg-gray-900">
              {projects.length > 0 ? (
                projects.map(project => (
                  <button 
                    key={project.id}
                    className={`px-4 py-2 flex items-center ${activeTab === project.id ? 'border-b-2 border-blue-500 bg-gray-800' : 'hover:bg-gray-700'}`}
                    onClick={() => handleTabClick(project.id)}
                  >
                    <span>{project.name}</span>
                    <span 
                      className="ml-2 text-gray-400 hover:text-gray-200"
                      onClick={(e) => handleCloseTab(e, project.id)}
                    >
                      ×
                    </span>
                  </button>
                ))
              ) : (
                <div className="px-4 py-2 text-gray-500">No projects yet. Add a project to get started.</div>
              )}
            </div>
            
            <div className="flex-1 overflow-auto p-4">
              {activeProject ? (
                <>
                  <div className="mb-4 flex justify-between items-center">
                    <div className="flex space-x-4">
                      <button
                        className={`px-4 py-2 rounded-md ${activeView === 'context' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-200 hover:bg-gray-600'}`}
                        onClick={() => setActiveView('context')}
                      >
                        Project Context
                      </button>
                      <button
                        className={`px-4 py-2 rounded-md ${activeView === 'requirements' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-200 hover:bg-gray-600'}`}
                        onClick={() => setActiveView('requirements')}
                      >
                        Requirements
                      </button>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <span className="font-medium text-gray-300">Concurrency</span>
                      <input 
                        type="number" 
                        min="1" 
                        max="10" 
                        value={concurrency}
                        onChange={handleConcurrencyChange}
                        className="w-16 p-1 border border-gray-600 rounded bg-gray-700 text-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500" 
                      />
                    </div>
                  </div>
                  
                  {activeView === 'context' ? (
                    <div className="p-4 border border-gray-700 rounded-lg bg-gray-800 shadow-sm">
                      <p className="text-gray-300">
                        {activeProject.description || 'No description provided for this project.'}
                      </p>
                      <div className="mt-2">
                        {activeProject.githubUrl && (
                          <p className="text-gray-400 text-sm">GitHub: <a href={activeProject.githubUrl} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">{activeProject.githubUrl}</a></p>
                        )}
                        {activeProject.slackChannel && (
                          <p className="text-gray-400 text-sm">Slack Channel: {activeProject.slackChannel}</p>
                        )}
                      </div>
                    </div>
                  ) : (
                    <RequirementsManager projectId={activeProject.id} />
                  )}
                </>
              ) : (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center p-8 max-w-md">
                    <h2 className="text-2xl font-bold text-gray-300 mb-4">Welcome to Projector</h2>
                    <p className="text-gray-400 mb-6">Get started by adding a project using the "Add Project" button in the top right.</p>
                    <button 
                      className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition"
                      onClick={() => setIsProjectDialogOpen(true)}
                    >
                      Add Your First Project
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
        
        <div className="w-1/5 border-r border-gray-700 bg-gray-800 overflow-auto">
          {activeProject ? (
            <StepGuide 
              projectId={activeProject.id}
              steps={[]}
            />
          ) : (
            <div className="p-4 text-gray-400 text-center">
              <p>No project selected. Add a project to get started.</p>
            </div>
          )}
        </div>
        
        <div className="w-2/5 border-l border-gray-700 bg-gray-800 overflow-auto">
          <div className="p-2">
            <h3 className="font-semibold text-gray-200 p-2">Project Structure</h3>
            {activeProject ? (
              <TreeView data={[]} />
            ) : (
              <div className="text-gray-400 text-center p-4">
                <p>Select a project to view its structure</p>
              </div>
            )}
          </div>
        </div>
      </div>
      
      <div className="border-t border-gray-700 bg-gray-900">
        <ChatInterface />
      </div>

      <ProjectDialog 
        isOpen={isProjectDialogOpen} 
        onClose={() => setIsProjectDialogOpen(false)} 
      />

      <SettingsDialog
        isOpen={isSettingsDialogOpen}
        onClose={() => setIsSettingsDialogOpen(false)}
      />

      {isPRBranchDialogOpen && (
        <PRBranchDialog
          isOpen={isPRBranchDialogOpen}
          onClose={() => setIsPRBranchDialogOpen(false)}
        />
      )}
    </div>
  );
};

export default MainLayout;
