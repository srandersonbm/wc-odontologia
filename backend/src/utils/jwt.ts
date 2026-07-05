import jwt from 'jsonwebtoken';

const SECRET = process.env.JWT_SECRET || 'wc-odontologia-dev-secret-change-me';

export type Role = 'DENTIST' | 'PATIENT';

export interface TokenPayload {
  id: number;
  role: Role;
  name: string;
}

export function signToken(payload: TokenPayload): string {
  return jwt.sign(payload, SECRET, { expiresIn: '7d' });
}

export function verifyToken(token: string): TokenPayload {
  return jwt.verify(token, SECRET) as TokenPayload;
}
