'use client';

import React, { useState, useRef, useEffect } from 'react';
import { sendMessage } from '../../../lib/geminiService';
import { Sparkles, Send, Trash2, AlertCircle } from 'lucide-react';

export default function ChatPage() {
    const [messages, setMessages] = useState([
        {
            id: '1',
            text: "Hi! I'm your AI learning assistant. I'm here to help you with your studies, answer questions, and provide guidance. How can I help you today?",
            role: 'ai',
            timestamp: new Date()
        }
    ]);
    const [inputText, setInputText] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSend = async () => {
        if (!inputText.trim() || isLoading) return;

        const userMessage = inputText.trim();
        setInputText('');

        const newUserMessage = {
            id: Date.now().toString(),
            text: userMessage,
            role: 'user',
            timestamp: new Date()
        };

        setMessages(prev => [...prev, newUserMessage]);
        setIsLoading(true);

        try {
            const conversationHistory = messages.slice(-10).map(msg => ({
                role: msg.role === 'user' ? 'user' : 'ai',
                text: msg.text
            }));

            const aiResponse = await sendMessage(userMessage, conversationHistory);

            const newAIMessage = {
                id: (Date.now() + 1).toString(),
                text: aiResponse,
                role: 'ai',
                timestamp: new Date()
            };

            setMessages(prev => [...prev, newAIMessage]);
        } catch (error) {
            console.error('Chat error:', error);

            const errorMessage = {
                id: (Date.now() + 1).toString(),
                text: error.message || "I'm having trouble connecting right now. Please check your internet connection and try again.",
                role: 'ai',
                timestamp: new Date(),
                isError: true
            };
            setMessages(prev => [...prev, errorMessage]);
        } finally {
            setIsLoading(false);
        }
    };

    const clearChat = () => {
        if (!confirm('Are you sure you want to clear the conversation?')) return;

        setMessages([{
            id: '1',
            text: "Hi! I'm your AI learning assistant. How can I help you today?",
            role: 'ai',
            timestamp: new Date()
        }]);
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    return (
        <div className="flex flex-col h-[calc(100vh-80px)] max-w-4xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-white">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                        <Sparkles className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h1 className="font-bold text-gray-900">AI Assistant</h1>
                        <p className="text-xs text-gray-500">Always here to help</p>
                    </div>
                </div>
                <button
                    onClick={clearChat}
                    className="p-2 hover:bg-gray-100 rounded-lg text-gray-500"
                    title="Clear Chat"
                >
                    <Trash2 className="w-5 h-5" />
                </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
                {messages.map((message) => {
                    const isUser = message.role === 'user';

                    return (
                        <div
                            key={message.id}
                            className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
                        >
                            <div className={`max-w-[80%] rounded-2xl p-4 ${isUser
                                    ? 'bg-blue-600 text-white'
                                    : message.isError
                                        ? 'bg-red-50 border border-red-200 text-red-700'
                                        : 'bg-white border border-gray-100 text-gray-800 shadow-sm'
                                }`}>
                                {message.isError && (
                                    <div className="flex items-center gap-2 mb-2">
                                        <AlertCircle className="w-4 h-4" />
                                        <span className="text-xs font-bold">Error</span>
                                    </div>
                                )}
                                <p className="text-sm whitespace-pre-wrap">{message.text}</p>
                                <p className={`text-xs mt-2 ${isUser ? 'text-blue-200' : 'text-gray-400'}`}>
                                    {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </p>
                            </div>
                        </div>
                    );
                })}

                {isLoading && (
                    <div className="flex justify-start">
                        <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
                            <div className="flex items-center gap-2">
                                <div className="flex gap-1">
                                    <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                                    <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                                    <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                                </div>
                                <span className="text-sm text-gray-500">Thinking...</span>
                            </div>
                        </div>
                    </div>
                )}

                <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-4 border-t border-gray-200 bg-white">
                <div className="flex items-end gap-3">
                    <textarea
                        value={inputText}
                        onChange={(e) => setInputText(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Ask me anything..."
                        disabled={isLoading}
                        rows={1}
                        maxLength={500}
                        className="flex-1 px-4 py-3 bg-gray-100 rounded-2xl resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                        style={{ minHeight: '48px', maxHeight: '120px' }}
                    />
                    <button
                        onClick={handleSend}
                        disabled={!inputText.trim() || isLoading}
                        className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${inputText.trim() && !isLoading
                                ? 'bg-blue-600 text-white hover:bg-blue-700'
                                : 'bg-gray-200 text-gray-400'
                            }`}
                    >
                        <Send className="w-5 h-5" />
                    </button>
                </div>
                <p className="text-xs text-gray-400 text-center mt-2">
                    Press Enter to send, Shift+Enter for new line
                </p>
            </div>
        </div>
    );
}
