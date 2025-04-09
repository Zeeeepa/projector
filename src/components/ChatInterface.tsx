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
    <div className="bg-gray-900 rounded-lg shadow-lg">
      <div className="p-4 border-b border-gray-700">
        <h3 className="text-lg font-medium text-gray-100">Chat Interface</h3>
      </div>
      <div className="p-4 h-64 overflow-y-auto bg-gray-800">
        <div className="space-y-4">
          {messages.length === 0 && (
            <div className="text-center text-gray-500 py-4">
              <p>No messages yet. Start a conversation!</p>
            </div>
          )}
          {messages.map((msg) => (
            <div key={msg.id} className="flex items-start">
              <div className="flex-shrink-0">
                <div className={`h-8 w-8 rounded-full ${msg.sender === 'ai' ? 'bg-blue-600' : 'bg-gray-600'} flex items-center justify-center`}>
                  <span className="text-sm font-medium text-gray-100">{msg.sender === 'ai' ? 'AI' : 'You'}</span>
                </div>
              </div>
              <div className={`ml-3 rounded-lg p-3 max-w-3xl ${msg.sender === 'ai' ? 'bg-gray-700' : 'bg-blue-600'}`}>
                <p className="text-sm text-gray-200 whitespace-pre-wrap">{msg.content}</p>
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <div className="h-8 w-8 rounded-full bg-blue-600 flex items-center justify-center">
                  <span className="text-sm font-medium text-gray-100">AI</span>
                </div>
              </div>
              <div className="ml-3 bg-gray-700 rounded-lg p-3">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse delay-100"></div>
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse delay-200"></div>
                  <span className="text-sm text-gray-400">Thinking...</span>
                </div>
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
            className="flex-1 rounded-md bg-gray-700 border-gray-600 text-gray-100 px-4 py-2 text-sm focus:ring-blue-500 focus:border-blue-500"
            disabled={isLoading}
          />
          <button
            type="submit"
            className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white ${
              isLoading ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
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
