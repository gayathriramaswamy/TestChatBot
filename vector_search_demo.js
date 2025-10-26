const { VectorStore } = require('./vector_embeddings');
const readline = require('readline');

class VectorSearchDemo {
    constructor(apiKey) {
        this.vectorStore = new VectorStore(apiKey);
        this.isLoaded = false;
    }

    async initialize() {
        // Try to load existing vector store
        const loaded = this.vectorStore.loadFromFile('website_vectors.json');
        
        if (loaded) {
            this.isLoaded = true;
            console.log('✅ Vector store loaded successfully!');
            console.log('📊 Statistics:', this.vectorStore.getStats());
        } else {
            console.log('❌ No existing vector store found.');
            console.log('💡 Run "node vector_embeddings.js" first to create the vector store.');
            return false;
        }
        
        return true;
    }

    async search(query, topK = 5) {
        if (!this.isLoaded) {
            console.log('❌ Vector store not loaded. Please initialize first.');
            return [];
        }

        console.log(`🔍 Searching for: "${query}"`);
        console.log('⏳ Generating query embedding...');
        
        const results = await this.vectorStore.search(query, topK);
        
        console.log(`\n📋 Found ${results.length} results:\n`);
        
        results.forEach((result, index) => {
            console.log(`${index + 1}. 📈 Similarity: ${(result.similarity * 100).toFixed(2)}%`);
            console.log(`   📝 Text: ${result.text}`);
            console.log(`   📊 Metadata: Chunk ${result.metadata.chunkIndex + 1}/${result.metadata.totalChunks}`);
            console.log('   ' + '─'.repeat(80));
        });
        
        return results;
    }

    async interactiveSearch() {
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });

        const askQuestion = () => {
            rl.question('\n🔍 Enter your search query (or "quit" to exit): ', async (query) => {
                if (query.toLowerCase() === 'quit') {
                    console.log('👋 Goodbye!');
                    rl.close();
                    return;
                }

                if (query.trim()) {
                    try {
                        await this.search(query.trim());
                    } catch (error) {
                        console.error('❌ Search error:', error.message);
                    }
                }

                askQuestion();
            });
        };

        console.log('\n🎯 Interactive Search Mode');
        console.log('💡 Try queries like: "insurance coverage", "contact info", "health insurance"');
        askQuestion();
    }

    // Batch search for multiple queries
    async batchSearch(queries) {
        console.log('🔄 Running batch search...\n');
        
        for (const query of queries) {
            await this.search(query, 3);
            console.log('\n' + '═'.repeat(100) + '\n');
        }
    }

    // Get content recommendations based on similarity
    async getRecommendations(text, topK = 3) {
        console.log(`💡 Getting recommendations for: "${text.substring(0, 50)}..."`);
        
        const results = await this.vectorStore.search(text, topK);
        
        console.log(`\n🎯 Top ${results.length} recommendations:\n`);
        
        results.forEach((result, index) => {
            console.log(`${index + 1}. ${result.text.substring(0, 100)}...`);
            console.log(`   Similarity: ${(result.similarity * 100).toFixed(2)}%\n`);
        });
        
        return results;
    }
}

// Demo function
async function runDemo() {
    const apiKey = process.env.GOOGLE_AI_API_KEY || 'YOUR_API_KEY_HERE';
    
    if (apiKey === 'YOUR_API_KEY_HERE') {
        console.error('❌ Please set your Google AI API key in the GOOGLE_AI_API_KEY environment variable');
        console.log('💡 You can set it by running: export GOOGLE_AI_API_KEY="your_key_here"');
        return;
    }

    const demo = new VectorSearchDemo(apiKey);
    
    console.log('🚀 Initializing Vector Search Demo...');
    
    const initialized = await demo.initialize();
    if (!initialized) {
        return;
    }

    // Check command line arguments
    const args = process.argv.slice(2);
    
    if (args.length > 0) {
        // Command line search
        const query = args.join(' ');
        await demo.search(query);
    } else {
        // Demo searches
        const demoQueries = [
            'What insurance services do you offer?',
            'How can I contact you?',
            'Tell me about health insurance',
            'What are your company statistics?'
        ];
        
        await demo.batchSearch(demoQueries);
        
        // Start interactive mode
        await demo.interactiveSearch();
    }
}

// Export for use in other modules
module.exports = { VectorSearchDemo };

// Run demo if this script is executed directly
if (require.main === module) {
    runDemo().catch(console.error);
}