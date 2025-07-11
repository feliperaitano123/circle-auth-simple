"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = void 0;
exports.validateConfig = validateConfig;
exports.config = {
    circle: {
        apiToken: process.env.CIRCLE_API_TOKEN,
        communityUrl: process.env.CIRCLE_COMMUNITY_URL,
        apiUrl: 'https://app.circle.so'
    },
    email: {
        apiKey: process.env.RESEND_API_KEY,
        fromEmail: process.env.FROM_EMAIL || 'noreply@example.com',
        fromName: process.env.FROM_NAME || 'Circle Auth'
    },
    jwt: {
        secret: process.env.JWT_SECRET,
        expiresIn: (process.env.JWT_EXPIRES_IN || '7d')
    },
    app: {
        name: process.env.APP_NAME || 'MCP Auth',
        url: process.env.APP_URL || 'http://localhost:3000'
    },
    kv: {
        url: process.env.KV_URL,
        token: process.env.KV_REST_API_TOKEN
    },
    codes: {
        length: 6,
        expireMinutes: 10,
        maxAttempts: 3
    }
};
function validateConfig() {
    const required = [
        'CIRCLE_API_TOKEN',
        'RESEND_API_KEY',
        'JWT_SECRET'
    ];
    const missing = required.filter(key => !process.env[key]);
    if (missing.length > 0) {
        throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
    }
}
