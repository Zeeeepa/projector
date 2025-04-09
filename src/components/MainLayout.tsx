import React, { useState } from 'react';
import StepGuide from './StepGuide';
import TreeView from './TreeView';
import { ChatInterface } from './ChatInterface';

// Sample data for demonstration
const sampleTreeData = [
  {
    id: '1',
    name: 'E-Commerce Platform',
    progress: 65,
    completed: false,
    children: [
      {
        id: '1-1',
        name: 'User Authentication',
        progress: 100,
        completed: true,
        children: [
          { id: '1-1-1', name: 'Database Schema', progress: 100, completed: true },
          { id: '1-1-2', name: 'Basic Auth Endpoints', progress: 100, completed: true },
          { id: '1-1-3', name: 'Social Login', progress: 100, completed: true },
          { id: '1-1-4', name: 'Password Reset', progress: 100, completed: true },
          { id: '1-1-5', name: 'Two-Factor Auth', progress: 0, completed: false }
        ]
      },
      {
        id: '1-2',
        name: 'Product Catalog',
        progress: 75,
        completed: false,
        children: [
          { id: '1-2-1', name: 'Database Schema', progress: 100, completed: true },
          { id: '1-2-2', name: 'Basic CRUD API', progress: 100, completed: true },
          { id: '1-2-3', name: 'Search Functionality', progress: 100, completed: true },
          { id: '1-2-4', name: 'Filtering Options', progress: 0, completed: false },
          { id: '1-2-5', name: 'Sorting Options', progress: 0, completed: false }
        ]
      },
      {
        id: '1-3',
        name: 'Shopping Cart',
        progress: 50,
        completed: false,
        children: [
          { id: '1-3-1', name: 'Database Schema', progress: 100, completed: true },
          { id: '1-3-2', name: 'Add/Remove Items', progress: 100, completed: true },
          { id: '1-3-3', name: 'Update Quantities', progress: 0, completed: false },
          { id: '1-3-4', name: 'Save for Later', progress: 0, completed: false },
          { id: '1-3-5', name: 'Cart Recovery', progress: 0, completed: false }
        ]
      },
      {
        id: '1-4',
        name: 'Checkout Process',
        progress: 0,
        completed: false,
        children: [
          { id: '1-4-1', name: 'Payment Integration', progress: 0, completed: false },
          { id: '1-4-2', name: 'Order Confirmation', progress: 0, completed: false },
          { id: '1-4-3', name: 'Email Notifications', progress: 0, completed: false },
          { id: '1-4-4', name: 'Order History', progress: 0, completed: false }
        ]
      }
    ]
  }
];

const sampleStepGuideData = {
  projectId: 'proj1',
  featureName: 'Two-Factor Authentication',
  featureDescription: 'Implement TOTP-based two-factor authentication for enhanced security with backup codes and device remembering functionality.',
  dependencies: [
    { id: 'dep1', name: 'User Authentication Module', completed: true }
  ],
  steps: [
    {
      id: 'step1',
      title: 'Update User Schema',
      description: 'Add necessary fields to the user schema',
      completed: false,
      subtasks: [
        { id: 'task1-1', title: 'Add TOTP secret field', completed: false },
        { id: 'task1-2', title: 'Add backup codes field', completed: false },
        { id: 'task1-3', title: 'Add 2FA enabled flag', completed: false }
      ]
    },
    {
      id: 'step2',
      title: 'Implement TOTP Generation',
      description: 'Create functionality for TOTP generation',
      completed: false,
      subtasks: [
        { id: 'task2-1', title: 'Add pyotp library', completed: true },
        { id: 'task2-2', title: 'Create secret generation function', completed: true },
        { id: 'task2-3', title: 'Implement QR code generation', completed: false }
      ]
    },
    {
      id: 'step3',
      title: 'Create API Endpoints',
      description: 'Implement necessary API endpoints',
      completed: false,
      subtasks: [
        { id: 'task3-1', title: 'Enable/disable 2FA endpoint', completed: false },
        { id: 'task3-2', title: 'Verify TOTP code endpoint', completed: false },
        { id: 'task3-3', title: 'Generate backup codes endpoint', completed: false }
      ]
    },
    {
      id: 'step4',
      title: 'Update Login Flow',
      description: 'Modify the login process to include 2FA',
      completed: false,
      subtasks: [
        { id: 'task4-1', title: 'Modify authentication process', completed: false },
        { id: 'task4-2', title: 'Add 2FA verification step', completed: false },
        { id: 'task4-3', title: 'Implement remember device functionality', completed: false }
      ]
    },
    {
      id: 'step5',
      title: 'Create Frontend Components',
      description: 'Build UI components for 2FA',
      completed: false,
      subtasks: [
        { id: 'task5-1', title: '2FA setup page', completed: false },
        { id: 'task5-2', title: 'TOTP verification modal', completed: false },
        { id: 'task5-3', title: 'Backup codes display', completed: false }
      ]
    },
    {
      id: 'step6',
      title: 'Testing and Documentation',
      description: 'Test and document the 2FA implementation',
      completed: false,
      subtasks: [
        { id: 'task6-1', title: 'Unit tests for all components', completed: false },
        { id: 'task6-2', title: 'Integration tests for the flow', completed: false },
        { id: 'task6-3', title: 'User documentation', completed: false }
      ]
    }
  ]
};

const MainLayout: React.FC = () => {
  const [activeTab, setActiveTab] = useState('project1');
  
  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b p-4 flex justify-between items-center shadow-sm">
        <div className="flex space-x-4">
          <button className="px-4 py-2 bg-gray-200 rounded-md hover:bg-gray-300 transition">Settings</button>
          <button className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition">Dashboard</button>
        </div>
        <button className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 transition flex items-center">
          <span className="mr-1 font-bold">+</span> Add Project
        </button>
      </header>
      
      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar - Step Guide */}
        <div className="w-1/4 border-r bg-white overflow-auto">
          <StepGuide {...sampleStepGuideData} />
        </div>
        
        {/* Middle Section - Project Tabs */}
        <div className="flex-1 flex flex-col overflow-hidden bg-white">
          {/* Tabs */}
          <div className="flex border-b bg-gray-50">
            <button 
              className={`px-4 py-2 ${activeTab === 'project1' ? 'border-b-2 border-blue-500 bg-white' : 'hover:bg-gray-100'}`}
              onClick={() => setActiveTab('project1')}
            >
              Project1
            </button>
            <button 
              className={`px-4 py-2 ${activeTab === 'project2' ? 'border-b-2 border-blue-500 bg-white' : 'hover:bg-gray-100'}`}
              onClick={() => setActiveTab('project2')}
            >
              Project2
            </button>
            <button className="px-2 py-2 text-gray-500 hover:bg-gray-100">X</button>
          </div>
          
          {/* Project Content */}
          <div className="flex-1 overflow-auto p-4">
            <div className="mb-4">
              <h2 className="text-xl font-semibold mb-2">Project's context document View</h2>
              <div className="p-4 border rounded-lg bg-white shadow-sm">
                <p className="text-gray-700">This document contains important information about the project requirements, goals, and constraints. You can add or modify content here to update the project specifications.</p>
              </div>
            </div>
            
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center space-x-2">
                <span className="font-medium">Concurrency</span>
                <input 
                  type="number" 
                  min="1" 
                  max="10" 
                  defaultValue="2" 
                  className="w-16 p-1 border rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500" 
                />
              </div>
              <button className="px-3 py-1 bg-gray-200 rounded hover:bg-gray-300 transition">Project Settings</button>
            </div>
          </div>
        </div>
        
        {/* Right Sidebar - Tree View */}
        <div className="w-1/4 border-l bg-white overflow-auto">
          <div className="p-2">
            <div className="flex justify-between items-center mb-2">
              <h3 className="font-semibold">Tree Structure</h3>
              <div className="text-sm text-gray-500">Completion: <span className="font-medium">[65%]</span></div>
            </div>
            <TreeView data={sampleTreeData} />
          </div>
        </div>
      </div>
      
      {/* Chat Interface */}
      <div className="border-t bg-gray-800 p-4">
        <ChatInterface />
      </div>
    </div>
  );
};

export default MainLayout;
