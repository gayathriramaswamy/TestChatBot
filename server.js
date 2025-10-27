const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { body, validationResult } = require('express-validator');
const nodemailer = require('nodemailer');
const path = require('path');
const fs = require('fs');
const util = require('util');
const { SimpleVectorStore } = require('./scraper');
const writeFile = util.promisify(fs.writeFile);
const appendFile = util.promisify(fs.appendFile);
const access = util.promisify(fs.access);

// Initialize chatbot knowledge base
let chatbotVectorStore = null;

function initializeChatbot() {
    try {
        // Try to load the new knowledge base from extracted text first
        let knowledgeData;
        try {
            knowledgeData = JSON.parse(fs.readFileSync('chatbot_knowledge_from_text.json', 'utf8'));
            console.log('Using knowledge base from extracted website text');
        } catch (textError) {
            // Fallback to original knowledge base
            console.log('Falling back to original knowledge base');
            const originalData = JSON.parse(fs.readFileSync('chatbot_knowledge.json', 'utf8'));
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
                chatbotVectorStore.addDocument(segment.text, segment.metadata);
            }
        });
        
        console.log(`Chatbot initialized with ${segments.length} knowledge segments`);
        return true;
    } catch (error) {
        console.error('Error initializing chatbot:', error);
        chatbotVectorStore = null;
        return false;
    }
}
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 8080;

// Security middleware
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://cdnjs.cloudflare.com"],
            fontSrc: ["'self'", "https://fonts.gstatic.com", "https://cdnjs.cloudflare.com"],
            scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.emailjs.com"],
            imgSrc: ["'self'", "data:", "https:"],
            connectSrc: ["'self'", "https://api.emailjs.com"]
        }
    }
}));

app.use(cors({
    origin: process.env.NODE_ENV === 'production' 
        ? [
            'https://testchatbot7-j371vlqcf-gayathri-ramaswamys-projects.vercel.app',
            'https://testchatbot7.vercel.app',
            /^https:\/\/.*\.vercel\.app$/
          ] 
        : ['http://localhost:3000', 'http://127.0.0.1:3000', 'http://localhost:8080'],
    credentials: true
}));

// Rate limiting for form submissions (stricter)
const formLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // limit each IP to 5 requests per windowMs
    message: {
        error: 'Too many requests from this IP, please try again later.'
    },
    standardHeaders: true,
    legacyHeaders: false,
});

// Rate limiting for chatbot (more lenient)
const chatbotLimiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 20, // limit each IP to 20 requests per minute
    message: {
        error: 'Too many chatbot requests, please wait a moment.'
    },
    standardHeaders: true,
    legacyHeaders: false,
});

// Apply rate limiting to specific routes
app.use('/api/send-inquiry', formLimiter);
app.use('/api/chatbot', chatbotLimiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve static files
app.use(express.static(path.join(__dirname)));

// CSV saving function
const saveToCSV = async (formData) => {
    try {
        const csvFilePath = path.join(__dirname, 'data', 'form_submissions.csv');
        
        // Prepare CSV data
        const timestamp = new Date().toISOString();
        const csvRow = [
            timestamp,
            `"${formData.name.replace(/"/g, '""')}"`,
            `"${formData.email}"`,
            `"${formData.phone}"`,
            `"${formData.insuranceType}"`,
            `"${(formData.message || '').replace(/"/g, '""')}"`,
            formData.optIn ? 'Yes' : 'No'
        ].join(',') + '\n';
        
        // Check if file exists, if not create with headers
        try {
            await access(csvFilePath, fs.constants.F_OK);
        } catch (error) {
            // File doesn't exist, create with headers
            const headers = 'Timestamp,Name,Email,Phone,Insurance Type,Message,Opt-in\n';
            await writeFile(csvFilePath, headers, 'utf8');
        }
        
        // Append the new row
        await appendFile(csvFilePath, csvRow, 'utf8');
        console.log('Form data saved to CSV successfully');
        
    } catch (error) {
        console.error('Error saving to CSV:', error);
        throw error;
    }
};

// Email transporter configuration
const createTransporter = () => {
    // For production, use a proper email service like SendGrid, Mailgun, etc.
    if (process.env.NODE_ENV === 'production') {
        return nodemailer.createTransporter({
            service: 'gmail', // or your preferred service
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS
            }
        });
    } else {
        // For development, use Ethereal Email (test account)
        return nodemailer.createTransporter({
            host: 'smtp.ethereal.email',
            port: 587,
            auth: {
                user: 'ethereal.user@ethereal.email',
                pass: 'ethereal.pass'
            }
        });
    }
};

// Validation middleware
const validateInquiry = [
    body('name')
        .trim()
        .isLength({ min: 2, max: 100 })
        .withMessage('Name must be between 2 and 100 characters')
        .matches(/^[a-zA-Z\s'-]+$/)
        .withMessage('Name can only contain letters, spaces, hyphens, and apostrophes'),
    
    body('email')
        .isEmail()
        .normalizeEmail()
        .withMessage('Please provide a valid email address'),
    
    body('phone')
        .trim()
        .matches(/^[\+]?[1-9][\d]{0,15}$/)
        .withMessage('Please provide a valid phone number'),
    
    body('insuranceType')
        .isIn(['health', 'life', 'auto', 'property', 'multiple', 'other'])
        .withMessage('Please select a valid insurance type'),
    
    body('message')
        .optional()
        .trim()
        .isLength({ max: 1000 })
        .withMessage('Message cannot exceed 1000 characters'),
    
    body('optIn')
        .optional()
        .isBoolean()
        .withMessage('Opt-in must be a boolean value')
];

// API Routes

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});

// Send inquiry endpoint
app.post('/api/send-inquiry', validateInquiry, async (req, res) => {
    try {
        // Check for validation errors
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: errors.array()
            });
        }

        const { name, email, phone, insuranceType, message, optIn } = req.body;

        // Save form data to CSV
        await saveToCSV({ name, email, phone, insuranceType, message, optIn });

        // Create email transporter
        const transporter = createTransporter();

        // Email content
        const insuranceTypeMap = {
            'health': 'Health Insurance',
            'life': 'Life Insurance',
            'auto': 'Auto Insurance',
            'property': 'Property Insurance',
            'multiple': 'Multiple Types',
            'other': 'Other'
        };

        const emailContent = {
            from: process.env.EMAIL_FROM || 'noreply@securelifeinsurance.com',
            to: process.env.CLIENT_EMAIL || 'client@securelifeinsurance.com',
            subject: `New Insurance Inquiry from ${name}`,
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
                    <div style="background: linear-gradient(135deg, #2563eb, #1d4ed8); color: white; padding: 20px; border-radius: 10px 10px 0 0; text-align: center;">
                        <h1 style="margin: 0; font-size: 24px;">🛡️ New Insurance Inquiry</h1>
                    </div>
                    
                    <div style="padding: 30px; background: #f8fafc;">
                        <h2 style="color: #1e293b; margin-bottom: 20px;">Contact Information</h2>
                        
                        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
                            <tr style="background: white;">
                                <td style="padding: 12px; border: 1px solid #e2e8f0; font-weight: bold; width: 30%;">Name:</td>
                                <td style="padding: 12px; border: 1px solid #e2e8f0;">${name}</td>
                            </tr>
                            <tr style="background: #f1f5f9;">
                                <td style="padding: 12px; border: 1px solid #e2e8f0; font-weight: bold;">Email:</td>
                                <td style="padding: 12px; border: 1px solid #e2e8f0;"><a href="mailto:${email}" style="color: #2563eb;">${email}</a></td>
                            </tr>
                            <tr style="background: white;">
                                <td style="padding: 12px; border: 1px solid #e2e8f0; font-weight: bold;">Phone:</td>
                                <td style="padding: 12px; border: 1px solid #e2e8f0;"><a href="tel:${phone}" style="color: #2563eb;">${phone}</a></td>
                            </tr>
                            <tr style="background: #f1f5f9;">
                                <td style="padding: 12px; border: 1px solid #e2e8f0; font-weight: bold;">Insurance Type:</td>
                                <td style="padding: 12px; border: 1px solid #e2e8f0;">${insuranceTypeMap[insuranceType]}</td>
                            </tr>
                            <tr style="background: white;">
                                <td style="padding: 12px; border: 1px solid #e2e8f0; font-weight: bold;">Opt-in for Follow-up:</td>
                                <td style="padding: 12px; border: 1px solid #e2e8f0;">${optIn ? 'Yes' : 'No'}</td>
                            </tr>
                        </table>
                        
                        ${message ? `
                            <h3 style="color: #1e293b; margin-bottom: 10px;">Message:</h3>
                            <div style="background: white; padding: 15px; border-radius: 6px; border-left: 4px solid #2563eb; margin-bottom: 20px;">
                                <p style="margin: 0; line-height: 1.6; color: #374151;">${message}</p>
                            </div>
                        ` : ''}
                        
                        <div style="background: #dbeafe; padding: 15px; border-radius: 6px; border-left: 4px solid #2563eb;">
                            <p style="margin: 0; color: #1e40af; font-size: 14px;">
                                <strong>📅 Received:</strong> ${new Date().toLocaleString()}<br>
                                <strong>🌐 Source:</strong> SecureLife Insurance Website
                            </p>
                        </div>
                    </div>
                    
                    <div style="background: #1e293b; color: #94a3b8; padding: 20px; border-radius: 0 0 10px 10px; text-align: center; font-size: 14px;">
                        <p style="margin: 0;">This inquiry was submitted through your insurance website contact form.</p>
                        <p style="margin: 5px 0 0 0;">Please respond promptly to maintain excellent customer service.</p>
                    </div>
                </div>
            `,
            text: `
New Insurance Inquiry

Name: ${name}
Email: ${email}
Phone: ${phone}
Insurance Type: ${insuranceTypeMap[insuranceType]}
Opt-in for Follow-up: ${optIn ? 'Yes' : 'No'}

${message ? `Message: ${message}` : ''}

Received: ${new Date().toLocaleString()}
Source: SecureLife Insurance Website
            `
        };

        // Send email
        const info = await transporter.sendMail(emailContent);

        console.log('Email sent successfully:', info.messageId);

        // Send confirmation email to customer (optional)
        if (optIn) {
            const confirmationEmail = {
                from: process.env.EMAIL_FROM || 'noreply@securelifeinsurance.com',
                to: email,
                subject: 'Thank you for your insurance inquiry - SecureLife Insurance',
                html: `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                        <div style="background: linear-gradient(135deg, #2563eb, #1d4ed8); color: white; padding: 30px; border-radius: 10px; text-align: center;">
                            <h1 style="margin: 0; font-size: 28px;">🛡️ Thank You!</h1>
                            <p style="margin: 10px 0 0 0; font-size: 16px;">We've received your insurance inquiry</p>
                        </div>
                        
                        <div style="padding: 30px; background: #f8fafc; border-radius: 0 0 10px 10px;">
                            <p style="font-size: 16px; color: #374151; line-height: 1.6;">Dear ${name},</p>
                            
                            <p style="font-size: 16px; color: #374151; line-height: 1.6;">
                                Thank you for contacting SecureLife Insurance. We have received your inquiry about 
                                <strong>${insuranceTypeMap[insuranceType]}</strong> and will get back to you within 24 hours.
                            </p>
                            
                            <div style="background: white; padding: 20px; border-radius: 8px; border-left: 4px solid #10b981; margin: 20px 0;">
                                <h3 style="color: #1e293b; margin: 0 0 10px 0;">What happens next?</h3>
                                <ul style="color: #374151; line-height: 1.6; margin: 0; padding-left: 20px;">
                                    <li>Our insurance specialist will review your inquiry</li>
                                    <li>We'll prepare a personalized quote based on your needs</li>
                                    <li>You'll receive a call or email within 24 hours</li>
                                    <li>We'll schedule a consultation at your convenience</li>
                                </ul>
                            </div>
                            
                            <p style="font-size: 16px; color: #374151; line-height: 1.6;">
                                If you have any immediate questions, please don't hesitate to call us at 
                                <strong style="color: #2563eb;">(555) 123-4567</strong>.
                            </p>
                            
                            <p style="font-size: 16px; color: #374151; line-height: 1.6;">
                                Best regards,<br>
                                <strong>The SecureLife Insurance Team</strong>
                            </p>
                        </div>
                    </div>
                `,
                text: `
Dear ${name},

Thank you for contacting SecureLife Insurance. We have received your inquiry about ${insuranceTypeMap[insuranceType]} and will get back to you within 24 hours.

What happens next?
- Our insurance specialist will review your inquiry
- We'll prepare a personalized quote based on your needs
- You'll receive a call or email within 24 hours
- We'll schedule a consultation at your convenience

If you have any immediate questions, please don't hesitate to call us at (555) 123-4567.

Best regards,
The SecureLife Insurance Team
                `
            };

            await transporter.sendMail(confirmationEmail);
        }

        res.json({
            success: true,
            message: 'Inquiry sent successfully'
        });

    } catch (error) {
        console.error('Error sending inquiry:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to send inquiry. Please try again later.'
        });
    }
});

// Chatbot API endpoint
app.post('/api/chatbot', (req, res) => {
    try {
        const { message } = req.body;
        
        if (!message) {
            return res.json({
                success: false,
                message: 'Please provide a message'
            });
        }
        
        if (!chatbotVectorStore) {
            console.error('Chatbot not initialized - attempting to reinitialize');
            const initialized = initializeChatbot();
            if (!initialized) {
                return res.json({
                    success: false,
                    message: 'Sorry, I\'m having trouble connecting. Please try again later.'
                });
            }
        }

        // Search for relevant content
        const searchResults = chatbotVectorStore.search(message, 5);
        
        let response = '';
        
        if (searchResults.length > 0) {
            // Generate response based on search results
            const relevantContent = searchResults.map(result => result.document.text).join(' ');
            
            // Enhanced response generation based on query type and content
            const lowerMessage = message.toLowerCase();
            
            if (lowerMessage.includes('contact') || lowerMessage.includes('phone') || 
                lowerMessage.includes('email') || lowerMessage.includes('call') || 
                lowerMessage.includes('number') || lowerMessage.includes('reach')) {
                response = 'You can contact SecureLife Insurance at 1-800-555-0123 for immediate assistance, email us at quotes@securelife.com, or visit us at 123 Insurance Ave, Suite 100. We provide 24/7 customer service and claims processing to help with all your insurance needs.';
            } else if (lowerMessage.includes('statistics') || lowerMessage.includes('stats') || 
                      lowerMessage.includes('claims processed') || lowerMessage.includes('percentage') || 
                      (lowerMessage.includes('performance') && !lowerMessage.includes('quote')) || lowerMessage.includes('98.5') ||
                      lowerMessage.includes('claims processing') || lowerMessage.includes('satisfaction') ||
                      lowerMessage.includes('customer rating') || lowerMessage.includes('response time')) {
                // Find statistics content
                const statsContent = searchResults
                    .filter(result => result.document.text.toLowerCase().includes('98.5') || 
                                    result.document.text.toLowerCase().includes('claims processed') ||
                                    result.document.text.toLowerCase().includes('statistics') ||
                                    result.document.text.toLowerCase().includes('performance'))
                    .slice(0, 1)
                    .map(result => result.document.text)
                    .join(' ');
                
                if (statsContent) {
                    response = 'Here are our key performance statistics: We process 98.5% of claims successfully, maintain a 4.9/5 customer satisfaction rating, and provide response times under 24 hours. We\'ve served 50K+ happy customers, paid $2.5B in claims, and have 25+ years of experience with a 4.9★ customer rating.';
                } else {
                    response = 'SecureLife Insurance maintains excellent performance metrics: 98.5% claims processing rate, 4.9/5 customer satisfaction, response time under 24 hours, 50K+ happy customers served, and $2.5B in claims paid over our 25+ years of experience.';
                }
            } else if (lowerMessage.includes('quote') || lowerMessage.includes('price') || 
                      lowerMessage.includes('cost') || lowerMessage.includes('rate')) {
                response = 'We offer personalized insurance quotes that fit your life and budget. You can get a free quote by filling out our form on this page, calling us at 1-800-555-0123, or emailing quotes@securelife.com. Our expert team will get back to you within 24 hours with competitive rates.';
            } else if (lowerMessage.includes('insurance') || lowerMessage.includes('coverage') || 
                      lowerMessage.includes('policy') || lowerMessage.includes('protect')) {
                // Find the most relevant insurance-related content
                const insuranceContent = searchResults
                    .filter(result => result.document.text.toLowerCase().includes('insurance'))
                    .slice(0, 2)
                    .map(result => result.document.text)
                    .join(' ');
                
                if (insuranceContent) {
                    response = `${insuranceContent.substring(0, 400)}${insuranceContent.length > 400 ? '...' : ''}`;
                } else {
                    response = 'SecureLife Insurance offers comprehensive insurance solutions including Health, Life, Auto, and Property insurance. We provide personalized coverage that fits your life and budget with competitive rates and exceptional service. We\'ve been protecting families and businesses for over 25 years.';
                }
            } else if (lowerMessage.includes('health') || lowerMessage.includes('medical')) {
                const healthContent = searchResults
                    .filter(result => result.document.text.toLowerCase().includes('health'))
                    .slice(0, 2)
                    .map(result => result.document.text)
                    .join(' ');
                
                response = healthContent || 'Our Health Insurance provides comprehensive medical coverage for individuals and families with access to top healthcare providers nationwide, including preventive care coverage, prescription drug benefits, and mental health support.';
            } else if (lowerMessage.includes('life')) {
                const lifeContent = searchResults
                    .filter(result => result.document.text.toLowerCase().includes('life'))
                    .slice(0, 2)
                    .map(result => result.document.text)
                    .join(' ');
                
                response = lifeContent || 'Our Life Insurance helps secure your family\'s financial future with flexible policies tailored to your needs and budget. We offer various coverage options to ensure your loved ones are protected.';
            } else if (lowerMessage.includes('auto') || lowerMessage.includes('car') || lowerMessage.includes('vehicle')) {
                const autoContent = searchResults
                    .filter(result => result.document.text.toLowerCase().includes('auto'))
                    .slice(0, 2)
                    .map(result => result.document.text)
                    .join(' ');
                
                response = autoContent || 'Our Auto Insurance protects your vehicle and yourself on the road with comprehensive coverage at competitive rates. We offer various coverage options to keep you protected while driving.';
            } else if (lowerMessage.includes('property') || lowerMessage.includes('home') || lowerMessage.includes('house')) {
                const propertyContent = searchResults
                    .filter(result => result.document.text.toLowerCase().includes('property'))
                    .slice(0, 2)
                    .map(result => result.document.text)
                    .join(' ');
                
                response = propertyContent || 'Our Property Insurance safeguards your home and belongings with comprehensive coverage that protects against damage, theft, and liability. We help protect your most valuable assets.';
            } else if (lowerMessage.includes('company') || lowerMessage.includes('about') || 
                      lowerMessage.includes('experience') || lowerMessage.includes('years')) {
                response = 'SecureLife Insurance has been a trusted partner for families and businesses across the nation since 1998. We combine over 25 years of experience with innovative technology to deliver personalized insurance solutions. We\'re rated A+ by AM Best for financial strength and stability, with licensed professionals averaging 15+ years of experience.';
            } else if (lowerMessage.includes('statistics') || lowerMessage.includes('stats') || 
                      lowerMessage.includes('claims processed') || lowerMessage.includes('percentage') || 
                      (lowerMessage.includes('performance') && !lowerMessage.includes('quote')) || lowerMessage.includes('98.5') ||
                      lowerMessage.includes('claims processing') || lowerMessage.includes('satisfaction') ||
                      lowerMessage.includes('customer rating') || lowerMessage.includes('response time')) {
                // Find statistics content
                const statsContent = searchResults
                    .filter(result => result.document.text.toLowerCase().includes('98.5') || 
                                    result.document.text.toLowerCase().includes('claims processed') ||
                                    result.document.text.toLowerCase().includes('statistics') ||
                                    result.document.text.toLowerCase().includes('performance'))
                    .slice(0, 1)
                    .map(result => result.document.text)
                    .join(' ');
                
                if (statsContent) {
                    response = 'Here are our key performance statistics: We process 98.5% of claims successfully, maintain a 4.9/5 customer satisfaction rating, and provide response times under 24 hours. We\'ve served 50K+ happy customers, paid $2.5B in claims, and have 25+ years of experience with a 4.9★ customer rating.';
                } else {
                    response = 'SecureLife Insurance maintains excellent performance metrics: 98.5% claims processing rate, 4.9/5 customer satisfaction, response time under 24 hours, 50K+ happy customers served, and $2.5B in claims paid over our 25+ years of experience.';
                }
            } else {
                // General response using the most relevant content
                const bestMatch = searchResults[0];
                if (bestMatch && bestMatch.document.text.length > 50) {
                    response = `${bestMatch.document.text.substring(0, 350)}${bestMatch.document.text.length > 350 ? '...' : ''}`;
                } else {
                    response = 'I\'m here to help with questions about SecureLife Insurance services. We offer Health, Life, Auto, and Property insurance with personalized coverage and competitive rates. How can I assist you with your insurance needs?';
                }
            }
        } else {
            response = 'I\'m here to help with questions about SecureLife Insurance services. We offer comprehensive insurance solutions including Health, Life, Auto, and Property insurance. Could you please be more specific about what you\'d like to know?';
        }

        res.json({
            success: true,
            message: response,
            sources: searchResults.length
        });

    } catch (error) {
        console.error('Chatbot error:', error);
        res.json({
            success: false,
            message: 'Sorry, I encountered an error. Please try again.'
        });
    }
});

// Serve the main page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Handle 404 errors
app.use('*', (req, res) => {
    res.status(404).json({
        success: false,
        message: 'Route not found'
    });
});

// Global error handler
app.use((error, req, res, next) => {
    console.error('Global error handler:', error);
    res.status(500).json({
        success: false,
        message: 'Internal server error'
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📧 Email service configured for ${process.env.NODE_ENV || 'development'} environment`);
    console.log(`🌐 Visit: http://localhost:${PORT}`);
    
    // Initialize chatbot after server starts
    initializeChatbot();
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM received. Shutting down gracefully...');
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('SIGINT received. Shutting down gracefully...');
    process.exit(0);
});

module.exports = app;