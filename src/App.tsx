import React, { useState } from 'react';
import { Plus, Settings, ChevronDown, X, Check } from 'lucide-react';
import { ProjectDialog } from './components/ProjectDialog';
import { ProjectList } from './components/ProjectList';
import { ChatInterface } from './components/ChatInterface';
import { StepGuide } from './components/StepGuide';
import { SettingsDialog } from './components/SettingsDialog';
import { DocumentManager } from './components/DocumentManager';
import { useProjectStore } from './store';

function App() {
  const [isProjectDialogOpen, setIsProjectDialogOpen] = useState(false);
  const [isSettingsDialogOpen, setIsSettingsDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('requirements');
  const { projects, activeProject, initializeProject, updateProject, setActiveProject } = useProjectStore();

  const handleConcurrencyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (activeProject) {
      const threads = Math.min(Math.max(parseInt(e.target.value), 1), 10);
      updateProject(activeProject.id, { threads });
    }
  };

  const handleCloseProject = (projectId: string) => {
    if (activeProject?.id === projectId) {
      const remainingProjects = projects.filter(p => p.id !== projectId);
      setActiveProject(remainingProjects.length > 0 ? remainingProjects[0] : null);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Top Navigation Bar */}
      <nav className="bg-gray-800 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex space-x-8">
              <button 
                onClick={() => setIsSettingsDialogOpen(true)}
                className="text-gray-400 hover:text-gray-300 inline-flex items-center px-1 pt-1 text-sm font-medium"
              >
                <Settings className="h-4 w-4 mr-2" /> Settings
              </button>
              <button className="text-gray-100 inline-flex items-center px-1 pt-1 border-b-2 border-indigo-500 text-sm font-medium">
                Dashboard
              </button>
            </div>
            <div className="flex items-center">
              <button
                onClick={() => setIsProjectDialogOpen(true)}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700"
              >
                <Plus className="h-4 w-4 mr-2" /> Add Project
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-12 gap-6 h-[calc(100vh-12rem)]">
          {/* Left Column - Step by Step Structure */}
          <div className="col-span-3 bg-gray-800 rounded-lg shadow overflow-hidden flex flex-col">
            <div className="p-4 border-b border-gray-700">
              <h3 className="text-lg font-medium text-gray-100">Step by Step Structure</h3>
              <p className="text-sm text-gray-400">View generated from user's documents</p>
            </div>
            <div className="flex-1 overflow-y-auto">
              <StepGuide />
            </div>
          </div>

          {/* Middle Column - Project Content */}
          <div className="col-span-6 bg-gray-800 rounded-lg shadow overflow-hidden flex flex-col">
            <div className="p-4 border-b border-gray-700">
              <div className="flex flex-col space-y-2">
                {/* Project Tabs */}
                <div className="flex space-x-2 overflow-x-auto pb-2">
                  {projects.map((project) => (
                    <div 
                      key={project.id}
                      className={`flex items-center space-x-1 px-3 py-2 rounded-t-md cursor-pointer ${
                        activeProject?.id === project.id 
                          ? 'bg-gray-700 text-white' 
                          : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                      }`}
                      onClick={() => setActiveProject(project)}
                    >
                      <span className="text-sm font-medium truncate max-w-[120px]">{project.name}</span>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCloseProject(project.id);
                        }}
                        className="text-gray-400 hover:text-gray-300"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
                
                {/* Tab Content Controls */}
                {activeProject && (
                  <div className="flex justify-between items-center">
                    <div className="flex space-x-4">
                      <button 
                        className={`px-3 py-2 text-sm font-medium ${
                          activeTab === 'requirements' 
                            ? 'text-gray-100 border-b-2 border-indigo-500' 
                            : 'text-gray-400 hover:text-gray-300 border-b-2 border-transparent hover:border-gray-700'
                        }`}
                        onClick={() => setActiveTab('requirements')}
                      >
                        Requirements
                      </button>
                      <button 
                        className={`px-3 py-2 text-sm font-medium ${
                          activeTab === 'architecture' 
                            ? 'text-gray-100 border-b-2 border-indigo-500' 
                            : 'text-gray-400 hover:text-gray-300 border-b-2 border-transparent hover:border-gray-700'
                        }`}
                        onClick={() => setActiveTab('architecture')}
                      >
                        Architecture
                      </button>
                      <button 
                        className={`px-3 py-2 text-sm font-medium ${
                          activeTab === 'implementation' 
                            ? 'text-gray-100 border-b-2 border-indigo-500' 
                            : 'text-gray-400 hover:text-gray-300 border-b-2 border-transparent hover:border-gray-700'
                        }`}
                        onClick={() => setActiveTab('implementation')}
                      >
                        Implementation
                      </button>
                    </div>
                    <div className="flex items-center space-x-4">
                      <div className="text-sm text-gray-400">
                        Concurrency: <input 
                          type="number" 
                          min="1" 
                          max="10" 
                          value={activeProject.threads}
                          onChange={handleConcurrencyChange}
                          className="w-12 bg-gray-700 rounded px-2 py-1 text-white" 
                        />
                      </div>
                      <button
                        onClick={() => setIsSettingsDialogOpen(true)}
                        className="text-gray-400 hover:text-gray-300"
                      >
                        <Settings className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              {activeProject ? (
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-medium text-gray-100">{activeProject.name}</h3>
                    {!activeProject.initialized && (
                      <button
                        onClick={() => initializeProject(activeProject.id)}
                        className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700"
                      >
                        Initialize
                      </button>
                    )}
                  </div>
                  <div className="space-y-2">
                    <div>
                      <span className="text-sm font-medium text-gray-400">GitHub URL:</span>
                      <a href={activeProject.githubUrl} target="_blank" rel="noopener noreferrer" className="ml-2 text-sm text-indigo-400 hover:text-indigo-300">
                        {activeProject.githubUrl}
                      </a>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-400">Slack Channel:</span>
                      <span className="ml-2 text-sm text-gray-300">{activeProject.slackChannel}</span>
                    </div>
                  </div>
                  <div className="mt-6">
                    <h4 className="text-sm font-medium text-gray-300 mb-2">Project Documents</h4>
                    <DocumentManager />
                  </div>
                </div>
              ) : (
                <div className="text-center text-gray-400">
                  Select a project or create a new one to get started
                </div>
              )}
            </div>
          </div>

          {/* Right Column - Tree Structure */}
          <div className="col-span-3 bg-gray-800 rounded-lg shadow overflow-hidden flex flex-col">
            <div className="p-4 border-b border-gray-700">
              <div className="flex space-x-4">
                <button className="text-gray-100 border-b-2 border-indigo-500 px-2 py-1 text-sm font-medium">
                  Tree Structure
                </button>
                <button className="text-gray-400 hover:text-gray-300 px-2 py-1 text-sm font-medium">
                  Component Integration
                </button>
                <button className="text-gray-400 hover:text-gray-300 px-2 py-1 text-sm font-medium">
                  Completion
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto">
              {activeProject && activeProject.initialized ? (
                <div className="p-4">
                  <div className="flex justify-between items-center mb-4">
                    <h4 className="text-sm font-medium text-gray-300">{activeProject.name}</h4>
                    <div className="text-sm text-gray-400">
                      <span className="bg-indigo-900 px-2 py-1 rounded text-white">65%</span>
                    </div>
                  </div>
                  
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center">
                      <span className="text-gray-300 mr-2">├──</span>
                      <span className="text-gray-300">User Authentication</span>
                      <Check className="h-4 w-4 text-green-500 ml-2" />
                    </div>
                    <div className="flex items-center pl-6">
                      <span className="text-gray-300 mr-2">├──</span>
                      <span className="text-gray-300">Database Schema</span>
                      <Check className="h-4 w-4 text-green-500 ml-2" />
                    </div>
                    <div className="flex items-center pl-6">
                      <span className="text-gray-300 mr-2">├──</span>
                      <span className="text-gray-300">Basic Auth Endpoints</span>
                      <Check className="h-4 w-4 text-green-500 ml-2" />
                    </div>
                    <div className="flex items-center pl-6">
                      <span className="text-gray-300 mr-2">├──</span>
                      <span className="text-gray-300">Social Login</span>
                      <Check className="h-4 w-4 text-green-500 ml-2" />
                    </div>
                    <div className="flex items-center pl-6">
                      <span className="text-gray-300 mr-2">├──</span>
                      <span className="text-gray-300">Password Reset</span>
                      <Check className="h-4 w-4 text-green-500 ml-2" />
                    </div>
                    <div className="flex items-center pl-6">
                      <span className="text-gray-300 mr-2">└──</span>
                      <span className="text-gray-300">Two-Factor Auth</span>
                      <div className="h-4 w-4 border border-gray-500 rounded-sm ml-2"></div>
                    </div>
                    
                    <div className="flex items-center mt-2">
                      <span className="text-gray-300 mr-2">├──</span>
                      <span className="text-gray-300">Product Catalog</span>
                      <span className="text-xs text-gray-400 ml-2">[75%]</span>
                    </div>
                    <div className="flex items-center pl-6">
                      <span className="text-gray-300 mr-2">├──</span>
                      <span className="text-gray-300">Database Schema</span>
                      <Check className="h-4 w-4 text-green-500 ml-2" />
                    </div>
                    <div className="flex items-center pl-6">
                      <span className="text-gray-300 mr-2">├──</span>
                      <span className="text-gray-300">Basic CRUD API</span>
                      <Check className="h-4 w-4 text-green-500 ml-2" />
                    </div>
                    <div className="flex items-center pl-6">
                      <span className="text-gray-300 mr-2">├──</span>
                      <span className="text-gray-300">Search Functionality</span>
                      <Check className="h-4 w-4 text-green-500 ml-2" />
                    </div>
                    <div className="flex items-center pl-6">
                      <span className="text-gray-300 mr-2">├──</span>
                      <span className="text-gray-300">Filtering Options</span>
                      <div className="h-4 w-4 border border-gray-500 rounded-sm ml-2"></div>
                    </div>
                    <div className="flex items-center pl-6">
                      <span className="text-gray-300 mr-2">└──</span>
                      <span className="text-gray-300">Sorting Options</span>
                      <div className="h-4 w-4 border border-gray-500 rounded-sm ml-2"></div>
                    </div>
                    
                    {/* More tree items would go here */}
                  </div>
                </div>
              ) : (
                <ProjectList />
              )}
            </div>
          </div>
        </div>

        {/* Chat Interface */}
        <div className="mt-6">
          <ChatInterface />
        </div>
      </div>

      {/* Dialogs */}
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
}

export default App;
