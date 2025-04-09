import React, { useState, useRef } from 'react';
import { useProjectStore } from '../store';
import { apiService } from '../services/api';

interface RequirementsManagerProps {
  projectId: string;
}

const RequirementsManager: React.FC<RequirementsManagerProps> = ({ projectId }) => {
  const [textInput, setTextInput] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { projects, updateProject, addDocument, removeDocument } = useProjectStore();
  
  const project = projects.find(p => p.id === projectId);
  
  const handleTextInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setTextInput(e.target.value);
  };
  
  const handleAddTextRequirement = () => {
    if (!textInput.trim()) return;
    
    addDocument(projectId, textInput);
    setTextInput('');
  };
  
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file.type === 'text/markdown' || file.name.endsWith('.md')) {
        try {
          const text = await file.text();
          addDocument(projectId, text);
        } catch (error) {
          console.error('Error reading file:', error);
        }
      }
    }
    
    // Reset the file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };
  
  const handleRemoveDocument = (document: string) => {
    removeDocument(projectId, document);
  };
  
  const handleGeneratePlan = async () => {
    if (!project || project.documentation.length === 0) {
      setGenerationError('Please add requirements before generating a plan');
      return;
    }
    
    setIsGenerating(true);
    setGenerationError(null);
    
    try {
      // Combine all documents into a single context
      const context = project.documentation.join('\n\n---\n\n');
      
      // Call the API to generate the plan
      const response = await apiService.generateProjectPlan(projectId, context);
      
      if (response.success) {
        // Update the project with the generated plan
        updateProject(projectId, { 
          initialized: true,
          progress: 25 // Set initial progress
        });
      } else {
        throw new Error(response.error || 'Failed to generate plan');
      }
    } catch (error) {
      console.error('Error generating plan:', error);
      setGenerationError(error instanceof Error ? error.message : 'Failed to generate plan');
    } finally {
      setIsGenerating(false);
    }
  };
  
  return (
    <div className="flex flex-col h-full bg-gray-800 p-4 rounded-md">
      <h2 className="text-xl font-semibold mb-4 text-gray-100">Project Requirements</h2>
      
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Add Text Requirements
        </label>
        <textarea
          value={textInput}
          onChange={handleTextInputChange}
          rows={5}
          className="w-full p-2 border border-gray-600 rounded-md bg-gray-700 text-gray-200 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          placeholder="Enter project requirements, user stories, or any other relevant information..."
        />
        <button
          onClick={handleAddTextRequirement}
          disabled={!textInput.trim()}
          className={`mt-2 px-4 py-2 rounded-md text-white ${
            !textInput.trim() ? 'bg-gray-600 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
          }`}
        >
          Add Text
        </button>
      </div>
      
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Upload Markdown Files
        </label>
        <div className="flex items-center">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept=".md"
            multiple
            className="hidden"
            id="file-upload"
          />
          <label
            htmlFor="file-upload"
            className="cursor-pointer px-4 py-2 bg-gray-700 text-gray-200 rounded-md hover:bg-gray-600 transition"
          >
            Choose Files
          </label>
          <span className="ml-2 text-sm text-gray-400">
            Only .md files are supported
          </span>
        </div>
      </div>
      
      <div className="flex-1 overflow-auto mb-4">
        <h3 className="text-md font-medium text-gray-300 mb-2">Added Requirements:</h3>
        {project?.documentation && project.documentation.length > 0 ? (
          <div className="space-y-2">
            {project.documentation.map((doc, index) => (
              <div key={index} className="p-3 bg-gray-700 rounded-md relative group">
                <div className="text-gray-200 text-sm whitespace-pre-wrap max-h-32 overflow-auto">
                  {doc.length > 200 ? `${doc.substring(0, 200)}...` : doc}
                </div>
                <button
                  onClick={() => handleRemoveDocument(doc)}
                  className="absolute top-2 right-2 text-gray-400 hover:text-red-400 opacity-0 group-hover:opacity-100 transition"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-gray-400 text-center p-4 border border-dashed border-gray-600 rounded-md">
            No requirements added yet
          </div>
        )}
      </div>
      
      {generationError && (
        <div className="mb-4 p-3 bg-red-900 text-red-100 rounded-md">
          {generationError}
        </div>
      )}
      
      <button
        onClick={handleGeneratePlan}
        disabled={isGenerating || !project?.documentation || project.documentation.length === 0}
        className={`px-4 py-2 rounded-md text-white ${
          isGenerating || !project?.documentation || project.documentation.length === 0
            ? 'bg-gray-600 cursor-not-allowed'
            : 'bg-green-600 hover:bg-green-700'
        }`}
      >
        {isGenerating ? 'Generating...' : 'Generate Step-by-step Plan'}
      </button>
    </div>
  );
};

export default RequirementsManager;
