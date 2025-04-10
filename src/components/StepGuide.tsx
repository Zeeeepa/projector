import React from 'react';

interface StepGuideProps {
  steps: string[];
}

export default function StepGuide({ steps }: StepGuideProps) {
  return (
    <div className="bg-gray-900 rounded-lg p-4 shadow-md border border-gray-700 h-full overflow-auto">
      <h2 className="text-lg font-semibold mb-2 text-gray-100">Implementation Plan</h2>
      
      {steps.length === 0 ? (
        <div className="text-gray-400 italic">
          No implementation plan generated yet. Add requirements and generate a plan to see steps here.
        </div>
      ) : (
        <ol className="list-decimal list-inside space-y-2 text-gray-300">
          {steps.map((step, index) => (
            <li key={index} className="py-1">
              {step}
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
