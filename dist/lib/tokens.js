"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateToken = generateToken;
exports.verifyToken = verifyToken;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const config_1 = require("./config");
function generateToken(payload) {
    return jsonwebtoken_1.default.sign({
        ...payload,
        iat: Math.floor(Date.now() / 1000)
    }, config_1.config.jwt.secret, {
        expiresIn: config_1.config.jwt.expiresIn,
        audience: 'mcp-client',
        issuer: config_1.config.app.name
    });
}
function verifyToken(token) {
    try {
        const decoded = jsonwebtoken_1.default.verify(token, config_1.config.jwt.secret, {
            audience: 'mcp-client',
            issuer: config_1.config.app.name
        });
        return {
            memberId: decoded.memberId,
            email: decoded.email,
            name: decoded.name,
            communityUrl: decoded.communityUrl
        };
    }
    catch (error) {
        return null;
    }
}
