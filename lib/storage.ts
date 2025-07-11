import { kv } from '@vercel/kv';
import { config } from './config';

export interface VerificationCode {
  code: string;
  email: string;
  memberId: number;
  attempts: number;
  expiresAt: number;
  createdAt: number;
}

export class Storage {
  private static getCodeKey(email: string): string {
    return `verification:${email}`;
  }

  private static getAttemptsKey(email: string): string {
    return `attempts:${email}`;
  }

  static async storeCode(email: string, code: string, memberId: number): Promise<void> {
    const key = this.getCodeKey(email);
    const expiresAt = Date.now() + (config.codes.expireMinutes * 60 * 1000);
    
    const verificationData: VerificationCode = {
      code,
      email,
      memberId,
      attempts: 0,
      expiresAt,
      createdAt: Date.now()
    };

    // Store with TTL in seconds
    const ttlSeconds = config.codes.expireMinutes * 60;
    await kv.setex(key, ttlSeconds, JSON.stringify(verificationData));
  }

  static async getCode(email: string): Promise<VerificationCode | null> {
    const key = this.getCodeKey(email);
    const data = await kv.get(key);
    
    if (!data) {
      return null;
    }

    const verificationData = JSON.parse(data as string) as VerificationCode;
    
    // Check if expired
    if (Date.now() > verificationData.expiresAt) {
      await this.deleteCode(email);
      return null;
    }

    return verificationData;
  }

  static async incrementAttempts(email: string): Promise<number> {
    const verificationData = await this.getCode(email);
    
    if (!verificationData) {
      return 0;
    }

    verificationData.attempts += 1;
    
    if (verificationData.attempts >= config.codes.maxAttempts) {
      await this.deleteCode(email);
      return verificationData.attempts;
    }

    // Update with remaining TTL
    const remainingTtl = Math.max(0, Math.floor((verificationData.expiresAt - Date.now()) / 1000));
    const key = this.getCodeKey(email);
    await kv.setex(key, remainingTtl, JSON.stringify(verificationData));
    
    return verificationData.attempts;
  }

  static async deleteCode(email: string): Promise<void> {
    const key = this.getCodeKey(email);
    await kv.del(key);
  }

  static async isRateLimited(email: string): Promise<boolean> {
    const verificationData = await this.getCode(email);
    
    if (!verificationData) {
      return false;
    }

    // Check if too many attempts
    return verificationData.attempts >= config.codes.maxAttempts;
  }

  static generateCode(): string {
    const length = config.codes.length;
    let code = '';
    
    for (let i = 0; i < length; i++) {
      code += Math.floor(Math.random() * 10);
    }
    
    return code;
  }
}