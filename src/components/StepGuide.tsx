import React from 'react';

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
  steps: Step[];
}

const StepGuide: React.FC<StepGuideProps> = ({
  projectId,
  steps,
}) => {
  return (
    <div className="flex flex-col h-full overflow-hidden bg-gray-800 shadow-md">
      <div className="p-4 bg-gray-900 border-b border-gray-700">
        <h2 className="text-lg font-semibold mb-2 text-gray-100">Step by step Structure View generated from user's Docs</h2>
      </div>
      
      <div className="flex-1 overflow-auto p-4 border-b border-gray-700">
        <h3 className="text-lg font-semibold mb-4 text-gray-200">Generated Plan:</h3>
        {steps && steps.length > 0 ? (
          <div className="space-y-6">
            {steps.map((step, index) => (
              <div key={step.id} className="space-y-2">
                <div className="flex items-start">
                  <span className="font-semibold mr-2 text-gray-200">{index + 1}.</span>
                  <span className="font-semibold text-gray-200">{step.title}</span>
                </div>
                {step.subtasks.map((subtask) => (
                  <div key={subtask.id} className="flex items-center ml-6">
                    <input
                      type="checkbox"
                      checked={subtask.completed}
                      readOnly
                      className="mr-2 h-4 w-4 text-blue-500 focus:ring-blue-500 border-gray-600 rounded"
                    />
                    <span className={subtask.completed ? 'line-through text-gray-500' : 'text-gray-300'}>
                      - {subtask.title}
                    </span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-gray-400 text-center p-4 border border-dashed border-gray-600 rounded-md">
            No plan generated yet. Add requirements and generate a plan to see steps here.
          </div>
        )}
      </div>
      
      <div className="p-4 bg-gray-900 flex justify-end space-x-4">
        <button
          className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition shadow-sm"
        >
          Generate Code Stubs
        </button>
        <button
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition shadow-sm"
        >
          Add to Project
        </button>
        <button
          className="px-4 py-2 bg-gray-700 text-white rounded-md hover:bg-gray-800 transition shadow-sm"
        >
          Export Plan
        </button>
      </div>
    </div>
  );
};

export default StepGuide;
