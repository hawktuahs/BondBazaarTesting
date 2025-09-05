import { NextResponse } from 'next/server'

export async function POST() {
  const response = NextResponse.json(
    { message: 'Logged out successfully' },
    { status: 200 }
  )
  
  // Clear the auth cookie
  response.headers.set(
    'Set-Cookie', 
    'auth-token=; HttpOnly; Path=/; Max-Age=0; SameSite=Strict'
  )
  
  return response
}
