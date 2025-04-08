import React, { useState } from 'react';
import { useChatStore, useProjectStore } from '../store';

export function ChatInterface() {
  const [message, setMessage] = useState('');
  const { messages, addMessage } = useChatStore();
  const activeProject = useProjectStore((state) => state.activeProject);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;

    addMessage({
      content: message,
      sender: 'user',
      projectId: activeProject?.id,
    });

    // Simulate AI response
    setTimeout(() => {
      addMessage({
        content: `Processing request for project: ${activeProject?.name || 'Unknown'}. I'll analyze the documentation and prepare PR requests for the GitHub repository at ${activeProject?.githubUrl || 'undefined URL'}.`,
        sender: 'ai',
        projectId: activeProject?.id,
      });
    }, 1000);

    setMessage('');
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
          />
          <button
            type="submit"
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700"
          >
            Send
          </button>
        </div>
      </form>
    </div>
  );
}