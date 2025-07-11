import { kv } from '@vercel/kv';
import crypto from 'crypto';
import { config } from './config';

interface CodeData {
  email: string;
  code: string;
  attempts: number;
  createdAt: number;
  memberId: number;
  memberName: string;
}

export function generateCode(): string {
  return crypto.randomInt(100000, 999999).toString();
}

export async function saveCode(email: string, memberId: number, memberName: string): Promise<string> {
  const code = generateCode();
  const key = `code:${email.toLowerCase()}`;
  
  const data: CodeData = {
    email: email.toLowerCase(),
    code,
    attempts: 0,
    createdAt: Date.now(),
    memberId,
    memberName
  };

  await kv.set(key, data, {
    ex: config.codes.expireMinutes * 60
  });

  return code;
}

export async function verifyCode(email: string, code: string): Promise<CodeData | null> {
  const key = `code:${email.toLowerCase()}`;
  const data = await kv.get<CodeData>(key);

  if (!data) {
    return null;
  }

  if (data.attempts >= config.codes.maxAttempts) {
    await kv.del(key);
    throw new Error('Código bloqueado por excesso de tentativas');
  }

  data.attempts++;
  await kv.set(key, data, {
    ex: config.codes.expireMinutes * 60
  });

  if (data.code !== code) {
    if (data.attempts >= config.codes.maxAttempts) {
      await kv.del(key);
      throw new Error('Código bloqueado por excesso de tentativas');
    }
    return null;
  }

  await kv.del(key);
  return data;
}

export async function checkRateLimit(email: string): Promise<boolean> {
  const key = `rate:${email.toLowerCase()}`;
  const attempts = await kv.incr(key);
  
  if (attempts === 1) {
    await kv.expire(key, 3600);
  }
  
  return attempts <= 3;
}