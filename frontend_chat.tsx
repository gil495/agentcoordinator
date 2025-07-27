import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, CheckCircle, XCircle, Clock } from 'lucide-react';

const ChatInterface = () => {
  const [messages, setMessages] = useState([
    {
      id: '1',
      type: 'bot',
      content: '👋 Hi! I can help you coordinate tasks across your SaaS tools. Try saying something like:\n\n"Send a follow-up email to the leads from yesterday\'s Zoom call. Get their contact info from HubSpot, pull the meeting notes from Notion, and email them through Gmail."',
      timestamp: new Date(),
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const sendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    const userMessage = {
      id: Date.now().toString(),
      type: 'user',
      content: inputMessage,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);

    try {
      // In a real app, replace with your backend URL
      const response = await fetch('http://localhost:8000/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message: inputMessage }),
      });

      if (!response.ok) {
        throw new Error('Failed to get response');
      }

      const data = await response.json();

      // Add agent thinking message
      const thinkingMessage = {
        id: (Date.now() + 1).toString(),
        type: 'bot',
        content: '🤔 Breaking down your request...',
        timestamp: new Date(),
        isThinking: true,
      };
      setMessages(prev => [...prev, thinkingMessage]);

      // Simulate processing delay
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Add subtask execution messages
      if (data.subtasks && data.subtasks.length > 0) {
        for (let i = 0; i < data.subtasks.length; i++) {
          const subtask = data.subtasks[i];
          const subtaskMessage = {
            id: (Date.now() + i + 2).toString(),
            type: 'bot',
            content: `🔄 Executing ${subtask.agent} agent: ${subtask.action}...`,
            timestamp: new Date(),
            isSubtask: true,
          };
          setMessages(prev => [...prev, subtaskMessage]);
          
          // Simulate execution delay
          await new Promise(resolve => setTimeout(resolve, 1500));
          
          // Update with result
          const resultIcon = subtask.result?.status === 'success' ? '✅' : '❌';
          const resultMessage = {
            id: (Date.now() + i + 10).toString(),
            type: 'bot',
            content: `${resultIcon} ${subtask.agent}: ${subtask.result?.message || 'Completed'}`,
            timestamp: new Date(),
            isResult: true,
          };
          setMessages(prev => [...prev, resultMessage]);
        }
      }

      // Add final response
      const botMessage = {
        id: (Date.now() + 100).toString(),
        type: 'bot',
        content: data.chat_response,
        timestamp: new Date(),
        taskData: data,
      };

      setMessages(prev => [...prev, botMessage]);

    } catch (error) {
      const errorMessage = {
        id: (Date.now() + 1).toString(),
        type: 'bot',
        content: '❌ Sorry, I encountered an error processing your request. Make sure the backend is running on localhost:8000.',
        timestamp: new Date(),
        isError: true,
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const formatTime = (timestamp) => {
    return timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
            <Bot className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-gray-900">Multi-Agent Assistant</h1>
            <p className="text-sm text-gray-500">Coordinate tasks across your SaaS tools</p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
        {messages.map((message) => (
          <div key={message.id} className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`flex space-x-3 max-w-3xl ${message.type === 'user' ? 'flex-row-reverse space-x-reverse' : 'flex-row'}`}>
              {/* Avatar */}
              <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                message.type === 'user' 
                  ? 'bg-blue-600' 
                  : message.isThinking 
                    ? 'bg-yellow-500' 
                    : message.isSubtask 
                      ? 'bg-purple-500'
                      : message.isResult
                        ? 'bg-green-500'
                        : message.isError
                          ? 'bg-red-500'
                          : 'bg-gray-600'
              }`}>
                {message.type === 'user' ? (
                  <User className="w-5 h-5 text-white" />
                ) : message.isThinking ? (
                  <Clock className="w-5 h-5 text-white" />
                ) : message.isResult ? (
                  <CheckCircle className="w-5 h-5 text-white" />
                ) : message.isError ? (
                  <XCircle className="w-5 h-5 text-white" />
                ) : (
                  <Bot className="w-5 h-5 text-white" />
                )}
              </div>

              {/* Message Content */}
              <div className={`flex flex-col space-y-1 ${message.type === 'user' ? 'items-end' : 'items-start'}`}>
                <div className={`px-4 py-2 rounded-lg ${
                  message.type === 'user'
                    ? 'bg-blue-600 text-white'
                    : message.isThinking
                      ? 'bg-yellow-50 text-yellow-800 border border-yellow-200'
                      : message.isSubtask
                        ? 'bg-purple-50 text-purple-800 border border-purple-200'
                        : message.isResult
                          ? 'bg-green-50 text-green-800 border border-green-200'
                          : message.isError
                            ? 'bg-red-50 text-red-800 border border-red-200'
                            : 'bg-white text-gray-900 border border-gray-200'
                }`}>
                  <p className="whitespace-pre-wrap text-sm">{message.content}</p>
                </div>
                <span className="text-xs text-gray-500">{formatTime(message.timestamp)}</span>
              </div>
            </div>
          </div>
        ))}
        
        {isLoading && (
          <div className="flex justify-start">
            <div className="flex space-x-3 max-w-3xl">
              <div className="w-8 h-8 bg-gray-600 rounded-full flex items-center justify-center">
                <Bot className="w-5 h-5 text-white" />
              </div>
              <div className="bg-white border border-gray-200 px-4 py-2 rounded-lg">
                <div className="flex items-center space-x-2">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                    <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  </div>
                  <span className="text-sm text-gray-600">Processing...</span>
                </div>
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="bg-white border-t border-gray-200 px-6 py-4">
        <div className="flex space-x-4">
          <div className="flex-1 relative">
            <textarea
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type your task here... (e.g., 'Send follow-up emails to leads from yesterday's call')"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              rows="1"
              style={{ minHeight: '48px', maxHeight: '120px' }}
              disabled={isLoading}
            />
          </div>
          <button
            onClick={sendMessage}
            disabled={!inputMessage.trim() || isLoading}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
          >
            <Send className="w-4 h-4" />
            <span>Send</span>
          </button>
        </div>
        
        {/* Sample prompts */}
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            onClick={() => setInputMessage("Send a follow-up email to the leads from yesterday's Zoom call. Get their contact info from HubSpot, pull the meeting notes from Notion, and email them through Gmail.")}
            className="px-3 py-1 text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-full transition-colors"
            disabled={isLoading}
          >
            💼 Follow-up email workflow
          </button>
          <button
            onClick={() => setInputMessage("Get all leads from HubSpot and create a summary in Notion.")}
            className="px-3 py-1 text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-full transition-colors"
            disabled={isLoading}
          >
            📊 Lead summary
          </button>
          <button
            onClick={() => setInputMessage("Pull meeting notes from Notion and send them via Gmail to the attendees.")}
            className="px-3 py-1 text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-full transition-colors"
            disabled={isLoading}
          >
            📝 Share meeting notes
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatInterface;