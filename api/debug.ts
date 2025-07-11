import { VercelRequest, VercelResponse } from '@vercel/node';
import { Storage } from '../lib/storage';

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const { email } = req.query;

  if (!email || typeof email !== 'string') {
    res.status(400).json({ error: 'Email required' });
    return;
  }

  try {
    const normalizedEmail = email.toLowerCase().trim();
    console.log('🔍 DEBUG - Checking stored data for:', normalizedEmail);
    
    const storedData = await Storage.getCode(normalizedEmail);
    console.log('🔍 DEBUG - Retrieved data:', storedData);
    
    res.status(200).json({
      email: normalizedEmail,
      hasStoredData: !!storedData,
      storedData: storedData ? {
        code: storedData.code,
        attempts: storedData.attempts,
        expiresAt: storedData.expiresAt,
        createdAt: storedData.createdAt
      } : null
    });

  } catch (error: any) {
    console.error('Debug error:', error);
    res.status(500).json({ error: error.message });
  }
}