import React, { useState } from 'react';
import { useChatStore, useProjectStore } from '../store';
import { apiService } from '../services/api';

export function ChatInterface() {
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { messages, addMessage } = useChatStore();
  const activeProject = useProjectStore((state) => state.activeProject);
  const apiSettings = useProjectStore((state) => state.apiSettings);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;

    addMessage({
      content: message,
      sender: 'user',
      projectId: activeProject?.id,
    });

    setIsLoading(true);

    try {
      apiService.updateSettings(apiSettings);

      const response = await apiService.sendChatMessage(
        message,
        activeProject?.id,
        messages
      );

      addMessage({
        content: response.response,
        sender: 'ai',
        projectId: activeProject?.id,
      });
    } catch (error) {
      console.error('Error sending message:', error);

      addMessage({
        content: `Error: ${error instanceof Error ? error.message : 'Failed to send message'}`,
        sender: 'ai',
        projectId: activeProject?.id,
      });
    } finally {
      setIsLoading(false);
      setMessage('');
    }
  };

  return (
    <div className="mt-6 bg-gray-800 rounded-lg shadow">
      <div className="p-4 border-b border-gray-700">
        <h3 className="text-lg font-medium text-gray-100">Chat Interface</h3>
      </div>
      <div className="p-4 h-64 overflow-y-auto">
        <div className="space-y-4">
          {messages.map((msg) => (
            <div key={msg.id} className="flex items-start">
              <div className="flex-shrink-0">
                <div className={`h-8 w-8 rounded-full ${msg.sender === 'ai' ? 'bg-indigo-900' : 'bg-gray-700'} flex items-center justify-center`}>
                  <span className="text-sm font-medium text-gray-100">{msg.sender === 'ai' ? 'AI' : 'You'}</span>
                </div>
              </div>
              <div className="ml-3">
                <p className="text-sm text-gray-300">{msg.content}</p>
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <div className="h-8 w-8 rounded-full bg-indigo-900 flex items-center justify-center">
                  <span className="text-sm font-medium text-gray-100">AI</span>
                </div>
              </div>
              <div className="ml-3">
                <p className="text-sm text-gray-300">Thinking...</p>
              </div>
            </div>
          )}
        </div>
      </div>
      <form onSubmit={handleSubmit} className="p-4 border-t border-gray-700">
        <div className="flex space-x-3">
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Type your message..."
            className="flex-1 rounded-md bg-gray-700 border-gray-600 text-gray-100 px-4 py-2 text-sm focus:ring-indigo-500 focus:border-indigo-500"
            disabled={isLoading}
          />
          <button
            type="submit"
            className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white ${
              isLoading ? 'bg-indigo-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700'
            }`}
            disabled={isLoading}
          >
            {isLoading ? 'Sending...' : 'Send'}
          </button>
        </div>
      </form>
    </div>
  );
}