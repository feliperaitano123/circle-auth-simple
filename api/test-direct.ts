import { VercelRequest, VercelResponse } from '@vercel/node';
import { Redis } from '@upstash/redis';

const redis = Redis.fromEnv();

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const { action, email, code } = req.body;
  const results: any = { action, timestamp: new Date().toISOString() };

  try {
    if (action === 'store') {
      // Simular o que Storage.storeCode faz
      const key = `verification:${email}`;
      const testData = {
        code: code || '123456',
        email,
        memberId: 999,
        attempts: 0,
        expiresAt: Date.now() + (10 * 60 * 1000), // 10 minutos
        createdAt: Date.now()
      };

      console.log('Storing direct test data:', testData);
      await redis.set(key, testData, { ex: 600 }); // 10 minutos TTL
      
      results.stored = true;
      results.key = key;
      results.data = testData;
      
      // Verificar imediatamente se foi armazenado
      const immediate = await redis.get(key);
      results.immediateRead = !!immediate;
      results.immediateData = immediate;
      
    } else if (action === 'get') {
      // Simular o que Storage.getCode faz
      const key = `verification:${email}`;
      console.log('Getting data for key:', key);
      
      const data = await redis.get(key);
      results.found = !!data;
      results.key = key;
      results.data = data;
      
      if (data) {
        results.codeMatch = (data as any).code === code;
        results.expired = Date.now() > (data as any).expiresAt;
      }
      
    } else if (action === 'list') {
      // Listar todas as chaves
      const keys = await redis.keys('verification:*');
      results.keys = keys;
      results.count = keys.length;
      
      if (keys.length > 0) {
        const samples = [];
        for (const key of keys.slice(0, 3)) {
          const data = await redis.get(key);
          samples.push({ key, data });
        }
        results.samples = samples;
      }
    }

    res.status(200).json({
      success: true,
      results
    });
    
  } catch (error: any) {
    console.error('Direct test error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      results
    });
  }
}