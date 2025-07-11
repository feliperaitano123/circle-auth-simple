"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateCode = generateCode;
exports.saveCode = saveCode;
exports.verifyCode = verifyCode;
exports.checkRateLimit = checkRateLimit;
const kv_1 = require("@vercel/kv");
const crypto_1 = __importDefault(require("crypto"));
const config_1 = require("./config");
function generateCode() {
    return crypto_1.default.randomInt(100000, 999999).toString();
}
async function saveCode(email, memberId, memberName) {
    const code = generateCode();
    const key = `code:${email.toLowerCase()}`;
    const data = {
        email: email.toLowerCase(),
        code,
        attempts: 0,
        createdAt: Date.now(),
        memberId,
        memberName
    };
    await kv_1.kv.set(key, data, {
        ex: config_1.config.codes.expireMinutes * 60
    });
    return code;
}
async function verifyCode(email, code) {
    const key = `code:${email.toLowerCase()}`;
    const data = await kv_1.kv.get(key);
    if (!data) {
        return null;
    }
    if (data.attempts >= config_1.config.codes.maxAttempts) {
        await kv_1.kv.del(key);
        throw new Error('Código bloqueado por excesso de tentativas');
    }
    data.attempts++;
    await kv_1.kv.set(key, data, {
        ex: config_1.config.codes.expireMinutes * 60
    });
    if (data.code !== code) {
        if (data.attempts >= config_1.config.codes.maxAttempts) {
            await kv_1.kv.del(key);
            throw new Error('Código bloqueado por excesso de tentativas');
        }
        return null;
    }
    await kv_1.kv.del(key);
    return data;
}
async function checkRateLimit(email) {
    const key = `rate:${email.toLowerCase()}`;
    const attempts = await kv_1.kv.incr(key);
    if (attempts === 1) {
        await kv_1.kv.expire(key, 3600);
    }
    return attempts <= 3;
}
