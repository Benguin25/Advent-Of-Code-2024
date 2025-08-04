import nodemailer from 'nodemailer';

// Create transporter function to ensure environment variables are loaded
const createTransporter = () => {
  console.log(process.env.GMAIL_USER);
  console.log(process.env.GMAIL_PASS);
  
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_USER, // your Gmail address
      pass: process.env.GMAIL_PASS, // your app password (not your normal Gmail password)
    },
  });
};

export const sendEmail = async (to, subject, html) => {
  // Create transporter each time to ensure env vars are available
  const transporter = createTransporter();

  const info = await transporter.sendMail({
    from: `"Reservely" <noreply@reservely.ca>`,
    to,
    subject,
    html,
  });
  return info;
};
