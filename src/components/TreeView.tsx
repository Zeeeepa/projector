import React, { useState } from 'react';

interface TreeNode {
  id: string;
  name: string;
  progress: number;
  completed: boolean;
  children?: TreeNode[];
}

interface TreeViewProps {
  data: TreeNode[];
}

const TreeView: React.FC<TreeViewProps> = ({ data }) => {
  const [activeTab, setActiveTab] = useState('structure');
  
  const renderTreeNode = (node: TreeNode, level: number = 0) => {
    const isCompleted = node.completed;
    const hasChildren = node.children && node.children.length > 0;
    
    // Unicode box drawing characters for the tree structure
    const getPrefix = (index: number, total: number, level: number) => {
      if (level === 0) return '';
      
      const isLast = index === total - 1;
      return isLast ? '\u2514\u2500\u2500 ' : '\u251c\u2500\u2500 ';
    };
    
    const getChildPrefix = (index: number, total: number) => {
      const isLast = index === total - 1;
      return isLast ? '    ' : '\u2502   ';
    };
    
    // Determine color based on progress
    const getProgressColor = (progress: number) => {
      if (progress === 100) return 'text-green-500';
      if (progress >= 50) return 'text-yellow-500';
      if (progress > 0) return 'text-orange-400';
      return 'text-gray-500';
    };
    
    return (
      <div key={node.id} className="font-mono">
        <div className="flex items-center py-1 hover:bg-gray-700">
          {level > 0 && (
            <span className="text-gray-400">
              {getPrefix(0, 1, level)}
            </span>
          )}
          <span className="font-medium text-gray-200">{node.name}</span>
          {node.progress !== undefined && (
            <span className={`ml-2 ${getProgressColor(node.progress)}`}>[{node.progress}%]</span>
          )}
          <span className={`ml-2 ${isCompleted ? 'text-green-500' : 'text-gray-500'}`}>
            {isCompleted ? '[\u2713]' : '[ ]'}
          </span>
        </div>
        
        {hasChildren && (
          <div className="ml-4">
            {node.children!.map((child, index) => (
              <div key={child.id} className="flex">
                <div className="text-gray-400 mr-1">
                  {getChildPrefix(index, node.children!.length)}
                </div>
                <div className="flex-1">
                  {renderTreeNode(child, level + 1)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="border border-gray-700 rounded-lg overflow-auto bg-gray-800 shadow-md">
      <div className="flex space-x-4 mb-2 border-b border-gray-700 p-2">
        <button 
          className={`font-medium ${activeTab === 'structure' ? 'text-blue-400 border-b-2 border-blue-500' : 'text-gray-400 hover:text-gray-200'}`}
          onClick={() => setActiveTab('structure')}
        >
          Tree Structure
        </button>
        <button 
          className={`font-medium ${activeTab === 'component' ? 'text-blue-400 border-b-2 border-blue-500' : 'text-gray-400 hover:text-gray-200'}`}
          onClick={() => setActiveTab('component')}
        >
          Component Integration
        </button>
        <button 
          className={`font-medium ${activeTab === 'completion' ? 'text-blue-400 border-b-2 border-blue-500' : 'text-gray-400 hover:text-gray-200'}`}
          onClick={() => setActiveTab('completion')}
        >
          Completion
        </button>
      </div>
      
      <div className="p-2 space-y-1">
        {data.map(node => renderTreeNode(node))}
      </div>
    </div>
  );
};

export default TreeView;
