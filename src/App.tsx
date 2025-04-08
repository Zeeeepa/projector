import React, { useState } from 'react';
import { Plus, Settings, ChevronDown } from 'lucide-react';
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
  const { activeProject, initializeProject, updateProject } = useProjectStore();

  const handleConcurrencyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (activeProject) {
      const threads = Math.min(Math.max(parseInt(e.target.value), 1), 10);
      updateProject(activeProject.id, { threads });
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
                Settings
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
            </div>
            <div className="flex-1 overflow-y-auto">
              <StepGuide />
            </div>
          </div>

          {/* Middle Column - Project Content */}
          <div className="col-span-6 bg-gray-800 rounded-lg shadow overflow-hidden flex flex-col">
            <div className="p-4 border-b border-gray-700">
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
                {activeProject && (
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
              <h3 className="text-lg font-medium text-gray-100">Tree Structure</h3>
            </div>
            <div className="flex-1 overflow-y-auto">
              <ProjectList />
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