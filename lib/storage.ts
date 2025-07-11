import { createClient } from 'redis';
import { config } from './config';

let redisClient: any = null;

async function getRedisClient() {
  if (!redisClient) {
    if (!process.env.REDIS_URL) {
      throw new Error('REDIS_URL is not configured');
    }
    
    try {
      redisClient = createClient({
        url: process.env.REDIS_URL
      });
      
      redisClient.on('error', (err: any) => {
        console.error('Redis Client Error:', err);
        redisClient = null;
      });
      
      await redisClient.connect();
      console.log('Redis connected successfully');
    } catch (error) {
      console.error('Failed to connect to Redis:', error);
      redisClient = null;
      throw new Error('Failed to connect to Redis');
    }
  }
  return redisClient;
}

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

  static async storeCode(email: string, code: string, memberId: number): Promise<void> {
    console.log('Storage.storeCode called:', { email, code, memberId });
    const redis = await getRedisClient();
    const key = this.getCodeKey(email);
    console.log('Storage key:', key);
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
    console.log('Storing verification data:', verificationData);
    await redis.setEx(key, ttlSeconds, JSON.stringify(verificationData));
    console.log('Code stored successfully with TTL:', ttlSeconds, 'seconds');
  }

  static async getCode(email: string): Promise<VerificationCode | null> {
    console.log('Storage.getCode called for:', email);
    const redis = await getRedisClient();
    const key = this.getCodeKey(email);
    console.log('Looking for key:', key);
    const data = await redis.get(key);
    
    if (!data) {
      console.log('No data found for key:', key);
      return null;
    }
    console.log('Found data for key:', key);

    const verificationData = JSON.parse(data as string) as VerificationCode;
    
    // Check if expired
    if (Date.now() > verificationData.expiresAt) {
      console.log('Code expired for:', email, 'Expired at:', new Date(verificationData.expiresAt));
      await this.deleteCode(email);
      return null;
    }
    console.log('Code is valid, returning data');

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
    const redis = await getRedisClient();
    const remainingTtl = Math.max(0, Math.floor((verificationData.expiresAt - Date.now()) / 1000));
    const key = this.getCodeKey(email);
    await redis.setEx(key, remainingTtl, JSON.stringify(verificationData));
    
    return verificationData.attempts;
  }

  static async deleteCode(email: string): Promise<void> {
    const redis = await getRedisClient();
    const key = this.getCodeKey(email);
    await redis.del(key);
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

  static async debugListKeys(): Promise<string[]> {
    try {
      const redis = await getRedisClient();
      const keys = await redis.keys('verification:*');
      console.log('Debug - All verification keys:', keys);
      return keys;
    } catch (error) {
      console.error('Debug - Error listing keys:', error);
      return [];
    }
  }
}