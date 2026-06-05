import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db

// Extended DB with models that may not be in the Prisma schema yet
// Use `edb` for models like oTP, corporate, corporateRecipient, exchangeRate, etc.
export const edb = db as PrismaClient & {
  oTP: any
  corporate: any
  corporateRecipient: any
  exchangeRate: any
  aIRecommendation: any
  trainingShare: any
}
