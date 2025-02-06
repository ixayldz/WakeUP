const nodemailer = require('nodemailer');

const sendEmail = async (options) => {
  // Transporter oluştur
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });

  // Mail seçeneklerini ayarla
  const mailOptions = {
    from: `Wake UP <${process.env.SMTP_USER}>`,
    to: options.email,
    subject: options.subject,
    text: options.message
  };

  // Mail gönder
  await transporter.sendMail(mailOptions);
};

module.exports = sendEmail; 