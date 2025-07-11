import { VercelRequest, VercelResponse } from '@vercel/node';
import { verifyCode } from '../lib/codes';
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
    const codeData = await verifyCode(email.toLowerCase().trim(), code.trim());

    if (!codeData) {
      res.status(401).json({ 
        error: 'Código inválido ou expirado' 
      });
      return;
    }

    const token = generateToken({
      memberId: codeData.memberId,
      email: codeData.email,
      name: codeData.memberName,
      communityUrl: config.circle.communityUrl
    });

    res.status(200).json({
      success: true,
      token,
      expiresIn: config.jwt.expiresIn
    });

  } catch (error: any) {
    console.error('Verify error:', error);
    
    if (error.message?.includes('bloqueado')) {
      res.status(429).json({ 
        error: error.message 
      });
      return;
    }

    res.status(500).json({ 
      error: 'Erro ao verificar código' 
    });
  }
}