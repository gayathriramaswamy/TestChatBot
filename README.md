# SecureLife Insurance Website

A professional, responsive single-page insurance website with integrated contact form and email submission system. Built according to the Product Requirements Document specifications.

## 🚀 Features

- **Responsive Design**: Works seamlessly across desktop, tablet, and mobile devices
- **Professional UI**: Modern, trustworthy design with insurance industry best practices
- **Contact Form**: Comprehensive inquiry form with validation
- **Email Integration**: Automated email notifications to client inbox
- **Security**: HTTPS, input validation, rate limiting, and spam protection
- **Performance**: Optimized for fast loading and smooth user experience

## 📋 Services Offered

- Health Insurance
- Life Insurance
- Auto Insurance
- Property Insurance

## 🛠️ Technology Stack

- **Frontend**: HTML5, CSS3, JavaScript (ES6+)
- **Backend**: Node.js, Express.js
- **Email**: Nodemailer with SMTP support
- **Security**: Helmet.js, CORS, Rate Limiting
- **Deployment**: Vercel (serverless)
- **Styling**: Custom CSS with responsive design

## 📦 Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd InsuranceProject1
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup**
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` file with your configuration:
   ```env
   NODE_ENV=development
   PORT=3000
   EMAIL_USER=your-email@gmail.com
   EMAIL_PASS=your-app-password
   CLIENT_EMAIL=client@securelifeinsurance.com
   ```

4. **Start the development server**
   ```bash
   npm run dev
   ```

5. **Visit the website**
   Open [http://localhost:3000](http://localhost:3000) in your browser

## 🚀 Deployment

### Vercel Deployment (Recommended)

1. **Install Vercel CLI**
   ```bash
   npm install -g vercel
   ```

2. **Deploy to Vercel**
   ```bash
   vercel
   ```

3. **Set Environment Variables**
   In Vercel dashboard, add the following environment variables:
   - `NODE_ENV=production`
   - `EMAIL_USER=your-email@gmail.com`
   - `EMAIL_PASS=your-app-password`
   - `CLIENT_EMAIL=client@securelifeinsurance.com`
   - `EMAIL_FROM=noreply@yourdomain.com`

### Alternative: Traditional Hosting

1. **Build for production**
   ```bash
   npm run build
   ```

2. **Start production server**
   ```bash
   npm start
   ```

## 📧 Email Configuration

### Gmail Setup (Recommended for Development)

1. Enable 2-Factor Authentication on your Gmail account
2. Generate an App Password:
   - Go to Google Account settings
   - Security → 2-Step Verification → App passwords
   - Generate password for "Mail"
3. Use the generated password in `EMAIL_PASS`

### Production Email Services

For production, consider using:
- **SendGrid**: Professional email delivery service
- **Mailgun**: Reliable email API
- **Amazon SES**: Cost-effective email service

## 🔒 Security Features

- **HTTPS Enforcement**: All connections secured with SSL/TLS
- **Input Validation**: Frontend and backend form validation
- **Rate Limiting**: Prevents spam and abuse (5 requests per 15 minutes)
- **CORS Protection**: Configured for specific domains
- **Security Headers**: Helmet.js for additional security
- **Data Sanitization**: Input sanitization and validation

## 📱 Responsive Design

The website is fully responsive and tested on:
- Desktop (1200px+)
- Tablet (768px - 1199px)
- Mobile (320px - 767px)

## 🎨 Customization

### Colors and Branding

Edit `styles.css` to customize:
- Primary color: `#2563eb` (Blue)
- Secondary color: `#1e293b` (Dark Blue)
- Success color: `#10b981` (Green)
- Error color: `#ef4444` (Red)

### Content Updates

1. **Company Information**: Update in `index.html`
2. **Contact Details**: Modify contact section
3. **Services**: Edit services section with your offerings
4. **Email Templates**: Customize in `server.js`

## 📊 Form Fields

The contact form includes:
- **Name** (required): Full name validation
- **Email** (required): Email format validation
- **Phone** (required): Phone number validation
- **Insurance Type** (required): Dropdown selection
- **Message** (optional): Additional information
- **Opt-in** (optional): Marketing communications consent

## 🔧 API Endpoints

### POST /api/send-inquiry
Processes contact form submissions.

**Request Body:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "phone": "+1234567890",
  "insuranceType": "health",
  "message": "I need health insurance information",
  "optIn": true
}
```

**Response:**
```json
{
  "success": true,
  "message": "Inquiry sent successfully"
}
```

### GET /api/health
Health check endpoint for monitoring.

## 🐛 Troubleshooting

### Common Issues

1. **Email not sending**
   - Check email credentials in `.env`
   - Verify Gmail app password setup
   - Check server logs for errors

2. **Form validation errors**
   - Ensure all required fields are filled
   - Check email format
   - Verify phone number format

3. **Deployment issues**
   - Verify environment variables are set
   - Check Vercel function logs
   - Ensure all dependencies are installed

### Development Tips

- Use `npm run dev` for development with auto-restart
- Check browser console for JavaScript errors
- Monitor server logs for backend issues
- Test form submission in different browsers

## 📈 Performance Optimization

- **Minified CSS/JS**: Optimized for production
- **Image Optimization**: SVG icons for scalability
- **Lazy Loading**: Images loaded on demand
- **Caching**: Static assets cached for performance
- **CDN**: Font Awesome and Google Fonts via CDN

## 🔄 Future Enhancements

As mentioned in the PRD, future versions may include:
- Policy comparison tools
- Online quote generation
- User account management
- Online payments
- Customer portal
- Live chat integration
- Multi-language support

## 📞 Support

For technical support or questions:
- Email: support@securelifeinsurance.com
- Phone: (555) 123-4567

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- Font Awesome for icons
- Google Fonts for typography
- Vercel for hosting platform
- Express.js community for excellent documentation

---

**Built with ❤️ for SecureLife Insurance**