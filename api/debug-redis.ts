import { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from 'redis';

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const debugInfo: any = {
    hasRedisUrl: !!process.env.REDIS_URL,
    redisUrlFormat: process.env.REDIS_URL ? process.env.REDIS_URL.substring(0, 20) + '...' : 'not set',
    timestamp: new Date().toISOString()
  };

  try {
    // Tentar conectar usando o padrão da documentação
    console.log('Attempting Redis connection...');
    
    const client = createClient({
      url: process.env.REDIS_URL
    });
    
    client.on('error', (err) => {
      console.error('Redis Client Error:', err);
      debugInfo.redisError = err.message;
    });

    await client.connect();
    debugInfo.redisConnected = true;
    
    // Testar operações básicas
    const testKey = 'debug:test';
    await client.set(testKey, 'working', { EX: 60 });
    const testValue = await client.get(testKey);
    debugInfo.testWrite = testValue === 'working';
    
    // Listar chaves de verificação
    const keys = await client.keys('verification:*');
    debugInfo.verificationKeys = keys.length;
    
    await client.disconnect();
    
    res.status(200).json({
      success: true,
      debug: debugInfo
    });
    
  } catch (error: any) {
    console.error('Debug Redis error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      debug: debugInfo
    });
  }
}