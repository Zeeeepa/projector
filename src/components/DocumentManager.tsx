import React, { useState } from 'react';
import { useProjectStore } from '../store';
import { Trash2 } from 'lucide-react';

export function DocumentManager() {
  const { activeProject, addDocument, removeDocument } = useProjectStore();
  const [newDocument, setNewDocument] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeProject || !newDocument.trim()) return;
    
    addDocument(activeProject.id, newDocument);
    setNewDocument('');
  };

  const handleRemove = (document: string) => {
    if (!activeProject) return;
    removeDocument(activeProject.id, document);
  };

  if (!activeProject) return null;

  return (
    <div className="space-y-4">
      <form onSubmit={handleSubmit} className="flex space-x-2">
        <input
          type="text"
          value={newDocument}
          onChange={(e) => setNewDocument(e.target.value)}
          placeholder="Add markdown document URL or content..."
          className="flex-1 rounded-md bg-gray-700 border-gray-600 text-gray-100 px-3 py-2 text-sm"
        />
        <button
          type="submit"
          className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700"
        >
          Add
        </button>
      </form>

      <div className="space-y-2">
        {activeProject.documentation.map((doc, index) => (
          <div
            key={index}
            className="flex items-center justify-between p-2 bg-gray-700 rounded-md"
          >
            <span className="text-sm text-gray-200 truncate flex-1">{doc}</span>
            <button
              onClick={() => handleRemove(doc)}
              className="ml-2 text-gray-400 hover:text-red-400"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}