import axios from 'axios';
import { config } from './config';

interface CircleMember {
  id: number;
  email: string;
  name: string;
  status: string;
}

export async function verifyCircleMember(email: string): Promise<CircleMember | null> {
  try {
    // Clean the token to remove any invalid characters
    const cleanToken = config.circle.apiToken.trim().replace(/[\r\n\t]/g, '');
    const normalizedEmail = email.toLowerCase().trim();
    
    console.log('Verifying member:', normalizedEmail);
    console.log('API URL:', `${config.circle.apiUrl}/api/v1/headless/auth_token`);
    console.log('Community URL:', config.circle.communityUrl);
    
    const response = await axios.post(
      `${config.circle.apiUrl}/api/v1/headless/auth_token`,
      { email: normalizedEmail },
      {
        headers: {
          'Authorization': `Bearer ${cleanToken}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    console.log('Auth response status:', response.status);
    console.log('Auth response data:', JSON.stringify(response.data, null, 2));

    if (!response.data?.access_token) {
      return null;
    }

    const memberResponse = await axios.get(
      `${config.circle.apiUrl}/api/headless/v1/me`,
      {
        headers: {
          'Authorization': `Bearer ${response.data.access_token}`
        }
      }
    );

    const member = memberResponse.data;
    
    if (member && member.status === 'active') {
      return {
        id: member.id,
        email: member.email,
        name: member.name || member.first_name || 'Membro',
        status: member.status
      };
    }

    return null;
  } catch (error: any) {
    console.error('Circle API error:', error.message);
    console.error('Token length:', config.circle.apiToken?.length);
    console.error('Token preview:', config.circle.apiToken?.substring(0, 10) + '...');
    
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
    
    return null;
  }
}