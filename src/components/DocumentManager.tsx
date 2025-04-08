import React, { useState, useRef } from 'react';
import { useProjectStore } from '../store';
import { apiService } from '../services/api';
import { Trash2 } from 'lucide-react';

export function DocumentManager() {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const { activeProject, addDocument, removeDocument, apiSettings } = useProjectStore();

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!activeProject) return;
    
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    setIsUploading(true);
    setError(null);
    
    try {
      // Update API settings if they've changed
      apiService.updateSettings(apiSettings);
      
      // Upload each file
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        
        // Determine document category based on file name or extension
        let category = 'requirements';
        if (file.name.includes('architecture') || file.name.endsWith('.arch.md')) {
          category = 'architecture';
        } else if (file.name.includes('implementation') || file.name.endsWith('.impl.md')) {
          category = 'implementation';
        }
        
        // Upload the document
        const message = await apiService.uploadDocument(activeProject.id, file, category);
        
        // Add document to the project in the store
        addDocument(activeProject.id, file.name);
      }
      
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (err) {
      console.error('Error uploading document:', err);
      setError(err instanceof Error ? err.message : 'Failed to upload document');
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemoveDocument = async (document: string) => {
    if (!activeProject) return;
    
    try {
      // In a real implementation, you would call an API to remove the document
      // For now, we'll just update the local state
      removeDocument(activeProject.id, document);
    } catch (err) {
      console.error('Error removing document:', err);
      setError(err instanceof Error ? err.message : 'Failed to remove document');
    }
  };

  if (!activeProject) {
    return <div className="text-gray-400">No active project</div>;
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="p-2 bg-red-900 text-red-100 rounded text-sm">
          {error}
        </div>
      )}
      
      <div className="flex items-center space-x-2">
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileUpload}
          className="hidden"
          accept=".md,.txt,.pdf"
          multiple
          disabled={isUploading}
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          className={`px-3 py-1 text-sm font-medium rounded-md shadow-sm text-white ${
            isUploading ? 'bg-indigo-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700'
          }`}
          disabled={isUploading}
        >
          {isUploading ? 'Uploading...' : 'Upload Document'}
        </button>
        <span className="text-xs text-gray-400">
          Supports .md, .txt, .pdf
        </span>
      </div>
      
      {activeProject.documentation.length > 0 ? (
        <ul className="space-y-2">
          {activeProject.documentation.map((doc) => (
            <li key={doc} className="flex items-center justify-between bg-gray-700 rounded-md p-2">
              <span className="text-sm text-gray-200 truncate">{doc}</span>
              <div className="flex space-x-2">
                <button
                  onClick={() => handleRemoveDocument(doc)}
                  className="text-xs text-red-400 hover:text-red-300"
                  disabled={isUploading}
                >
                  Remove
                </button>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <div className="text-sm text-gray-400">
          No documents uploaded yet. Upload documents to help the AI understand your project.
        </div>
      )}
    </div>
  );
}