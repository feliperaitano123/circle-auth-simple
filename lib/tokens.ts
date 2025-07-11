import jwt, { SignOptions } from 'jsonwebtoken';
import { config } from './config';

export interface TokenPayload {
  memberId: number;
  email: string;
  name: string;
  communityUrl: string;
}

export function generateToken(payload: TokenPayload): string {
  return jwt.sign(
    {
      ...payload,
      iat: Math.floor(Date.now() / 1000),
      iss: config.app.name
    },
    config.jwt.secret,
    {
      expiresIn: config.jwt.expiresIn,
      audience: 'mcp-client',
      issuer: config.app.name
    } as SignOptions
  );
}

export function verifyToken(token: string): TokenPayload | null {
  try {
    const decoded = jwt.verify(token, config.jwt.secret, {
      audience: 'mcp-client',
      issuer: config.app.name
    }) as any;

    return {
      memberId: decoded.memberId,
      email: decoded.email,
      name: decoded.name,
      communityUrl: decoded.communityUrl
    };
  } catch (error) {
    return null;
  }
}