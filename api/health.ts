import { VercelRequest, VercelResponse } from '@vercel/node';

export default function handler(_req: VercelRequest, res: VercelResponse) {
  res.status(200).json({
    status: 'healthy',
    service: 'Circle Auth Simple',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
}