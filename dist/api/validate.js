"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = handler;
const circle_1 = require("../lib/circle");
const storage_1 = require("../lib/storage");
const email_1 = require("../lib/email");
async function handler(req, res) {
    if (req.method !== 'POST') {
        res.status(405).json({ error: 'Method not allowed' });
        return;
    }
    const { email } = req.body;
    if (!email || typeof email !== 'string') {
        res.status(400).json({ error: 'Email inválido' });
        return;
    }
    const normalizedEmail = email.toLowerCase().trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(normalizedEmail)) {
        res.status(400).json({ error: 'Formato de email inválido' });
        return;
    }
    try {
        const isRateLimited = await storage_1.Storage.isRateLimited(normalizedEmail);
        if (isRateLimited) {
            res.status(429).json({
                error: 'Muitas tentativas. Tente novamente em 10 minutos.'
            });
            return;
        }
        const member = await (0, circle_1.verifyCircleMember)(normalizedEmail);
        if (!member) {
            res.status(404).json({
                error: 'Email não encontrado na comunidade'
            });
            return;
        }
        const code = storage_1.Storage.generateCode();
        console.log('Generated code for:', normalizedEmail, 'Code:', code);
        await storage_1.Storage.storeCode(normalizedEmail, code, member.id);
        console.log('Code stored successfully');
        console.log('Sending verification email to:', normalizedEmail);
        const emailSent = await (0, email_1.sendVerificationEmail)({
            to: normalizedEmail,
            code,
            name: member.name
        });
        if (!emailSent) {
            res.status(500).json({
                error: 'Erro ao enviar email. Tente novamente.'
            });
            return;
        }
        res.status(200).json({
            success: true,
            message: 'Código enviado para seu email',
            expiresIn: 600
        });
    }
    catch (error) {
        console.error('Validation error:', {
            message: error.message,
            stack: error.stack,
            email: email?.toLowerCase()?.trim()
        });
        res.status(500).json({
            error: 'Erro interno. Tente novamente.'
        });
    }
}
