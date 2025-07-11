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
        const response = await axios_1.default.post(`${config_1.config.circle.apiUrl}/api/v1/headless/auth_token`, { email: email.toLowerCase().trim() }, {
            headers: {
                'Authorization': `Bearer ${config_1.config.circle.apiToken}`,
                'Content-Type': 'application/json'
            }
        });
        if (!response.data?.access_token) {
            return null;
        }
        const memberResponse = await axios_1.default.get(`${config_1.config.circle.apiUrl}/api/headless/v1/me`, {
            headers: {
                'Authorization': `Bearer ${response.data.access_token}`
            }
        });
        const member = memberResponse.data;
        if (member && member.status === 'active') {
            return {
                id: member.id,
                email: member.email,
                name: member.name || member.first_name || 'Membro',
                status: member.status
            };
        }
        return null;
    }
    catch (error) {
        console.error('Circle API error:', error);
        return null;
    }
}
