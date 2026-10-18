import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize the Gemini API
const API_KEY = process.env.NEXT_PUBLIC_GEMINI_API_KEY;

let genAI = null;
let model = null;

// Initialize the AI model
export const initializeGemini = () => {
    if (!API_KEY || API_KEY === 'your_api_key_here') {
        console.error('Gemini API key is not configured');
        return false;
    }

    try {
        genAI = new GoogleGenerativeAI(API_KEY);
        model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });
        return true;
    } catch (error) {
        console.error('Error initializing Gemini:', error);
        return false;
    }
};

// System prompt for educational assistant
const SYSTEM_CONTEXT = `You are an AI learning assistant for an LMS (Learning Management System). 
Your role is to help students with:
- Understanding course concepts
- Preparing for exams
- Clarifying doubts
- Providing study tips and guidance
- Explaining topics in simple, easy-to-understand language

Be helpful, encouraging, and concise in your responses. Keep responses focused and educational.`;

// Send a message to Gemini and get response
export const sendMessage = async (userMessage, conversationHistory = []) => {
    if (!model) {
        const initialized = initializeGemini();
        if (!initialized) {
            throw new Error('AI service is not properly configured. Please check your API key.');
        }
    }

    try {
        const fullPrompt = conversationHistory.length > 0
            ? `${SYSTEM_CONTEXT}\n\nConversation history:\n${conversationHistory.map(msg =>
                `${msg.role === 'user' ? 'Student' : 'Assistant'}: ${msg.text}`
            ).join('\n')}\n\nStudent: ${userMessage}\nAssistant:`
            : `${SYSTEM_CONTEXT}\n\nStudent: ${userMessage}\nAssistant:`;

        const result = await model.generateContent(fullPrompt);
        const response = await result.response;
        const text = response.text();

        return text;
    } catch (error) {
        console.error('Error sending message to Gemini:', error);

        if (error.message?.includes('API key')) {
            throw new Error('Invalid API key. Please check your configuration.');
        } else if (error.message?.includes('quota')) {
            throw new Error('API quota exceeded. Please try again later.');
        } else {
            throw new Error('Failed to get response. Please check your internet connection and try again.');
        }
    }
};

export const clearConversation = () => {
    return true;
};
