import React, { useState, useEffect } from 'react';
import StepGuide from './StepGuide';
import TreeView from './TreeView';
import { ChatInterface } from './ChatInterface';
import { ProjectDialog } from './ProjectDialog';
import { SettingsDialog } from './SettingsDialog';
import { useProjectStore } from '../store';

const MainLayout: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string | null>(null);
  const [isProjectDialogOpen, setIsProjectDialogOpen] = useState(false);
  const [isSettingsDialogOpen, setIsSettingsDialogOpen] = useState(false);
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
        </div>
        <button 
          className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition flex items-center"
          onClick={() => setIsProjectDialogOpen(true)}
        >
          <span className="mr-1 font-bold">+</span> Add Project
        </button>
      </header>
      
      <div className="flex flex-1 overflow-hidden">
        <div className="w-1/4 border-r border-gray-700 bg-gray-800 overflow-auto">
          {activeProject && (
            <StepGuide 
              projectId={activeProject.id}
              featureName=""
              featureDescription=""
              dependencies={[]}
              steps={[]}
            />
          )}
        </div>
        
        <div className="flex-1 flex flex-col overflow-hidden bg-gray-800">
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
            <div className="mb-4">
              <h2 className="text-xl font-semibold mb-2">Project's context document View</h2>
              <div className="p-4 border border-gray-700 rounded-lg bg-gray-800 shadow-sm">
                <p className="text-gray-300">This document contains important information about the project requirements, goals, and constraints. You can add or modify content here to update the project specifications.</p>
              </div>
            </div>
            
            <div className="flex justify-between items-center mb-4">
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
              <button className="px-3 py-1 bg-gray-700 rounded hover:bg-gray-600 transition text-gray-200">Project Settings</button>
            </div>
          </div>
        </div>
        
        <div className="w-1/4 border-l border-gray-700 bg-gray-800 overflow-auto">
          <div className="p-2">
            <div className="flex justify-between items-center mb-2">
              <h3 className="font-semibold text-gray-200">Tree Structure</h3>
              <div className="text-sm text-gray-400">Completion: <span className="font-medium">[0%]</span></div>
            </div>
            <TreeView data={[]} />
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
    </div>
  );
};

export default MainLayout;
