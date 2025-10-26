// Chatbot functionality
class Chatbot {
    constructor() {
        this.isOpen = false;
        this.isLoading = false;
        this.initializeElements();
        this.bindEvents();
    }

    initializeElements() {
        this.widget = document.getElementById('chatbot-widget');
        this.toggle = document.getElementById('chatbot-toggle');
        this.container = document.getElementById('chatbot-container');
        this.closeBtn = document.getElementById('chatbot-close');
        this.messages = document.getElementById('chatbot-messages');
        this.input = document.getElementById('chatbot-input');
        this.sendBtn = document.getElementById('chatbot-send');
    }

    bindEvents() {
        this.toggle.addEventListener('click', () => this.toggleChat());
        this.closeBtn.addEventListener('click', () => this.closeChat());
        this.sendBtn.addEventListener('click', () => this.sendMessage());
        this.input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });

        // Close chatbot when clicking outside
        document.addEventListener('click', (e) => {
            if (this.isOpen && !this.widget.contains(e.target)) {
                this.closeChat();
            }
        });
    }

    toggleChat() {
        if (this.isOpen) {
            this.closeChat();
        } else {
            this.openChat();
        }
    }

    openChat() {
        this.isOpen = true;
        this.widget.classList.add('chatbot-widget--open');
        this.input.focus();
    }

    closeChat() {
        this.isOpen = false;
        this.widget.classList.remove('chatbot-widget--open');
    }

    async sendMessage() {
        const message = this.input.value.trim();
        if (!message || this.isLoading) return;

        // Add user message to chat
        this.addMessage(message, 'user');
        this.input.value = '';

        // Show loading state
        this.setLoading(true);
        const loadingMessage = this.addMessage('Thinking...', 'bot', true);

        try {
            // Send message to chatbot API
            const response = await fetch('/api/chatbot', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ message })
            });

            const data = await response.json();

            // Remove loading message
            loadingMessage.remove();

            if (response.ok && data.success) {
                this.addMessage(data.message, 'bot');
            } else if (data.error) {
                // Handle rate limiting or other API errors
                this.addMessage(data.error, 'bot');
            } else {
                this.addMessage(data.message || 'Sorry, I encountered an error. Please try again.', 'bot');
            }
        } catch (error) {
            console.error('Chatbot error:', error);
            loadingMessage.remove();
            this.addMessage('Sorry, I\'m having trouble connecting. Please try again later.', 'bot');
        } finally {
            this.setLoading(false);
            // Keep focus on input field after sending message
            this.input.focus();
        }
    }

    addMessage(content, sender, isLoading = false) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${sender}-message${isLoading ? ' loading' : ''}`;
        
        const contentDiv = document.createElement('div');
        contentDiv.className = 'message-content';
        contentDiv.textContent = content;
        
        messageDiv.appendChild(contentDiv);
        this.messages.appendChild(messageDiv);
        
        // Scroll to bottom
        this.messages.scrollTop = this.messages.scrollHeight;
        
        return messageDiv;
    }

    setLoading(loading) {
        this.isLoading = loading;
        this.sendBtn.disabled = loading;
        this.input.disabled = loading;
        
        if (loading) {
            this.sendBtn.classList.add('loading');
        } else {
            this.sendBtn.classList.remove('loading');
        }
    }
}

// Initialize chatbot when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new Chatbot();
});