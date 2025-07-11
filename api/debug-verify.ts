import { VercelRequest, VercelResponse } from '@vercel/node';
import { Redis } from '@upstash/redis';

const redis = Redis.fromEnv();

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const { email, code } = req.body;
  
  if (!email || !code) {
    res.status(400).json({ error: 'Email e código são obrigatórios' });
    return;
  }

  const debugInfo: any = {
    receivedEmail: email,
    normalizedEmail: email.toLowerCase().trim(),
    receivedCode: code,
    trimmedCode: code.trim(),
    codeLength: code.trim().length
  };

  try {
    // Buscar dados armazenados
    const key = `verification:${email.toLowerCase().trim()}`;
    debugInfo.searchKey = key;
    debugInfo.redisConnected = true;
    
    // Primeiro, listar todas as chaves para debug
    const allKeys = await redis.keys('verification:*');
    debugInfo.allKeys = allKeys;
    debugInfo.keyCount = allKeys.length;
    
    const storedData = await redis.get(key);
    debugInfo.foundData = !!storedData;
    
    if (storedData) {
      debugInfo.storedData = {
        email: (storedData as any).email,
        storedCode: (storedData as any).code,
        codeMatch: (storedData as any).code === code.trim(),
        attempts: (storedData as any).attempts,
        expiresAt: new Date((storedData as any).expiresAt).toISOString(),
        isExpired: Date.now() > (storedData as any).expiresAt
      };
      
      // Comparação detalhada
      debugInfo.comparison = {
        providedCode: code.trim(),
        storedCode: (storedData as any).code,
        providedCodeChars: code.trim().split('').map((c: string) => c.charCodeAt(0)),
        storedCodeChars: (storedData as any).code.split('').map((c: string) => c.charCodeAt(0)),
        exactMatch: (storedData as any).code === code.trim()
      };
    }
    
    res.status(200).json({
      success: true,
      debug: debugInfo
    });
    
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
      debug: debugInfo
    });
  }
}