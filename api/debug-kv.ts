import { VercelRequest, VercelResponse } from '@vercel/node';
import { kv } from '@vercel/kv';

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const debugInfo: any = {
    timestamp: new Date().toISOString(),
    kvAvailable: true
  };

  try {
    // Test basic KV operations
    console.log('Testing KV connection...');
    
    // Test write operation
    const testKey = 'debug:test';
    await kv.set(testKey, 'working', { ex: 60 });
    const testValue = await kv.get(testKey);
    debugInfo.testWrite = testValue === 'working';
    
    // List verification keys
    const keys = await kv.keys('verification:*');
    debugInfo.verificationKeys = keys.length;
    
    // If there are keys, get a sample
    if (keys.length > 0) {
      const sampleKey = keys[0];
      const sampleData = await kv.get(sampleKey);
      if (sampleData) {
        debugInfo.sampleVerification = {
          key: sampleKey,
          email: (sampleData as any).email,
          hasCode: !!(sampleData as any).code,
          codeLength: (sampleData as any).code ? (sampleData as any).code.length : 0,
          attempts: (sampleData as any).attempts,
          expiresAt: new Date((sampleData as any).expiresAt).toISOString()
        };
      }
    }
    
    // Clean up test key
    await kv.del(testKey);
    
    res.status(200).json({
      success: true,
      debug: debugInfo
    });
    
  } catch (error: any) {
    console.error('Debug KV error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      debug: debugInfo
    });
  }
}