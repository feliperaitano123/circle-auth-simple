"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendVerificationEmail = sendVerificationEmail;
const resend_1 = require("resend");
const config_1 = require("./config");
const resend = new resend_1.Resend(config_1.config.email.apiKey);
async function sendVerificationEmail({ to, code, name }) {
    try {
        const subject = `${code} - Seu código de verificação`;
        const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Código de Verificação</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
          }
          .container {
            background-color: #ffffff;
            border-radius: 8px;
            padding: 32px;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
          }
          .header {
            text-align: center;
            margin-bottom: 32px;
          }
          .logo {
            font-size: 32px;
            margin-bottom: 16px;
          }
          .code-box {
            background-color: #f3f4f6;
            border-radius: 8px;
            padding: 24px;
            text-align: center;
            margin: 32px 0;
          }
          .code {
            font-size: 36px;
            font-weight: bold;
            color: #5850ec;
            letter-spacing: 8px;
            font-family: monospace;
          }
          .info {
            color: #6b7280;
            font-size: 14px;
            text-align: center;
            margin-top: 24px;
          }
          .warning {
            background-color: #fef3c7;
            border-radius: 6px;
            padding: 16px;
            margin-top: 24px;
            font-size: 14px;
            color: #92400e;
          }
          .footer {
            text-align: center;
            margin-top: 32px;
            font-size: 12px;
            color: #9ca3af;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">🔐</div>
            <h1>Código de Verificação</h1>
          </div>
          
          <p>Olá ${name},</p>
          
          <p>Você solicitou acesso ao ${config_1.config.app.name}. Use o código abaixo para completar sua autenticação:</p>
          
          <div class="code-box">
            <div class="code">${code}</div>
          </div>
          
          <div class="info">
            Este código expira em ${config_1.config.codes.expireMinutes} minutos.
          </div>
          
          <div class="warning">
            ⚠️ <strong>Importante:</strong> Não compartilhe este código com ninguém. 
            Nossa equipe nunca pedirá seu código de verificação.
          </div>
          
          <div class="footer">
            <p>Se você não solicitou este código, ignore este email.</p>
            <p>${config_1.config.email.fromName}</p>
          </div>
        </div>
      </body>
      </html>
    `;
        const text = `
Olá ${name},

Seu código de verificação é: ${code}

Este código expira em ${config_1.config.codes.expireMinutes} minutos.

Se você não solicitou este código, ignore este email.

${config_1.config.email.fromName}
    `;
        const result = await resend.emails.send({
            from: `${config_1.config.email.fromName} <${config_1.config.email.fromEmail}>`,
            to: [to],
            subject,
            html,
            text
        });
        return result.error === null;
    }
    catch (error) {
        console.error('Email send error:', error);
        return false;
    }
}
