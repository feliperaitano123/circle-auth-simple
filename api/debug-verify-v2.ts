import { VercelRequest, VercelResponse } from '@vercel/node';
import { Redis } from '@upstash/redis';

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

  const results: any = {
    timestamp: new Date().toISOString(),
    email: email.toLowerCase().trim(),
    code: code.trim()
  };

  try {
    // Criar nova instância Redis explicitamente
    const redis = Redis.fromEnv();
    
    // Testar conexão básica
    await redis.set('test-connection', 'ok', { ex: 10 });
    const testValue = await redis.get('test-connection');
    results.connectionTest = testValue === 'ok';
    
    // Listar TODAS as chaves
    const allKeys = await redis.keys('*');
    results.allKeysCount = allKeys.length;
    results.allKeys = allKeys;
    
    // Listar chaves de verificação
    const verificationKeys = await redis.keys('verification:*');
    results.verificationKeys = verificationKeys;
    results.verificationCount = verificationKeys.length;
    
    // Buscar chave específica
    const key = `verification:${email.toLowerCase().trim()}`;
    const data = await redis.get(key);
    results.searchKey = key;
    results.foundData = !!data;
    results.data = data;
    
    if (data) {
      results.codeMatch = (data as any).code === code.trim();
      results.isExpired = Date.now() > (data as any).expiresAt;
    }
    
    await redis.del('test-connection');
    
    res.status(200).json({
      success: true,
      results
    });
    
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
      results
    });
  }
}