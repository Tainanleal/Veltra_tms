import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import prisma from '../config/prisma';

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  throw new Error('JWT_SECRET não está configurado. Defina a variável de ambiente JWT_SECRET.');
}

export interface TokenPayload {
  userId: string;
  tenantId: string;
  email: string;
  role: string;
}

export const generateToken = (payload: TokenPayload): string => {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
};

export const verifyToken = (token: string): TokenPayload => {
  return jwt.verify(token, JWT_SECRET) as TokenPayload;
};

export const hashPassword = async (password: string): Promise<string> => {
  return bcrypt.hash(password, 10);
};

export const comparePassword = async (password: string, hash: string): Promise<boolean> => {
  return bcrypt.compare(password, hash);
};

export const authenticateUser = async (email: string, password: string) => {
  const user = await prisma.user.findUnique({
    where: { email },
    include: { tenant: true }
  });

  if (!user) {
    throw new Error('Usuário não encontrado');
  }

  const isValid = await comparePassword(password, user.passwordHash);

  if (!isValid) {
    throw new Error('Senha incorreta');
  }

  const token = generateToken({
    userId: user.id,
    tenantId: user.tenantId,
    email: user.email,
    role: user.role
  });

  return {
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      tenantId: user.tenantId,
      tenantName: user.tenant.name
    }
  };
};

export const registerUser = async (
  tenantId: string,
  name: string,
  email: string,
  password: string,
  role: 'ADMIN' | 'MANAGER' | 'AUDITOR' = 'AUDITOR'
) => {
  const existingUser = await prisma.user.findUnique({
    where: { tenantId_email: { tenantId, email } }
  });

  if (existingUser) {
    throw new Error('Email já cadastrado');
  }

  const passwordHash = await hashPassword(password);

  const user = await prisma.user.create({
    data: {
      tenantId,
      name,
      email,
      passwordHash,
      role
    }
  });

  return user;
};
