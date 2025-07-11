import { VercelRequest, VercelResponse } from '@vercel/node';
import { Storage } from '../lib/storage';
import { generateToken } from '../lib/tokens';
import { config } from '../lib/config';

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
    email: email.toLowerCase().trim(),
    code: code.trim(),
    timestamp: new Date().toISOString()
  };

  try {
    console.log('=== VERIFY SIMPLE START ===');
    console.log('Email:', email);
    console.log('Code:', code);
    
    const normalizedEmail = email.toLowerCase().trim();
    const trimmedCode = code.trim();
    
    console.log('Getting stored data...');
    const storedData = await Storage.getCode(normalizedEmail);
    results.foundStoredData = !!storedData;
    
    if (!storedData) {
      console.log('No stored data found');
      res.status(401).json({ 
        error: 'Código inválido ou expirado',
        debug: results
      });
      return;
    }
    
    console.log('Stored data found:', storedData);
    results.storedCode = storedData.code;
    results.codeMatch = storedData.code === trimmedCode;

    if (storedData.code !== trimmedCode) {
      console.log('Code mismatch');
      res.status(401).json({ 
        error: 'Código incorreto',
        debug: results
      });
      return;
    }

    console.log('Code matches! Generating token...');
    await Storage.deleteCode(normalizedEmail);

    const token = generateToken({
      memberId: storedData.memberId,
      email: storedData.email,
      name: 'Member',
      communityUrl: config.circle.communityUrl
    });

    console.log('Token generated successfully');
    res.status(200).json({
      success: true,
      token,
      expiresIn: config.jwt.expiresIn,
      debug: results
    });

  } catch (error: any) {
    console.error('=== VERIFY SIMPLE ERROR ===');
    console.error('Error:', error);
    results.errorMessage = error.message;
    results.errorStack = error.stack;
    
    res.status(500).json({ 
      error: 'Erro ao verificar código',
      debug: results
    });
  }
}