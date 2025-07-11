import { VercelRequest, VercelResponse } from '@vercel/node';
import { config } from '../lib/config';

export default async function handler(_req: VercelRequest, res: VercelResponse): Promise<void> {
  const results = {
    jwtConfig: {
      secret: process.env.JWT_SECRET ? 'present' : 'missing',
      expiresIn: config.jwt.expiresIn,
      expiresInType: typeof config.jwt.expiresIn,
      expiresInRaw: process.env.JWT_EXPIRES_IN
    }
  };

  res.status(200).json(results);
}