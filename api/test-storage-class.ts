import { VercelRequest, VercelResponse } from '@vercel/node';
import { Storage } from '../lib/storage';

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const { action, email, code } = req.body;
  const results: any = { 
    action, 
    timestamp: new Date().toISOString(),
    email: email?.toLowerCase()?.trim()
  };

  try {
    if (action === 'store') {
      // Usar exatamente a mesma classe Storage
      const generatedCode = Storage.generateCode();
      await Storage.storeCode(email, generatedCode, 999);
      results.stored = true;
      results.generatedCode = generatedCode;
      
    } else if (action === 'get') {
      // Usar exatamente a mesma classe Storage
      const data = await Storage.getCode(email);
      results.found = !!data;
      results.data = data;
      
      if (data && code) {
        results.codeMatch = data.code === code.trim();
        results.expired = Date.now() > data.expiresAt;
      }
      
    } else if (action === 'debug') {
      // Usar método debug da classe Storage
      const keys = await Storage.debugListKeys();
      results.keys = keys;
      results.keyCount = keys.length;
    }

    res.status(200).json({
      success: true,
      results
    });
    
  } catch (error: any) {
    console.error('Storage class test error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      results
    });
  }
}