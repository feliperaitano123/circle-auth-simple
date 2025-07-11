"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = handler;
const storage_1 = require("../lib/storage");
const tokens_1 = require("../lib/tokens");
const config_1 = require("../lib/config");
async function handler(req, res) {
    if (req.method !== 'POST') {
        res.status(405).json({ error: 'Method not allowed' });
        return;
    }
    const { email, code } = req.body;
    if (!email || !code) {
        res.status(400).json({ error: 'Email e código são obrigatórios' });
        return;
    }
    try {
        const normalizedEmail = email.toLowerCase().trim();
        const trimmedCode = code.trim();
        console.log('Verify attempt:', { email: normalizedEmail, codeLength: trimmedCode.length });
        const storedData = await storage_1.Storage.getCode(normalizedEmail);
        if (!storedData) {
            console.log('No stored data found for email:', normalizedEmail);
            res.status(401).json({
                error: 'Código inválido ou expirado'
            });
            return;
        }
        console.log('Stored data found:', {
            email: storedData.email,
            hasCode: !!storedData.code,
            attempts: storedData.attempts,
            expiresAt: new Date(storedData.expiresAt).toISOString()
        });
        if (storedData.code !== trimmedCode) {
            console.log('Code mismatch:', {
                provided: trimmedCode,
                expected: storedData.code,
                match: storedData.code === trimmedCode
            });
            const attempts = await storage_1.Storage.incrementAttempts(normalizedEmail);
            if (attempts >= config_1.config.codes.maxAttempts) {
                res.status(429).json({
                    error: 'Muitas tentativas incorretas. Solicite um novo código.'
                });
                return;
            }
            res.status(401).json({
                error: `Código incorreto. ${config_1.config.codes.maxAttempts - attempts} tentativas restantes.`
            });
            return;
        }
        console.log('Code verified successfully, generating token');
        await storage_1.Storage.deleteCode(normalizedEmail);
        const token = (0, tokens_1.generateToken)({
            memberId: storedData.memberId,
            email: storedData.email,
            name: 'Member',
            communityUrl: config_1.config.circle.communityUrl
        });
        res.status(200).json({
            success: true,
            token,
            expiresIn: config_1.config.jwt.expiresIn
        });
    }
    catch (error) {
        console.error('Verify error details:', {
            message: error.message,
            stack: error.stack,
            name: error.name,
            email: email?.toLowerCase()?.trim()
        });
        res.status(500).json({
            error: 'Erro ao verificar código'
        });
    }
}
