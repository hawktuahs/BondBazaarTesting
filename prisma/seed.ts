import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding database...')

  // Create demo users
  const alicePassword = await bcrypt.hash('Passw0rd!', 10)
  const bobPassword = await bcrypt.hash('Passw0rd!', 10)

  const alice = await prisma.user.upsert({
    where: { email: 'alice@demo.in' },
    update: {},
    create: {
      email: 'alice@demo.in',
      passwordHash: alicePassword,
      displayName: 'Alice Trader',
      kycVerified: true,
    },
  })

  const bob = await prisma.user.upsert({
    where: { email: 'bob@demo.in' },
    update: {},
    create: {
      email: 'bob@demo.in',
      passwordHash: bobPassword,
      displayName: 'Bob Investor',
      kycVerified: true,
    },
  })

  // Create demo bonds
  const abc28 = await prisma.bond.upsert({
    where: { symbol: 'ABC28' },
    update: {},
    create: {
      symbol: 'ABC28',
      name: 'ABC Corp 2028',
      pseudoISIN: 'INE123A01028',
      couponPct: 9.00,
      rating: 'AA',
      faceValue: 1000,
      issueDate: new Date('2024-01-15'),
      maturityDate: new Date('2028-12-31'),
      outstandingUnits: 10000,
      description: 'ABC Corporation 9% Senior Secured Bonds 2028',
    },
  })

  const mno30 = await prisma.bond.upsert({
    where: { symbol: 'MNO30' },
    update: {},
    create: {
      symbol: 'MNO30',
      name: 'MNO Ltd 2030',
      pseudoISIN: 'INE456B01030',
      couponPct: 8.20,
      rating: 'A',
      faceValue: 1000,
      issueDate: new Date('2024-02-01'),
      maturityDate: new Date('2030-06-30'),
      outstandingUnits: 20000,
      description: 'MNO Limited 8.2% Unsecured Bonds 2030',
    },
  })

  // Create initial balances (SIM_MODE)
  await prisma.balance.upsert({
    where: { userId_bondId: { userId: alice.id, bondId: abc28.id } },
    update: {},
    create: {
      userId: alice.id,
      bondId: abc28.id,
      tokenQty: 200, // Alice owns 200 ABC28 tokens
    },
  })

  await prisma.balance.upsert({
    where: { userId_bondId: { userId: bob.id, bondId: mno30.id } },
    update: {},
    create: {
      userId: bob.id,
      bondId: mno30.id,
      tokenQty: 150, // Bob owns 150 MNO30 tokens
    },
  })

  // Create some initial orders to populate the book
  await prisma.order.create({
    data: {
      userId: alice.id,
      bondId: abc28.id,
      side: 'SELL',
      price: 1025,
      qty: 50,
      status: 'OPEN',
    },
  })

  await prisma.order.create({
    data: {
      userId: bob.id,
      bondId: abc28.id,
      side: 'BUY',
      price: 1015,
      qty: 30,
      status: 'OPEN',
    },
  })

  await prisma.order.create({
    data: {
      userId: bob.id,
      bondId: mno30.id,
      side: 'SELL',
      price: 980,
      qty: 25,
      status: 'OPEN',
    },
  })

  // Create audit log entry
  await prisma.auditLog.create({
    data: {
      type: 'SEED',
      details: JSON.stringify({
        message: 'Database seeded with demo users, bonds, and initial orders',
        timestamp: new Date().toISOString(),
      }),
    },
  })

  console.log('✅ Database seeded successfully!')
  console.log(`👤 Users: ${alice.email}, ${bob.email}`)
  console.log(`📊 Bonds: ${abc28.symbol}, ${mno30.symbol}`)
  console.log(`💰 Initial balances and orders created`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
