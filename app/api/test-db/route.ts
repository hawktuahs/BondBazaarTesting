import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET() {
  try {
    console.log('🔍 Testing database connection...')
    
    // Test database connection
    const userCount = await prisma.user.count()
    console.log('✅ Database connected, user count:', userCount)
    
    // Test bond query
    const bondCount = await prisma.bond.count()
    console.log('✅ Bond table accessible, count:', bondCount)
    
    return NextResponse.json({
      success: true,
      userCount,
      bondCount,
      message: 'Database connection working'
    })
    
  } catch (error: any) {
    console.error('❌ Database test failed:', error)
    return NextResponse.json({
      success: false,
      error: error.message,
      stack: error.stack
    }, { status: 500 })
  }
}
