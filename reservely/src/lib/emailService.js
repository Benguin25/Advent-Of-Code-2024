import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER, // your Gmail address
    pass: process.env.GMAIL_PASS, // your app password (not your normal Gmail password)
  },
});

export const sendEmail = async (to, subject, html) => {
  await transporter.sendMail({
    from: `"Reservely" <${process.env.GMAIL_USER}>`,
    to,
    subject,
    html,
  });
};
