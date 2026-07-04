const nodemailer = require('nodemailer');
const path = require('path');

require('dotenv').config({
  path: path.join(__dirname, '../.env')
});

async function sendTestEmail() {
  try {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT),
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });

    const info = await transporter.sendMail({
      from: process.env.SMTP_FROM,
      to: 'danyazul250987@gmail.com',
      subject: 'Código de prueba - DanyBot',
      text: 'Este es un correo de prueba enviado desde DanyBot.'
    });

    console.log('✅ Correo enviado correctamente');
    console.log('ID del mensaje:', info.messageId);

  } catch (error) {
    console.error('❌ Error al enviar correo:', error);
  }
}

sendTestEmail();