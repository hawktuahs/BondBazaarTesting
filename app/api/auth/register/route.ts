import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { hashPassword, createAuthResponse } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const { email, password, displayName } = await request.json()

    if (!email || !password || !displayName) {
      return NextResponse.json(
        { error: 'Email, password, and display name are required' },
        { status: 400 }
      )
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    })

    if (existingUser) {
      return NextResponse.json(
        { error: 'User already exists' },
        { status: 409 }
      )
    }

    // Create new user
    const passwordHash = await hashPassword(password)
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        displayName,
        kycVerified: false,
      },
      select: {
        id: true,
        email: true,
        displayName: true,
        kycVerified: true,
      }
    })

    // Create auth response with cookie
    const authResponse = createAuthResponse(user)
    
    const response = NextResponse.json(
      { user: authResponse.user },
      { status: 201 }
    )
    
    response.headers.set('Set-Cookie', authResponse.headers['Set-Cookie'])
    
    return response
  } catch (error) {
    console.error('Registration error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
