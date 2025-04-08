import React from 'react';
import { CheckCircle2, Circle, Plus } from 'lucide-react';

export function StepGuide() {
  const [selectedFeature, setSelectedFeature] = React.useState('Two-Factor Authentication');
  const [description, setDescription] = React.useState(
    'Implement TOTP-based two-factor authentication for enhanced security with backup codes and device remembering functionality.'
  );
  const [dependencies, setDependencies] = React.useState([
    { name: 'User Authentication Module', completed: true },
  ]);

  const steps = [
    {
      title: 'Update User Schema',
      tasks: [
        { text: 'Add TOTP secret field', completed: false },
        { text: 'Add backup codes field', completed: false },
        { text: 'Add 2FA enabled flag', completed: false },
      ],
    },
    {
      title: 'Implement TOTP Generation',
      tasks: [
        { text: 'Add pyotp library', completed: true },
        { text: 'Create secret generation function', completed: true },
        { text: 'Implement QR code generation', completed: false },
      ],
    },
    {
      title: 'Create API Endpoints',
      tasks: [
        { text: 'Enable/disable 2FA endpoint', completed: false },
        { text: 'Verify TOTP code endpoint', completed: false },
        { text: 'Generate backup codes endpoint', completed: false },
      ],
    },
    {
      title: 'Update Login Flow',
      tasks: [
        { text: 'Modify authentication process', completed: false },
        { text: 'Add 2FA verification step', completed: false },
        { text: 'Implement remember device functionality', completed: false },
      ],
    },
    {
      title: 'Create Frontend Components',
      tasks: [
        { text: '2FA setup page', completed: false },
        { text: 'TOTP verification modal', completed: false },
        { text: 'Backup codes display', completed: false },
      ],
    },
    {
      title: 'Testing and Documentation',
      tasks: [
        { text: 'Unit tests for all components', completed: false },
        { text: 'Integration tests for the flow', completed: false },
        { text: 'User documentation', completed: false },
      ],
    },
  ];

  return (
    <div className="p-4 space-y-6">
      {/* Feature Selection */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-medium text-gray-300">Feature</h4>
          <button className="text-indigo-400 hover:text-indigo-300 text-sm">
            <Plus className="h-4 w-4 inline mr-1" /> Add Feature
          </button>
        </div>
        <input
          type="text"
          value={selectedFeature}
          onChange={(e) => setSelectedFeature(e.target.value)}
          className="w-full bg-gray-700 border-gray-600 text-gray-100 rounded-md px-3 py-2 text-sm focus:ring-indigo-500 focus:border-indigo-500"
        />
      </div>

      {/* Description */}
      <div className="space-y-2">
        <h4 className="text-sm font-medium text-gray-300">Description</h4>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          className="w-full bg-gray-700 border-gray-600 text-gray-100 rounded-md px-3 py-2 text-sm focus:ring-indigo-500 focus:border-indigo-500"
        />
      </div>

      {/* Dependencies */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-medium text-gray-300">Dependencies</h4>
          <button className="text-indigo-400 hover:text-indigo-300 text-sm">
            <Plus className="h-4 w-4 inline mr-1" /> Add Dependency
          </button>
        </div>
        <div className="space-y-2">
          {dependencies.map((dep, index) => (
            <div key={index} className="flex items-center space-x-2">
              {dep.completed ? (
                <CheckCircle2 className="h-4 w-4 text-green-500" />
              ) : (
                <Circle className="h-4 w-4 text-gray-500" />
              )}
              <span className="text-sm text-gray-300">{dep.name}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Implementation Steps */}
      <div className="space-y-4">
        <h4 className="text-sm font-medium text-gray-300">Generated Plan</h4>
        <div className="space-y-4">
          {steps.map((step, index) => (
            <div key={index} className="space-y-2">
              <h5 className="text-sm font-medium text-gray-300">{step.title}</h5>
              <div className="space-y-1">
                {step.tasks.map((task, taskIndex) => (
                  <div key={taskIndex} className="flex items-center space-x-2">
                    {task.completed ? (
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                    ) : (
                      <Circle className="h-4 w-4 text-gray-500" />
                    )}
                    <span className="text-sm text-gray-300">{task.text}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex space-x-3 pt-4">
        <button className="flex-1 px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700">
          Generate Code Stubs
        </button>
        <button className="flex-1 px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700">
          Add to Project
        </button>
        <button className="flex-1 px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700">
          Export Plan
        </button>
      </div>
    </div>
  );
}