import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'
import { NextRequest } from 'next/server'
import { prisma } from './db'

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret'

export interface AuthUser {
  id: string
  email: string
  displayName: string
  kycVerified: boolean
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10)
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash)
}

export function generateToken(user: AuthUser): string {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      kycVerified: user.kycVerified,
    },
    JWT_SECRET,
    { expiresIn: '24h' }
  )
}

export function verifyToken(token: string): AuthUser | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as AuthUser
    return decoded
  } catch {
    return null
  }
}

export async function getCurrentUser(request: NextRequest): Promise<AuthUser | null> {
  const token = request.cookies.get('auth-token')?.value
  if (!token) return null

  const user = verifyToken(token)
  if (!user) return null

  // Verify user still exists in database
  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { id: true, email: true, displayName: true, kycVerified: true }
  })

  return dbUser
}

export function createAuthResponse(user: AuthUser) {
  const token = generateToken(user)
  return {
    user,
    token,
    headers: {
      'Set-Cookie': `auth-token=${token}; HttpOnly; Path=/; Max-Age=86400; SameSite=Lax${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`
    }
  }
}
