import React from 'react';

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
  const renderTreeNode = (node: TreeNode, level: number = 0) => {
    const isCompleted = node.completed;
    const hasChildren = node.children && node.children.length > 0;
    
    // Unicode box drawing characters for the tree structure
    const getPrefix = (index: number, total: number, level: number) => {
      if (level === 0) return '';
      
      const isLast = index === total - 1;
      return isLast ? '└── ' : '├── ';
    };
    
    const getChildPrefix = (index: number, total: number) => {
      const isLast = index === total - 1;
      return isLast ? '    ' : '│   ';
    };
    
    return (
      <div key={node.id} className="font-mono">
        <div className="flex items-center">
          {level > 0 && (
            <span className="text-gray-500">
              {getPrefix(0, 1, level)}
            </span>
          )}
          <span className="font-medium">{node.name}</span>
          {node.progress !== undefined && (
            <span className="ml-2 text-gray-500">[{node.progress}%]</span>
          )}
          <span className="ml-2">
            {isCompleted ? '[✓]' : '[ ]'}
          </span>
        </div>
        
        {hasChildren && (
          <div className="ml-4">
            {node.children!.map((child, index) => (
              <div key={child.id} className="flex">
                <div className="text-gray-500 mr-1">
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
    <div className="p-4 border rounded-lg overflow-auto">
      <div className="flex space-x-4 mb-4 border-b pb-2">
        <button className="font-medium text-blue-600">Tree Structure</button>
        <button className="font-medium text-gray-500">Component Integration</button>
        <button className="font-medium text-gray-500">Completion</button>
      </div>
      
      <div className="space-y-2">
        {data.map(node => renderTreeNode(node))}
      </div>
    </div>
  );
};

export default TreeView;
