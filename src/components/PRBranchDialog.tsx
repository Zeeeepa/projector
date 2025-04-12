import React, { useState, useEffect } from 'react';
import { useProjectStore } from '../store';
import { prReviewBotService } from '../services/pr_review_bot';

interface PRBranchDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

const PRBranchDialog: React.FC<PRBranchDialogProps> = ({ isOpen, onClose }) => {
  const { 
    activeProject, 
    apiSettings, 
    prReviewBotConfigs, 
    activePRReviewBotConfigId 
  } = useProjectStore();
  
  const [type, setType] = useState<'pr' | 'branch'>('pr');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [baseBranch, setBaseBranch] = useState('main');
  const [enablePRReviewBot, setEnablePRReviewBot] = useState(false);
  const [autoReview, setAutoReview] = useState(true);
  const [validateDocumentation, setValidateDocumentation] = useState(true);
  
  useEffect(() => {
    if (activePRReviewBotConfigId) {
      const activeConfig = prReviewBotConfigs.find(config => config.id === activePRReviewBotConfigId);
      if (activeConfig) {
        setEnablePRReviewBot(true);
        setAutoReview(activeConfig.autoReview);
        setValidateDocumentation(activeConfig.validateDocumentation);
      }
    }
  }, [activePRReviewBotConfigId, prReviewBotConfigs]);
  
  if (!isOpen) return null;
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    console.log({
      type,
      name,
      description,
      baseBranch,
      projectId: activeProject?.id,
      prReviewBot: enablePRReviewBot ? {
        autoReview,
        validateDocumentation
      } : null
    });
    
    setName('');
    setDescription('');
    setBaseBranch('main');
    setEnablePRReviewBot(false);
    setAutoReview(true);
    setValidateDocumentation(true);
    onClose();
  };
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-900 rounded-lg shadow-xl w-full max-w-md">
        <form onSubmit={handleSubmit}>
          <div className="p-6 space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-xl font-medium text-gray-100">
                {type === 'pr' ? 'Create Pull Request' : 'Create Branch'}
              </h3>
              <button
                type="button"
                onClick={onClose}
                className="text-gray-400 hover:text-gray-100"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="border-b border-gray-700">
              <nav className="-mb-px flex space-x-6">
                <button
                  type="button"
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    type === 'pr'
                      ? 'border-indigo-500 text-indigo-400'
                      : 'border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-700'
                  }`}
                  onClick={() => setType('pr')}
                >
                  Pull Request
                </button>
                <button
                  type="button"
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    type === 'branch'
                      ? 'border-indigo-500 text-indigo-400'
                      : 'border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-700'
                  }`}
                  onClick={() => setType('branch')}
                >
                  Branch
                </button>
              </nav>
            </div>
            
            <div className="space-y-4">
              {!activeProject ? (
                <div className="text-center py-4 text-red-400">
                  <p>Please select a project first.</p>
                </div>
              ) : (
                <>
                  <div>
                    <label htmlFor="name" className="block text-sm font-medium text-gray-300">
                      {type === 'pr' ? 'PR Title' : 'Branch Name'}
                    </label>
                    <input
                      type="text"
                      id="name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="mt-1 block w-full rounded-md bg-gray-800 border-gray-700 text-gray-100 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                      placeholder={type === 'pr' ? 'Add feature X' : 'feature/new-feature'}
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="baseBranch" className="block text-sm font-medium text-gray-300">
                      Base Branch
                    </label>
                    <input
                      type="text"
                      id="baseBranch"
                      value={baseBranch}
                      onChange={(e) => setBaseBranch(e.target.value)}
                      className="mt-1 block w-full rounded-md bg-gray-800 border-gray-700 text-gray-100 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                      placeholder="main"
                    />
                  </div>
                  
                  {type === 'pr' && (
                    <div>
                      <label htmlFor="description" className="block text-sm font-medium text-gray-300">
                        Description
                      </label>
                      <textarea
                        id="description"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        rows={4}
                        className="mt-1 block w-full rounded-md bg-gray-800 border-gray-700 text-gray-100 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                        placeholder="Describe the changes in this PR..."
                      />
                    </div>
                  )}
                  
                  {type === 'pr' && activePRReviewBotConfigId && (
                    <div className="border-t border-gray-700 pt-4">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-medium text-gray-300">PR Review Bot</h4>
                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            checked={enablePRReviewBot}
                            onChange={(e) => setEnablePRReviewBot(e.target.checked)}
                            className="rounded bg-gray-800 border-gray-700 text-indigo-600 focus:ring-indigo-500"
                          />
                          <span className="ml-2 text-sm text-gray-300">Enable</span>
                        </label>
                      </div>
                      
                      {enablePRReviewBot && (
                        <div className="mt-3 space-y-3">
                          <label className="flex items-center">
                            <input
                              type="checkbox"
                              checked={autoReview}
                              onChange={(e) => setAutoReview(e.target.checked)}
                              className="rounded bg-gray-800 border-gray-700 text-indigo-600 focus:ring-indigo-500"
                            />
                            <span className="ml-2 text-sm text-gray-300">Auto Review</span>
                          </label>
                          
                          <label className="flex items-center">
                            <input
                              type="checkbox"
                              checked={validateDocumentation}
                              onChange={(e) => setValidateDocumentation(e.target.checked)}
                              className="rounded bg-gray-800 border-gray-700 text-indigo-600 focus:ring-indigo-500"
                            />
                            <span className="ml-2 text-sm text-gray-300">Validate Documentation</span>
                          </label>
                          
                          <p className="text-xs text-gray-400">
                            The PR will be automatically reviewed against project documentation (STRUCTURE.md, STEP-BY-STEP.md)
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
            
            <div className="flex justify-end space-x-3 pt-4 border-t border-gray-700">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-300 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700"
                disabled={!activeProject || !name}
              >
                {type === 'pr' ? 'Create PR' : 'Create Branch'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PRBranchDialog;
