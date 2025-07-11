import { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from 'redis';

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const results: any = {
    tests: []
  };

  try {
    // Test 1: Basic connection
    const client1 = createClient({ url: process.env.REDIS_URL });
    await client1.connect();
    results.tests.push({ test: 'connection', success: true });
    
    // Test 2: Set and get in same connection
    await client1.set('test:key1', 'value1', { EX: 60 });
    const value1 = await client1.get('test:key1');
    results.tests.push({ 
      test: 'set-get-same-connection', 
      success: value1 === 'value1',
      value: value1 
    });
    
    await client1.disconnect();
    
    // Test 3: Get with new connection
    const client2 = createClient({ url: process.env.REDIS_URL });
    await client2.connect();
    const value2 = await client2.get('test:key1');
    results.tests.push({ 
      test: 'get-new-connection', 
      success: value2 === 'value1',
      value: value2 
    });
    
    // Test 4: Set with one connection, get with another
    await client2.set('test:key2', 'value2', { EX: 60 });
    await client2.disconnect();
    
    const client3 = createClient({ url: process.env.REDIS_URL });
    await client3.connect();
    const value3 = await client3.get('test:key2');
    results.tests.push({ 
      test: 'set-disconnect-get', 
      success: value3 === 'value2',
      value: value3 
    });
    
    // Test 5: Check verification keys
    const keys = await client3.keys('verification:*');
    results.verificationKeys = keys;
    
    await client3.disconnect();
    
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