const express = require('express');
const nodemailer = require('nodemailer');
const router = express.Router();

// Configure your transporter (use environment variables for real deployment)
const transporter = nodemailer.createTransport({
  service: 'gmail', // or another provider
  auth: {
    user: process.env.EMAIL_USER, // e.g. 'yourgmail@gmail.com'
    pass: process.env.EMAIL_PASS  // app password or real password
  }
});

router.post('/contact', async (req, res) => {
  const { name, email, message } = req.body;
  if (!name || !email || !message) {
    return res.status(400).json({ error: 'All fields are required.' });
  }
  try {
    await transporter.sendMail({
      from: email,
      to: 'support@reservely.ca',
      subject: `Business Contact Form from ${name}`,
      text: `Name: ${name}\nEmail: ${email}\n\n${message}`
    });
    res.status(200).json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to send email.' });
  }
});

module.exports = router;
