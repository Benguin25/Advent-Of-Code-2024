# Reservely Contact Form Email Setup

## Overview

The contact form has been set up to send emails to `benprobert25@gmail.com` when users submit the contact form. The implementation includes:

1. **Backend Server**: Express.js server running on port 3001
2. **Email Service**: Using Nodemailer with Gmail SMTP
3. **Frontend Integration**: Updated Contact.jsx component with form handling

## Features

- ✅ Sends email to business owner (benprobert25@gmail.com) with contact form details
- ✅ Sends confirmation email to the user who submitted the form
- ✅ Form validation and error handling
- ✅ Loading states and success/error messages
- ✅ Professional email templates with HTML formatting

## Setup Instructions

### 1. Environment Variables

Make sure your `.env` file contains:

```
GMAIL_USER=benprobert25@gmail.com
GMAIL_PASS=GoodEmail1!
```

**Important**: For Gmail, you need to use an "App Password" instead of your regular password:

1. Enable 2-factor authentication on your Gmail account
2. Go to Google Account settings > Security > App passwords
3. Generate a new app password for "Mail"
4. Use this app password in the `GMAIL_PASS` variable

### 2. Running the Application

#### Option 1: Run Frontend and Backend Together

```bash
npm run dev:full
```

#### Option 2: Run Separately

Terminal 1 (Frontend):

```bash
npm run dev
```

Terminal 2 (Backend):

```bash
npm run server
```

### 3. Testing the Contact Form

1. Start both frontend (http://localhost:5173) and backend (http://localhost:3001)
2. Navigate to the Contact page
3. Fill out the form with:
   - Name: Your test name
   - Email: Your email address
   - Subject: Test message
   - Message: Any test message
4. Click "Send Message"
5. You should receive two emails:
   - Business notification at `benprobert25@gmail.com`
   - Confirmation email at the email address you provided

## Email Templates

### Business Notification Email

Contains:

- Customer's name and email
- Subject line
- Full message content
- Professional formatting with clear sections

### Customer Confirmation Email

Contains:

- Thank you message
- Copy of their submitted message
- Professional Reservely branding

## API Endpoints

### POST /api/contact

Handles contact form submissions.

**Request Body:**

```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "subject": "Question about reservations",
  "message": "I have a question..."
}
```

**Response:**

```json
{
  "success": true,
  "message": "Your message has been sent successfully!"
}
```

### GET /api/health

Health check endpoint to verify server is running.

## Troubleshooting

### Common Issues

1. **Gmail Authentication Error**
   - Ensure you're using an App Password, not your regular Gmail password
   - Verify 2-factor authentication is enabled

2. **CORS Errors**
   - Backend server includes CORS middleware for frontend communication

3. **Server Not Starting**
   - Check that port 3001 is available
   - Verify all dependencies are installed in both root and server directories

4. **Environment Variables Not Loading**
   - Server looks for `.env` file in the parent directory (`../env`)
   - Ensure the path is correct relative to the server directory

## File Structure

```
reservely/
├── server/
│   ├── package.json
│   ├── index.js          # Express server
│   └── emailService.js   # Email sending functionality
├── src/
│   └── components/
│       └── Contact.jsx   # Updated contact form
├── .env                  # Environment variables
└── package.json         # Updated with new scripts
```
