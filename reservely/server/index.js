import express from 'express';
import cors from 'cors';

import dotenv from 'dotenv';
import { sendEmail } from './emailService.js';

// Always load environment variables from parent directory (../.env)
dotenv.config({ path: '../.env' });


const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Contact form endpoint
app.post('/api/contact', async (req, res) => {
  try {
    const { name, email, subject, message } = req.body;

    // Validate required fields
    if (!name || !email || !subject || !message) {
      return res.status(400).json({
        success: false,
        error: 'All fields are required',
      });
    }

    // Email content for you (the business owner)
    const emailToOwner = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">New Contact Form Submission</h2>
        <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p><strong>Name:</strong> ${name}</p>
          <p><strong>Email:</strong> ${email}</p>
          <p><strong>Subject:</strong> ${subject}</p>
        </div>
        <div style="background-color: #fff; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
          <h3 style="color: #333; margin-top: 0;">Message:</h3>
          <p style="line-height: 1.6;">${message.replace(/\n/g, '<br>')}</p>
        </div>
        <div style="margin-top: 20px; padding: 15px; background-color: #e8f4fd; border-radius: 8px;">
          <p style="margin: 0; color: #0066cc;"><strong>Reply to:</strong> ${email}</p>
        </div>
      </div>
    `;

    // Send email to support
    await sendEmail('support@reservely.ca', `Reservely Contact: ${subject}`, emailToOwner);

    // Email confirmation to the user
    const confirmationEmail = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563eb;">Thank you for contacting Reservely!</h2>
        <p>Hi ${name},</p>
        <p>We've received your message and will get back to you soon. Here's a copy of what you sent:</p>
        <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p><strong>Subject:</strong> ${subject}</p>
          <p><strong>Message:</strong></p>
          <p style="line-height: 1.6;">${message.replace(/\n/g, '<br>')}</p>
        </div>
        <p>Best regards,<br>The Reservely Team</p>
      </div>
    `;

    // Send confirmation email to the user
    await sendEmail(email, 'Thank you for contacting Reservely', confirmationEmail);

    res.json({
      success: true,
      message: 'Your message has been sent successfully!',
    });
  } catch (error) {
    console.error('Error sending contact email:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to send email. Please try again later.',
    });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'Server is running' });
});

// Reservation confirmation endpoint
app.post('/api/reservation-confirmation', async (req, res) => {
  try {
    const {
      customerEmail,
      restaurantOwnerEmail,
      customerName,
      restaurantName,
      date,
      time,
      partySize,
      reservationId,
      specialNotes,
    } = req.body;

    // Validate required fields
    if (
      !customerEmail ||
      !restaurantOwnerEmail ||
      !customerName ||
      !restaurantName ||
      !date ||
      !time ||
      !partySize ||
      !reservationId
    ) {
      return res.status(400).json({
        success: false,
        error: 'All required fields must be provided',
      });
    }

    // Format date and time for display
    const reservationDate = new Date(date);
    const formattedDate = reservationDate.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    // Format time (assuming time is in HH:MM format)
    const [hours, minutes] = time.split(':');
    const timeObj = new Date();
    timeObj.setHours(parseInt(hours), parseInt(minutes));
    const formattedTime = timeObj.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });

    // Email to customer
    const customerEmail_content = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #007bff; text-align: center;">🎉 Reservation Confirmed!</h2>
        <p>Hi ${customerName},</p>
        <p>Great news! Your reservation at <strong>${restaurantName}</strong> has been automatically confirmed and is all set!</p>
        
        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #007bff;">
          <h3 style="color: #333; margin-top: 0;">Reservation Details</h3>
          <p><strong>Restaurant:</strong> ${restaurantName}</p>
          <p><strong>Date:</strong> ${formattedDate}</p>
          <p><strong>Time:</strong> ${formattedTime}</p>
          <p><strong>Party Size:</strong> ${partySize} guest${partySize > 1 ? 's' : ''}</p>
          <p><strong>Reservation ID:</strong> ${reservationId}</p>
          ${specialNotes ? `<p><strong>Special Notes:</strong> ${specialNotes}</p>` : ''}
        </div>

        <div style="text-align: center; margin: 30px 0;">
          <a href="https://reservely.ca/reservation/${reservationId}" 
             style="background-color: #007bff; color: #1a1a1a; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
            View or Modify Reservation
          </a>
        </div>

        <div style="background-color: #d4edda; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #28a745;">
          <h4 style="color: #155724; margin-top: 0;">✅ Your Reservation is Confirmed</h4>
          <p style="margin: 5px 0;">• Your table is reserved and ready for you</p>
          <p style="margin: 5px 0;">• Please arrive on time for your reservation</p>
          <p style="margin: 5px 0;">• If you need to cancel or modify, please do so at least 2 hours in advance</p>
          <p style="margin: 5px 0;">• Contact the restaurant directly for any special requests</p>
        </div>

        <p>We look forward to serving you!</p>
        <p>Best regards,<br>The ${restaurantName} Team</p>
        
        <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
          <p style="color: #666; font-size: 12px;">This email was sent by Reservely on behalf of ${restaurantName}</p>
        </div>
      </div>
    `;

    // Email to restaurant owner
    const ownerEmail_content = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">🍽️ New Reservation Confirmed</h2>
        <p>Hello,</p>
        <p>A new reservation has been automatically confirmed for <strong>${restaurantName}</strong>.</p>
        
        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #28a745;">
          <h3 style="color: #333; margin-top: 0;">Reservation Details</h3>
          <p><strong>Customer:</strong> ${customerName}</p>
          <p><strong>Email:</strong> ${customerEmail}</p>
          <p><strong>Date:</strong> ${formattedDate}</p>
          <p><strong>Time:</strong> ${formattedTime}</p>
          <p><strong>Party Size:</strong> ${partySize} guest${partySize > 1 ? 's' : ''}</p>
          <p><strong>Reservation ID:</strong> ${reservationId}</p>
          ${specialNotes ? `<p><strong>Special Notes:</strong> ${specialNotes}</p>` : ''}
        </div>

        <div style="background-color: #d4edda; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #28a745;">
          <h4 style="color: #155724; margin-top: 0;">✅ Reservation Confirmed</h4>
          <p style="margin: 5px 0;">• This reservation is automatically confirmed and active</p>
          <p style="margin: 5px 0;">• The customer has been notified via email</p>
          <p style="margin: 5px 0;">• Prepare your table for the scheduled time</p>
          <p style="margin: 5px 0;">• Contact the customer if you have any questions</p>
        </div>

        <p>Best regards,<br>The Reservely Team</p>
        
        <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
          <p style="color: #666; font-size: 12px;">This is an automated notification from Reservely</p>
        </div>
      </div>
    `;

    // Send emails
    await sendEmail(
      customerEmail,
      `Reservation Confirmed - ${restaurantName}`,
      customerEmail_content
    );

    await sendEmail(
      restaurantOwnerEmail,
      `New Reservation - ${restaurantName}`,
      ownerEmail_content
    );

    res.json({
      success: true,
      message: 'Reservation confirmation emails sent successfully!',
    });
  } catch (error) {
    console.error('Error sending reservation confirmation emails:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to send confirmation emails. Please try again later.',
    });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
