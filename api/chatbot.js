const fs = require('fs');
const path = require('path');
const { SimpleVectorStore } = require('../scraper');

// Initialize chatbot knowledge base
let chatbotVectorStore = null;

function initializeChatbot() {
    try {
        // Try to load the new knowledge base from extracted text first
        let knowledgeData;
        try {
            const textPath = path.join(process.cwd(), 'chatbot_knowledge_from_text.json');
            knowledgeData = JSON.parse(fs.readFileSync(textPath, 'utf8'));
            console.log('Using knowledge base from extracted website text');
        } catch (textError) {
            // Fallback to original knowledge base
            console.log('Falling back to original knowledge base');
            const originalPath = path.join(process.cwd(), 'chatbot_knowledge.json');
            const originalData = JSON.parse(fs.readFileSync(originalPath, 'utf8'));
            knowledgeData = originalData.documents ? originalData.documents : originalData;
        }
        
        chatbotVectorStore = new SimpleVectorStore();
        
        // Handle both formats: array of knowledge segments or documents array
        const segments = Array.isArray(knowledgeData) ? knowledgeData : knowledgeData.documents;
        
        if (!segments || segments.length === 0) {
            throw new Error('No knowledge segments found');
        }
        
        segments.forEach(segment => {
            if (segment.content) {
                // New format from text extraction
                chatbotVectorStore.addDocument(segment.content, {
                    section: segment.section,
                    keywords: segment.keywords,
                    id: segment.id
                });
            } else if (segment.text) {
                // Original format
                chatbotVectorStore.addDocument(segment.text, {
                    category: segment.category,
                    keywords: segment.keywords,
                    id: segment.id
                });
            }
        });
        
        console.log(`Chatbot initialized with ${segments.length} knowledge segments`);
        return true;
    } catch (error) {
        console.error('Failed to initialize chatbot:', error);
        chatbotVectorStore = null;
        return false;
    }
}

// Initialize on first load
if (!chatbotVectorStore) {
    initializeChatbot();
}

export default async function handler(req, res) {
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { message } = req.body;
        
        if (!message || typeof message !== 'string') {
            return res.status(400).json({ 
                error: 'Message is required and must be a string' 
            });
        }

        // Check if chatbot is initialized, try to reinitialize if not
        if (!chatbotVectorStore) {
            console.log('Chatbot not initialized, attempting to reinitialize...');
            const initialized = initializeChatbot();
            if (!initialized) {
                return res.status(500).json({ 
                    error: 'Chatbot service is currently unavailable. Please try again later.' 
                });
            }
        }

        // Search for relevant information
        const searchResults = chatbotVectorStore.search(message, 3);
        
        let response = '';
        
        // Generate response based on message content and search results
        const lowerMessage = message.toLowerCase();
        
        if (lowerMessage.includes('hello') || lowerMessage.includes('hi') || lowerMessage.includes('hey')) {
            response = "Hello! I'm here to help you with insurance-related questions. How can I assist you today?";
        } else if (lowerMessage.includes('thank') || lowerMessage.includes('thanks')) {
            response = "You're welcome! Is there anything else I can help you with regarding insurance?";
        } else if (searchResults.length > 0) {
            // Use search results to generate response
            const topResult = searchResults[0];
            response = `Based on our insurance information: ${topResult.content}`;
            
            // Add additional context if available
            if (searchResults.length > 1) {
                response += `\n\nAdditionally: ${searchResults[1].content}`;
            }
        } else {
            // Default response when no relevant information is found
            response = "I'd be happy to help you with insurance-related questions. Could you please provide more specific details about what type of insurance information you're looking for? We offer various types of insurance including health, life, auto, and property insurance.";
        }

        return res.status(200).json({ 
            response: response,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('Chatbot API error:', error);
        return res.status(500).json({ 
            error: 'An error occurred while processing your request. Please try again later.' 
        });
    }
}