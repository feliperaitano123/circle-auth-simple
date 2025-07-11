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

  try {
    const normalizedEmail = email.toLowerCase().trim();
    const trimmedCode = code.trim();
    
    console.log('🔍 DEBUG Verify - Email:', normalizedEmail, 'Code:', trimmedCode);

    const storedData = await Storage.getCode(normalizedEmail);
    console.log('🔍 DEBUG Verify - Stored data:', storedData);
    
    if (!storedData) {
      console.log('❌ DEBUG Verify - No stored data found');
      res.status(401).json({ 
        error: 'Código inválido ou expirado' 
      });
      return;
    }

    if (storedData.code !== trimmedCode) {
      console.log('❌ DEBUG Verify - Code mismatch. Stored:', storedData.code, 'Received:', trimmedCode);
      const attempts = await Storage.incrementAttempts(normalizedEmail);
      
      if (attempts >= config.codes.maxAttempts) {
        res.status(429).json({ 
          error: 'Muitas tentativas incorretas. Solicite um novo código.' 
        });
        return;
      }
      
      res.status(401).json({ 
        error: `Código incorreto. ${config.codes.maxAttempts - attempts} tentativas restantes.`
      });
      return;
    }

    console.log('✅ DEBUG Verify - Code matches! Generating token...');
    await Storage.deleteCode(normalizedEmail);

    const token = generateToken({
      memberId: storedData.memberId,
      email: storedData.email,
      name: 'Member',
      communityUrl: config.circle.communityUrl
    });

    console.log('✅ DEBUG Verify - Token generated successfully');
    res.status(200).json({
      success: true,
      token,
      expiresIn: config.jwt.expiresIn
    });

  } catch (error: any) {
    console.error('Verify error:', error);
    
    res.status(500).json({ 
      error: 'Erro ao verificar código' 
    });
  }
}