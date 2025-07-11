import { VercelRequest, VercelResponse } from '@vercel/node';
import { verifyCircleMember } from '../lib/circle';
import { saveCode, checkRateLimit } from '../lib/codes';
import { sendVerificationEmail } from '../lib/email';

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const { email } = req.body;

  if (!email || typeof email !== 'string') {
    res.status(400).json({ error: 'Email inválido' });
    return;
  }

  const normalizedEmail = email.toLowerCase().trim();

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(normalizedEmail)) {
    res.status(400).json({ error: 'Formato de email inválido' });
    return;
  }

  try {
    const canProceed = await checkRateLimit(normalizedEmail);
    if (!canProceed) {
      res.status(429).json({ 
        error: 'Muitas tentativas. Tente novamente em 1 hora.' 
      });
      return;
    }

    const member = await verifyCircleMember(normalizedEmail);
    
    if (!member) {
      res.status(404).json({ 
        error: 'Email não encontrado na comunidade' 
      });
      return;
    }

    const code = await saveCode(normalizedEmail, member.id, member.name);

    const emailSent = await sendVerificationEmail({
      to: normalizedEmail,
      code,
      name: member.name
    });

    if (!emailSent) {
      res.status(500).json({ 
        error: 'Erro ao enviar email. Tente novamente.' 
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'Código enviado para seu email',
      expiresIn: 600
    });

  } catch (error) {
    console.error('Validation error:', error);
    res.status(500).json({ 
      error: 'Erro interno. Tente novamente.' 
    });
  }
}