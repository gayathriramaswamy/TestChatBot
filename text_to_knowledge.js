const fs = require('fs');

// Function to convert text file to knowledge segments
function convertTextToKnowledge(textContent) {
    const lines = textContent.split('\n');
    const knowledge = [];
    
    let currentSection = '';
    let currentContent = '';
    let sectionId = 1;
    
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        
        // Check if this is a section header (all caps followed by colon)
        if (line.match(/^[A-Z\s]+:$/) && line.length > 3) {
            // Save previous section if it has content
            if (currentSection && currentContent.trim()) {
                knowledge.push({
                    id: sectionId++,
                    section: currentSection,
                    content: currentContent.trim(),
                    keywords: extractKeywords(currentContent)
                });
            }
            
            // Start new section
            currentSection = line.replace(':', '').trim();
            currentContent = '';
        } else if (line && currentSection) {
            // Add content to current section
            currentContent += line + ' ';
        }
    }
    
    // Add the last section
    if (currentSection && currentContent.trim()) {
        knowledge.push({
            id: sectionId++,
            section: currentSection,
            content: currentContent.trim(),
            keywords: extractKeywords(currentContent)
        });
    }
    
    // Also create smaller chunks for better semantic search
    const chunks = createContentChunks(textContent);
    chunks.forEach(chunk => {
        knowledge.push({
            id: sectionId++,
            section: 'Content Chunk',
            content: chunk,
            keywords: extractKeywords(chunk)
        });
    });
    
    return knowledge;
}

// Function to extract keywords from content
function extractKeywords(content) {
    const commonWords = new Set([
        'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by',
        'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did',
        'will', 'would', 'could', 'should', 'may', 'might', 'can', 'must', 'shall',
        'this', 'that', 'these', 'those', 'i', 'you', 'he', 'she', 'it', 'we', 'they',
        'me', 'him', 'her', 'us', 'them', 'my', 'your', 'his', 'her', 'its', 'our', 'their'
    ]);
    
    const words = content.toLowerCase()
        .replace(/[^\w\s]/g, ' ')
        .split(/\s+/)
        .filter(word => word.length > 2 && !commonWords.has(word));
    
    // Count word frequency
    const wordCount = {};
    words.forEach(word => {
        wordCount[word] = (wordCount[word] || 0) + 1;
    });
    
    // Return top keywords
    return Object.entries(wordCount)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 10)
        .map(([word]) => word);
}

// Function to create content chunks for better semantic search
function createContentChunks(textContent) {
    const chunks = [];
    const lines = textContent.split('\n').filter(line => line.trim());
    
    let currentChunk = '';
    const maxChunkSize = 300; // characters
    
    for (const line of lines) {
        if (currentChunk.length + line.length > maxChunkSize && currentChunk) {
            chunks.push(currentChunk.trim());
            currentChunk = line + ' ';
        } else {
            currentChunk += line + ' ';
        }
    }
    
    if (currentChunk.trim()) {
        chunks.push(currentChunk.trim());
    }
    
    return chunks.filter(chunk => chunk.length > 50); // Only meaningful chunks
}

// Main execution
try {
    console.log('Reading extracted text file...');
    const textContent = fs.readFileSync('website_content_extracted.txt', 'utf8');
    
    console.log('Converting to knowledge base format...');
    const knowledge = convertTextToKnowledge(textContent);
    
    // Save as JSON for the chatbot
    const outputFileName = 'chatbot_knowledge_from_text.json';
    fs.writeFileSync(outputFileName, JSON.stringify(knowledge, null, 2), 'utf8');
    
    console.log(`✅ Knowledge base created successfully: ${outputFileName}`);
    console.log(`📊 Generated ${knowledge.length} knowledge segments`);
    
    // Show sample of generated knowledge
    console.log('\n📝 Sample knowledge segments:');
    knowledge.slice(0, 3).forEach((item, index) => {
        console.log(`\n${index + 1}. Section: ${item.section}`);
        console.log(`   Content: ${item.content.substring(0, 100)}...`);
        console.log(`   Keywords: ${item.keywords.slice(0, 5).join(', ')}`);
    });
    
} catch (error) {
    console.error('❌ Error converting text to knowledge base:', error.message);
}