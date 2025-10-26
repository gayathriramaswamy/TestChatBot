# Vector Embeddings with Google Gemini

This implementation provides a complete solution for creating and searching vector embeddings of website content using Google's Gemini text-embedding-004 model.

## Features

- ✅ Text chunking for optimal embedding generation
- ✅ Google Gemini text-embedding-004 integration
- ✅ Custom vector store with cosine similarity search
- ✅ Persistent storage (JSON format)
- ✅ Interactive search interface
- ✅ Batch processing capabilities

## Setup

### 1. Install Dependencies

The required dependencies are already installed:
- `@google/generative-ai` - Google AI SDK
- `ml-distance` - Distance calculations for similarity search

### 2. Get Google AI API Key

1. Visit [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Create a new API key
3. Set the environment variable:

```bash
export GOOGLE_AI_API_KEY="your_api_key_here"
```

Or create a `.env` file:
```
GOOGLE_AI_API_KEY=your_api_key_here
```

## Usage

### 1. Generate Embeddings

First, create the vector store from your website content:

```bash
node vector_embeddings.js
```

This will:
- Read content from `website_content_extracted.txt`
- Split text into optimal chunks
- Generate embeddings using Gemini
- Save vectors to `website_vectors.json`

### 2. Search Content

#### Interactive Search
```bash
node vector_search_demo.js
```

#### Command Line Search
```bash
node vector_search_demo.js "your search query here"
```

#### Programmatic Usage
```javascript
const { VectorStore } = require('./vector_embeddings');

const vectorStore = new VectorStore(apiKey);
vectorStore.loadFromFile('website_vectors.json');

const results = await vectorStore.search('insurance coverage', 5);
console.log(results);
```

## API Reference

### VectorStore Class

#### Constructor
```javascript
const vectorStore = new VectorStore(apiKey);
```

#### Methods

**`addText(text, metadata)`**
- Adds text to the vector store
- Automatically chunks large text
- Generates embeddings using Gemini

**`search(query, topK)`**
- Searches for similar content
- Returns top K most similar results
- Includes similarity scores and metadata

**`saveToFile(filename)`**
- Saves vector store to JSON file
- Includes vectors, texts, and metadata

**`loadFromFile(filename)`**
- Loads vector store from JSON file
- Returns true if successful

**`getStats()`**
- Returns statistics about the vector store
- Includes vector count, dimensions, etc.

### Search Results Format

```javascript
{
  text: "The actual text content",
  metadata: {
    chunkIndex: 0,
    totalChunks: 5,
    originalLength: 1500,
    source: "website_content_extracted.txt"
  },
  similarity: 0.8542,
  index: 12
}
```

## Example Queries

Try these example queries to test the system:

- "What insurance services do you offer?"
- "How can I contact you?"
- "Tell me about health insurance"
- "What are your company statistics?"
- "Claims processing information"

## Performance Notes

- **Embedding Model**: Uses `text-embedding-004` (768 dimensions)
- **Chunk Size**: 1000 characters (configurable)
- **Similarity**: Cosine similarity for vector comparison
- **Storage**: JSON format for easy inspection and portability

## Troubleshooting

### Common Issues

1. **API Key Error**
   ```
   Please set your Google AI API key in the GOOGLE_AI_API_KEY environment variable
   ```
   Solution: Set the `GOOGLE_AI_API_KEY` environment variable

2. **File Not Found**
   ```
   File not found: website_content_extracted.txt
   ```
   Solution: Ensure the content file exists in the project directory

3. **No Vector Store**
   ```
   No existing vector store found
   ```
   Solution: Run `node vector_embeddings.js` first to create the vector store

### Performance Tips

- Larger chunk sizes = fewer API calls but less granular search
- Smaller chunk sizes = more API calls but better precision
- Adjust `topK` parameter based on your needs (3-10 is usually optimal)

## Integration with Existing Chatbot

You can integrate this vector search with your existing chatbot by modifying `server.js`:

```javascript
const { VectorStore } = require('./vector_embeddings');

// Initialize vector store
const vectorStore = new VectorStore(process.env.GOOGLE_AI_API_KEY);
vectorStore.loadFromFile('website_vectors.json');

// In your chatbot endpoint
app.post('/api/chatbot', async (req, res) => {
    const { message } = req.body;
    
    // Search vector store
    const results = await vectorStore.search(message, 3);
    
    // Use results to generate response
    const context = results.map(r => r.text).join(' ');
    // ... generate response using context
});
```

## Files Created

- `vector_embeddings.js` - Main vector store implementation
- `vector_search_demo.js` - Interactive search demo
- `website_vectors.json` - Saved vector store (created after first run)
- `README_VECTOR_EMBEDDINGS.md` - This documentation