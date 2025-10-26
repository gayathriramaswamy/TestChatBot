const { GoogleGenerativeAI } = require('@google/generative-ai');
const fs = require('fs');
const path = require('path');
const { cosine } = require('ml-distance');

// Polyfill fetch and Headers for Node.js
if (!global.fetch) {
    const fetch = require('node-fetch');
    global.fetch = fetch;
    global.Headers = fetch.Headers;
    global.Request = fetch.Request;
    global.Response = fetch.Response;
}

class VectorStore {
    constructor(apiKey) {
        this.genAI = new GoogleGenerativeAI(apiKey);
        this.model = this.genAI.getGenerativeModel({ model: "text-embedding-004" });
        this.vectors = [];
        this.texts = [];
        this.metadata = [];
    }

    // Split text into chunks for better embedding
    splitTextIntoChunks(text, maxChunkSize = 1000) {
        const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
        const chunks = [];
        let currentChunk = '';

        for (const sentence of sentences) {
            if (currentChunk.length + sentence.length > maxChunkSize && currentChunk.length > 0) {
                chunks.push(currentChunk.trim());
                currentChunk = sentence.trim();
            } else {
                currentChunk += (currentChunk ? '. ' : '') + sentence.trim();
            }
        }

        if (currentChunk.trim()) {
            chunks.push(currentChunk.trim());
        }

        return chunks;
    }

    // Generate embeddings for text using Gemini
    async generateEmbedding(text) {
        try {
            const result = await this.model.embedContent(text);
            return result.embedding.values;
        } catch (error) {
            console.error('Error generating embedding:', error);
            throw error;
        }
    }

    // Add text and its embedding to the vector store
    async addText(text, metadata = {}) {
        try {
            const chunks = this.splitTextIntoChunks(text);
            
            for (let i = 0; i < chunks.length; i++) {
                const chunk = chunks[i];
                const embedding = await this.generateEmbedding(chunk);
                
                this.vectors.push(embedding);
                this.texts.push(chunk);
                this.metadata.push({
                    ...metadata,
                    chunkIndex: i,
                    totalChunks: chunks.length,
                    originalLength: text.length
                });
            }
            
            console.log(`Added ${chunks.length} chunks to vector store`);
        } catch (error) {
            console.error('Error adding text to vector store:', error);
            throw error;
        }
    }

    // Calculate cosine similarity between two vectors
    calculateSimilarity(vector1, vector2) {
        // Calculate cosine similarity manually
        let dotProduct = 0;
        let norm1 = 0;
        let norm2 = 0;
        
        for (let i = 0; i < vector1.length; i++) {
            dotProduct += vector1[i] * vector2[i];
            norm1 += vector1[i] * vector1[i];
            norm2 += vector2[i] * vector2[i];
        }
        
        norm1 = Math.sqrt(norm1);
        norm2 = Math.sqrt(norm2);
        
        if (norm1 === 0 || norm2 === 0) {
            return 0;
        }
        
        return dotProduct / (norm1 * norm2);
    }

    // Search for similar texts
    async search(query, topK = 5) {
        try {
            const queryEmbedding = await this.generateEmbedding(query);
            const similarities = [];

            for (let i = 0; i < this.vectors.length; i++) {
                const similarity = this.calculateSimilarity(queryEmbedding, this.vectors[i]);
                similarities.push({
                    text: this.texts[i],
                    metadata: this.metadata[i],
                    similarity: similarity,
                    index: i
                });
            }

            // Sort by similarity (highest first) and return top K
            return similarities
                .sort((a, b) => b.similarity - a.similarity)
                .slice(0, topK);
        } catch (error) {
            console.error('Error searching vector store:', error);
            throw error;
        }
    }

    // Save vector store to file
    saveToFile(filename) {
        const data = {
            vectors: this.vectors,
            texts: this.texts,
            metadata: this.metadata,
            timestamp: new Date().toISOString()
        };

        fs.writeFileSync(filename, JSON.stringify(data, null, 2));
        console.log(`Vector store saved to ${filename}`);
    }

    // Load vector store from file
    loadFromFile(filename) {
        if (fs.existsSync(filename)) {
            const data = JSON.parse(fs.readFileSync(filename, 'utf8'));
            this.vectors = data.vectors || [];
            this.texts = data.texts || [];
            this.metadata = data.metadata || [];
            console.log(`Vector store loaded from ${filename} with ${this.vectors.length} vectors`);
            return true;
        }
        return false;
    }

    // Get statistics about the vector store
    getStats() {
        return {
            totalVectors: this.vectors.length,
            totalTexts: this.texts.length,
            averageTextLength: this.texts.reduce((sum, text) => sum + text.length, 0) / this.texts.length,
            vectorDimension: this.vectors.length > 0 ? this.vectors[0].length : 0
        };
    }
}

// Main function to process website content
async function processWebsiteContent() {
    // You need to set your Google AI API key
    const apiKey = process.env.GOOGLE_AI_API_KEY || 'YOUR_API_KEY_HERE';
    
    if (apiKey === 'YOUR_API_KEY_HERE') {
        console.error('Please set your Google AI API key in the GOOGLE_AI_API_KEY environment variable');
        return;
    }

    const vectorStore = new VectorStore(apiKey);
    
    try {
        // Read the website content
        const contentPath = path.join(__dirname, 'website_content_extracted.txt');
        
        if (!fs.existsSync(contentPath)) {
            console.error(`File not found: ${contentPath}`);
            return;
        }

        const content = fs.readFileSync(contentPath, 'utf8');
        console.log(`Read ${content.length} characters from ${contentPath}`);

        // Add content to vector store
        await vectorStore.addText(content, { 
            source: 'website_content_extracted.txt',
            type: 'website_content'
        });

        // Save the vector store
        vectorStore.saveToFile('website_vectors.json');

        // Display statistics
        console.log('Vector Store Statistics:', vectorStore.getStats());

        // Test search functionality
        console.log('\n--- Testing Search Functionality ---');
        const testQueries = [
            'insurance coverage',
            'contact information',
            'health insurance',
            'claims processing'
        ];

        for (const query of testQueries) {
            console.log(`\nSearching for: "${query}"`);
            const results = await vectorStore.search(query, 3);
            
            results.forEach((result, index) => {
                console.log(`${index + 1}. Similarity: ${result.similarity.toFixed(4)}`);
                console.log(`   Text: ${result.text.substring(0, 100)}...`);
            });
        }

    } catch (error) {
        console.error('Error processing website content:', error);
    }
}

// Export the VectorStore class and main function
module.exports = { VectorStore, processWebsiteContent };

// Run the main function if this script is executed directly
if (require.main === module) {
    processWebsiteContent();
}