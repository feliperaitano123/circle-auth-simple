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

    if (!response.data?.access_token) {
      return null;
    }

    // Se chegou aqui, o membro foi autenticado com sucesso
    return {
      id: response.data.community_member_id,
      email: normalizedEmail,
      name: 'Membro', // Nome genérico já que não precisamos buscar detalhes
      status: 'active'
    };
  } catch (error: any) {
    console.error('Circle API error:', error.message);
    return null;
  }
}