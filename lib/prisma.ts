// lib/prisma.ts
import { PrismaClient, type Prisma } from '@prisma/client'
import { logger } from '@/lib/logger'
import { buildPrismaDatasourceUrl } from '@/lib/prisma-datasource-url'

const SLOW_QUERY_MS = Number(process.env.PRISMA_SLOW_QUERY_MS ?? 500)

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

function createPrismaClient() {
  const datasourceUrl = buildPrismaDatasourceUrl()
  const client = new PrismaClient({
    ...(datasourceUrl ? { datasources: { db: { url: datasourceUrl } } } : {}),
    log: [
      { emit: 'event', level: 'query' },
      { emit: 'event', level: 'warn' },
      { emit: 'event', level: 'error' },
    ],
  })

  client.$on('query', (e: Prisma.QueryEvent) => {
    if (e.duration >= SLOW_QUERY_MS) {
      logger.warn('Prisma slow query', {
        durationMs: e.duration,
        query: e.query,
        params: e.params,
      })
    }
  })

  client.$on('warn', (e: Prisma.LogEvent) => {
    logger.warn('Prisma warning', { target: e.target, message: e.message })
  })

  client.$on('error', (e: Prisma.LogEvent) => {
    logger.error('Prisma error', { target: e.target, message: e.message })
  })

  return client
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
