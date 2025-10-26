const fs = require('fs');
const cheerio = require('cheerio');
const path = require('path');

// Simple text processing and embedding functions
class SimpleVectorStore {
    constructor() {
        this.documents = [];
        this.embeddings = [];
    }

    // Simple TF-IDF like embedding (basic implementation)
    createEmbedding(text) {
        const words = text.toLowerCase().match(/\b\w+\b/g) || [];
        const wordCount = {};
        
        // Count word frequencies
        words.forEach(word => {
            wordCount[word] = (wordCount[word] || 0) + 1;
        });
        
        // Create a simple vector representation
        const vocabulary = Object.keys(wordCount);
        const vector = vocabulary.map(word => wordCount[word] / words.length);
        
        return { vector, vocabulary, text };
    }

    addDocument(text, metadata = {}) {
        const embedding = this.createEmbedding(text);
        this.documents.push({ text, metadata, embedding });
        this.embeddings.push(embedding);
    }

    // Simple cosine similarity
    cosineSimilarity(vec1, vec2, vocab1, vocab2) {
        const commonWords = vocab1.filter(word => vocab2.includes(word));
        if (commonWords.length === 0) return 0;

        let dotProduct = 0;
        let norm1 = 0;
        let norm2 = 0;

        commonWords.forEach(word => {
            const idx1 = vocab1.indexOf(word);
            const idx2 = vocab2.indexOf(word);
            const val1 = vec1[idx1] || 0;
            const val2 = vec2[idx2] || 0;
            
            dotProduct += val1 * val2;
            norm1 += val1 * val1;
            norm2 += val2 * val2;
        });

        return dotProduct / (Math.sqrt(norm1) * Math.sqrt(norm2));
    }

    search(query, limit = 3) {
        const queryEmbedding = this.createEmbedding(query);
        const similarities = this.documents.map((doc, index) => ({
            document: doc,
            similarity: this.cosineSimilarity(
                queryEmbedding.vector,
                doc.embedding.vector,
                queryEmbedding.vocabulary,
                doc.embedding.vocabulary
            )
        }));

        return similarities
            .sort((a, b) => b.similarity - a.similarity)
            .slice(0, limit)
            .filter(item => item.similarity > 0.1); // Filter out very low similarities
    }
}

// Scrape and process website content
function scrapeWebsiteContent() {
    try {
        const htmlContent = fs.readFileSync('website_content.html', 'utf8');
        const $ = cheerio.load(htmlContent);
        
        const vectorStore = new SimpleVectorStore();
        
        // Extract different sections of content
        const sections = [
            {
                selector: '.hero__content',
                type: 'hero',
                title: 'Hero Section'
            },
            {
                selector: '.service__card',
                type: 'service',
                title: 'Services'
            },
            {
                selector: '.about__content',
                type: 'about',
                title: 'About Us'
            },
            {
                selector: '.stats__item',
                type: 'stats',
                title: 'Statistics'
            },
            {
                selector: '.contact__form',
                type: 'contact',
                title: 'Contact Information'
            }
        ];

        sections.forEach(section => {
            $(section.selector).each((index, element) => {
                const text = $(element).text().trim();
                if (text && text.length > 20) { // Only add meaningful content
                    vectorStore.addDocument(text, {
                        type: section.type,
                        title: section.title,
                        index: index
                    });
                }
            });
        });

        // Also extract general text content
        const generalContent = $('body').text()
            .replace(/\s+/g, ' ')
            .trim()
            .split('.')
            .filter(sentence => sentence.trim().length > 30)
            .slice(0, 20); // Limit to prevent too much data

        generalContent.forEach((sentence, index) => {
            vectorStore.addDocument(sentence.trim(), {
                type: 'general',
                title: 'General Content',
                index: index
            });
        });

        // Save the vector store data
        const vectorStoreData = {
            documents: vectorStore.documents,
            timestamp: new Date().toISOString()
        };

        fs.writeFileSync('chatbot_knowledge.json', JSON.stringify(vectorStoreData, null, 2));
        
        console.log(`Scraped and processed ${vectorStore.documents.length} text segments`);
        console.log('Knowledge base saved to chatbot_knowledge.json');
        
        return vectorStore;
        
    } catch (error) {
        console.error('Error scraping website content:', error);
        return null;
    }
}

// Export for use in server
module.exports = { SimpleVectorStore, scrapeWebsiteContent };

// Run if called directly
if (require.main === module) {
    scrapeWebsiteContent();
}