import { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from 'redis';

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

  let client;
  
  try {
    // Conectar ao Redis
    client = createClient({
      url: process.env.REDIS_URL
    });
    
    await client.connect();
    debugInfo.redisConnected = true;
    
    // Buscar dados armazenados
    const key = `verification:${email.toLowerCase().trim()}`;
    debugInfo.searchKey = key;
    
    const storedDataRaw = await client.get(key);
    debugInfo.foundData = !!storedDataRaw;
    
    if (storedDataRaw) {
      const storedData = JSON.parse(storedDataRaw);
      debugInfo.storedData = {
        email: storedData.email,
        storedCode: storedData.code,
        codeMatch: storedData.code === code.trim(),
        attempts: storedData.attempts,
        expiresAt: new Date(storedData.expiresAt).toISOString(),
        isExpired: Date.now() > storedData.expiresAt
      };
      
      // Comparação detalhada
      debugInfo.comparison = {
        providedCode: code.trim(),
        storedCode: storedData.code,
        providedCodeChars: code.trim().split('').map((c: string) => c.charCodeAt(0)),
        storedCodeChars: storedData.code.split('').map((c: any) => c.charCodeAt(0)),
        exactMatch: storedData.code === code.trim()
      };
    }
    
    await client.disconnect();
    
    res.status(200).json({
      success: true,
      debug: debugInfo
    });
    
  } catch (error: any) {
    if (client) {
      await client.disconnect();
    }
    
    res.status(500).json({
      success: false,
      error: error.message,
      debug: debugInfo
    });
  }
}