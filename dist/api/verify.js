"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = handler;
const codes_1 = require("../lib/codes");
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
        const codeData = await (0, codes_1.verifyCode)(email.toLowerCase().trim(), code.trim());
        if (!codeData) {
            res.status(401).json({
                error: 'Código inválido ou expirado'
            });
            return;
        }
        const token = (0, tokens_1.generateToken)({
            memberId: codeData.memberId,
            email: codeData.email,
            name: codeData.memberName,
            communityUrl: config_1.config.circle.communityUrl
        });
        res.status(200).json({
            success: true,
            token,
            expiresIn: config_1.config.jwt.expiresIn
        });
    }
    catch (error) {
        console.error('Verify error:', error);
        if (error.message?.includes('bloqueado')) {
            res.status(429).json({
                error: error.message
            });
            return;
        }
        res.status(500).json({
            error: 'Erro ao verificar código'
        });
    }
}
