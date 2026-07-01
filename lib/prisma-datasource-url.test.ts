import { describe, expect, it } from 'vitest'
import { buildPrismaDatasourceUrl } from './prisma-datasource-url'

describe('buildPrismaDatasourceUrl', () => {
  it('caps Prisma connections for Vercel serverless runtimes', () => {
    const url = buildPrismaDatasourceUrl({
      DATABASE_URL: 'postgresql://postgres.ref:secret@aws-1-eu-north-1.pooler.supabase.com:6543/postgres',
      VERCEL: '1',
    })

    const parsed = new URL(url!)
    expect(parsed.searchParams.get('pgbouncer')).toBe('true')
    expect(parsed.searchParams.get('connection_limit')).toBe('5')
    expect(parsed.searchParams.get('pool_timeout')).toBe('30')
    expect(parsed.searchParams.get('application_name')).toBe('trainomics-app')
  })

  it('preserves explicit Prisma connection settings', () => {
    const url = buildPrismaDatasourceUrl({
      DATABASE_URL:
        'postgresql://postgres.ref:secret@aws-1-eu-north-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=3&pool_timeout=45&application_name=custom',
      VERCEL: '1',
    })

    const parsed = new URL(url!)
    expect(parsed.searchParams.get('pgbouncer')).toBe('true')
    expect(parsed.searchParams.get('connection_limit')).toBe('3')
    expect(parsed.searchParams.get('pool_timeout')).toBe('45')
    expect(parsed.searchParams.get('application_name')).toBe('custom')
  })

  it('returns undefined when DATABASE_URL is missing', () => {
    expect(buildPrismaDatasourceUrl({})).toBeUndefined()
  })
})
