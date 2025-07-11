"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyCircleMember = verifyCircleMember;
const axios_1 = __importDefault(require("axios"));
const config_1 = require("./config");
async function verifyCircleMember(email) {
    try {
        // Clean the token to remove any invalid characters
        const cleanToken = config_1.config.circle.apiToken.trim().replace(/[\r\n\t]/g, '');
        const normalizedEmail = email.toLowerCase().trim();
        const response = await axios_1.default.post(`${config_1.config.circle.apiUrl}/api/v1/headless/auth_token`, { email: normalizedEmail }, {
            headers: {
                'Authorization': `Bearer ${cleanToken}`,
                'Content-Type': 'application/json'
            }
        });
        if (!response.data?.access_token) {
            return null;
        }
        // Se chegou aqui, o membro foi autenticado com sucesso
        return {
            id: response.data.community_member_id,
            email: normalizedEmail,
            name: 'Membro', // Nome genérico já que não precisamos buscar detalhes
            status: 'active'
        };
    }
    catch (error) {
        console.error('Circle API error:', error.message);
        return null;
    }
}
