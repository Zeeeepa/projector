import React, { useState } from 'react';

interface Step {
  id: string;
  title: string;
  description: string;
  completed: boolean;
  subtasks: {
    id: string;
    title: string;
    completed: boolean;
  }[];
}

interface StepGuideProps {
  projectId: string;
  featureName: string;
  featureDescription: string;
  dependencies: {
    id: string;
    name: string;
    completed: boolean;
  }[];
  steps: Step[];
}

const StepGuide: React.FC<StepGuideProps> = ({
  projectId,
  featureName,
  featureDescription,
  dependencies,
  steps,
}) => {
  const [newDependency, setNewDependency] = useState('');

  const handleAddDependency = () => {
    // Implementation would go here
    setNewDependency('');
  };

  const handleToggleStep = (stepId: string) => {
    // Implementation would go here
  };

  const handleToggleSubtask = (stepId: string, subtaskId: string) => {
    // Implementation would go here
  };

  const handleGenerateCode = () => {
    // Implementation would go here
  };

  const handleAddToProject = () => {
    // Implementation would go here
  };

  const handleExportPlan = () => {
    // Implementation would go here
  };

  return (
    <div className="flex flex-col h-full border rounded-lg overflow-hidden bg-white shadow-sm">
      <div className="p-4 bg-gray-50 border-b">
        <h2 className="text-lg font-semibold mb-4 text-gray-800">Step by step Structure View generated from user's Docs</h2>
        
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">Feature:</label>
          <input
            type="text"
            value={featureName}
            readOnly
            className="w-full p-2 border rounded-md bg-white shadow-sm"
          />
        </div>
        
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">Description:</label>
          <textarea
            value={featureDescription}
            readOnly
            rows={3}
            className="w-full p-2 border rounded-md bg-white shadow-sm"
          />
        </div>
        
        <div className="mb-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">Dependencies:</label>
          <div className="space-y-2">
            {dependencies.map((dep) => (
              <div key={dep.id} className="flex items-center">
                <input
                  type="checkbox"
                  checked={dep.completed}
                  readOnly
                  className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <span className="text-gray-700">{dep.name}</span>
              </div>
            ))}
            <div className="flex items-center mt-2">
              <input
                type="text"
                value={newDependency}
                onChange={(e) => setNewDependency(e.target.value)}
                placeholder="Add New Dependencies..."
                className="flex-1 p-2 border rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
              />
              <button
                onClick={handleAddDependency}
                className="ml-2 px-3 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition"
              >
                Add
              </button>
            </div>
          </div>
        </div>
      </div>
      
      <div className="flex-1 overflow-auto p-4 border-b">
        <h3 className="text-lg font-semibold mb-4 text-gray-800">Generated Plan:</h3>
        <div className="space-y-6">
          {steps.map((step, index) => (
            <div key={step.id} className="space-y-2">
              <div className="flex items-start">
                <span className="font-semibold mr-2 text-gray-800">{index + 1}.</span>
                <span className="font-semibold text-gray-800">{step.title}</span>
              </div>
              {step.subtasks.map((subtask) => (
                <div key={subtask.id} className="flex items-center ml-6">
                  <input
                    type="checkbox"
                    checked={subtask.completed}
                    onChange={() => handleToggleSubtask(step.id, subtask.id)}
                    className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <span className={subtask.completed ? 'line-through text-gray-500' : 'text-gray-700'}>
                    - {subtask.title}
                  </span>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
      
      <div className="p-4 bg-gray-50 flex justify-end space-x-4">
        <button
          onClick={handleGenerateCode}
          className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 transition shadow-sm"
        >
          Generate Code Stubs
        </button>
        <button
          onClick={handleAddToProject}
          className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition shadow-sm"
        >
          Add to Project
        </button>
        <button
          onClick={handleExportPlan}
          className="px-4 py-2 bg-gray-700 text-white rounded-md hover:bg-gray-800 transition shadow-sm"
        >
          Export Plan
        </button>
      </div>
    </div>
  );
};

export default StepGuide;
