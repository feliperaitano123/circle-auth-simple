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
    const response = await axios.post(
      `${config.circle.apiUrl}/api/v1/headless/auth_token`,
      { email: email.toLowerCase().trim() },
      {
        headers: {
          'Authorization': `Bearer ${config.circle.apiToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

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
  } catch (error) {
    console.error('Circle API error:', error);
    return null;
  }
}