const nodemailer = require('nodemailer');
const mailgun = require('nodemailer-mailgun-transport');

const sendEmail = async (options) => {
  // Mailgun API key and domain from environment variables
  const auth = {
    auth: {
      api_key: process.env.MAILGUN_API_KEY, // Mailgun API key
      domain: process.env.MAILGUN_DOMAIN,  // Mailgun domain
    },
  };

  // Create a Mailgun transporter
  const transporter = nodemailer.createTransport(mailgun(auth));

  // Email options
  const mailOptions = {
    from: process.env.SMTP_MAIL,
    to: options.email,
    subject: options.subject,
    html: options.html,
    'o:tag': options.tag || 'default-tag', // Mailgun-specific option for tagging (optional)
  };

  try {
    const response = await transporter.sendMail(mailOptions);
    console.log('Email sent successfully:', response);
    return response;
  } catch (error) {
    console.error('Error sending email:', error.message);
    throw new Error('Failed to send email. Please try again later.');
  }
};

module.exports = sendEmail;
