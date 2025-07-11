import { VercelRequest, VercelResponse } from '@vercel/node';
import { kv } from '@vercel/kv';

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  try {
    // Test KV connection
    await kv.set('test', 'working', { ex: 60 });
    const testValue = await kv.get('test');
    
    res.status(200).json({
      success: true,
      kv_test: testValue,
      env_check: {
        KV_REST_API_URL: !!process.env.KV_REST_API_URL,
        KV_REST_API_TOKEN: !!process.env.KV_REST_API_TOKEN,
        CIRCLE_API_TOKEN: !!process.env.CIRCLE_API_TOKEN
      }
    });
  } catch (error: any) {
    res.status(500).json({
      error: error.message,
      stack: error.stack
    });
  }
}