const fs = require('fs');
const cheerio = require('cheerio');

// Function to extract text content from HTML
function extractTextFromHTML(htmlContent) {
    const $ = cheerio.load(htmlContent);
    
    // Remove script and style elements
    $('script, style, noscript').remove();
    
    // Extract different types of content
    const extractedContent = {
        title: $('title').text().trim(),
        headings: [],
        paragraphs: [],
        links: [],
        lists: [],
        forms: [],
        contact: [],
        services: [],
        stats: []
    };
    
    // Extract headings (h1-h6)
    $('h1, h2, h3, h4, h5, h6').each((i, elem) => {
        const text = $(elem).text().trim();
        if (text) {
            extractedContent.headings.push({
                level: elem.tagName,
                text: text
            });
        }
    });
    
    // Extract paragraphs
    $('p').each((i, elem) => {
        const text = $(elem).text().trim();
        if (text && text.length > 10) { // Only meaningful paragraphs
            extractedContent.paragraphs.push(text);
        }
    });
    
    // Extract links
    $('a').each((i, elem) => {
        const text = $(elem).text().trim();
        const href = $(elem).attr('href');
        if (text && href) {
            extractedContent.links.push({
                text: text,
                url: href
            });
        }
    });
    
    // Extract list items
    $('li').each((i, elem) => {
        const text = $(elem).text().trim();
        if (text) {
            extractedContent.lists.push(text);
        }
    });
    
    // Extract form information
    $('form').each((i, elem) => {
        const formData = {
            id: $(elem).attr('id') || `form-${i}`,
            fields: []
        };
        
        $(elem).find('input, select, textarea').each((j, field) => {
            const fieldData = {
                type: $(field).attr('type') || field.tagName.toLowerCase(),
                name: $(field).attr('name'),
                placeholder: $(field).attr('placeholder'),
                label: $(field).prev('label').text().trim() || $(field).parent().find('label').text().trim()
            };
            formData.fields.push(fieldData);
        });
        
        extractedContent.forms.push(formData);
    });
    
    // Extract contact information
    $('[class*="contact"], [id*="contact"]').each((i, elem) => {
        const text = $(elem).text().trim();
        if (text) {
            extractedContent.contact.push(text);
        }
    });
    
    // Extract service information
    $('[class*="service"], [class*="insurance"]').each((i, elem) => {
        const text = $(elem).text().trim();
        if (text && text.length > 20) {
            extractedContent.services.push(text);
        }
    });
    
    // Extract statistics/numbers
    $('[class*="stat"], [class*="number"]').each((i, elem) => {
        const text = $(elem).text().trim();
        if (text) {
            extractedContent.stats.push(text);
        }
    });
    
    return extractedContent;
}

// Function to format extracted content as readable text
function formatAsText(extractedContent) {
    let textOutput = '';
    
    // Title
    if (extractedContent.title) {
        textOutput += `WEBSITE TITLE:\n${extractedContent.title}\n\n`;
    }
    
    // Headings
    if (extractedContent.headings.length > 0) {
        textOutput += `HEADINGS:\n`;
        extractedContent.headings.forEach(heading => {
            textOutput += `${heading.level.toUpperCase()}: ${heading.text}\n`;
        });
        textOutput += '\n';
    }
    
    // Main content paragraphs
    if (extractedContent.paragraphs.length > 0) {
        textOutput += `MAIN CONTENT:\n`;
        extractedContent.paragraphs.forEach(paragraph => {
            textOutput += `${paragraph}\n\n`;
        });
    }
    
    // Services
    if (extractedContent.services.length > 0) {
        textOutput += `SERVICES:\n`;
        extractedContent.services.forEach(service => {
            textOutput += `- ${service}\n`;
        });
        textOutput += '\n';
    }
    
    // Statistics
    if (extractedContent.stats.length > 0) {
        textOutput += `STATISTICS:\n`;
        extractedContent.stats.forEach(stat => {
            textOutput += `- ${stat}\n`;
        });
        textOutput += '\n';
    }
    
    // Contact information
    if (extractedContent.contact.length > 0) {
        textOutput += `CONTACT INFORMATION:\n`;
        extractedContent.contact.forEach(contact => {
            textOutput += `${contact}\n`;
        });
        textOutput += '\n';
    }
    
    // Navigation links
    if (extractedContent.links.length > 0) {
        textOutput += `NAVIGATION LINKS:\n`;
        extractedContent.links.forEach(link => {
            textOutput += `- ${link.text} (${link.url})\n`;
        });
        textOutput += '\n';
    }
    
    // Forms
    if (extractedContent.forms.length > 0) {
        textOutput += `FORMS:\n`;
        extractedContent.forms.forEach(form => {
            textOutput += `Form ID: ${form.id}\n`;
            textOutput += `Fields:\n`;
            form.fields.forEach(field => {
                textOutput += `  - ${field.label || field.name || 'Unnamed'} (${field.type})\n`;
            });
            textOutput += '\n';
        });
    }
    
    // Lists
    if (extractedContent.lists.length > 0) {
        textOutput += `LIST ITEMS:\n`;
        extractedContent.lists.forEach(item => {
            textOutput += `- ${item}\n`;
        });
        textOutput += '\n';
    }
    
    return textOutput;
}

// Main execution
try {
    console.log('Reading scraped HTML content...');
    const htmlContent = fs.readFileSync('scraped_website_content.html', 'utf8');
    
    console.log('Extracting text content...');
    const extractedContent = extractTextFromHTML(htmlContent);
    
    console.log('Formatting as readable text...');
    const textOutput = formatAsText(extractedContent);
    
    // Save to text file
    const outputFileName = 'website_content_extracted.txt';
    fs.writeFileSync(outputFileName, textOutput, 'utf8');
    
    console.log(`✅ Website content successfully extracted and saved to: ${outputFileName}`);
    console.log(`📊 Extracted content summary:`);
    console.log(`   - Title: ${extractedContent.title ? 'Yes' : 'No'}`);
    console.log(`   - Headings: ${extractedContent.headings.length}`);
    console.log(`   - Paragraphs: ${extractedContent.paragraphs.length}`);
    console.log(`   - Links: ${extractedContent.links.length}`);
    console.log(`   - Services: ${extractedContent.services.length}`);
    console.log(`   - Contact sections: ${extractedContent.contact.length}`);
    console.log(`   - Forms: ${extractedContent.forms.length}`);
    console.log(`   - Statistics: ${extractedContent.stats.length}`);
    console.log(`   - List items: ${extractedContent.lists.length}`);
    
} catch (error) {
    console.error('❌ Error extracting website content:', error.message);
}