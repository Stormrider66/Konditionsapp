type PrismaDatasourceEnv = Partial<Record<
  | 'DATABASE_URL'
  | 'NODE_ENV'
  | 'PRISMA_APPLICATION_NAME'
  | 'PRISMA_CONNECTION_LIMIT'
  | 'PRISMA_POOL_TIMEOUT'
  | 'VERCEL',
  string | undefined
>>

const SUPABASE_POOLER_HOST_SUFFIX = '.pooler.supabase.com'
// With Fluid Compute one instance serves many concurrent requests, and the
// unified-calendar payload alone fans out ~14 queries — a single pooled
// connection queues everything and starves unrelated requests sharing the
// instance (P2024 after pool_timeout). The Supabase transaction pooler
// multiplexes client connections, so a small per-instance pool is safe.
// Tune without a deploy via PRISMA_CONNECTION_LIMIT.
const DEFAULT_VERCEL_CONNECTION_LIMIT = '5'
const DEFAULT_VERCEL_POOL_TIMEOUT = '30'
const DEFAULT_APPLICATION_NAME = 'trainomics-app'

function isVercelRuntime(env: PrismaDatasourceEnv): boolean {
  return env.VERCEL === '1' || env.VERCEL === 'true'
}

function isSupabaseTransactionPooler(url: URL): boolean {
  return (
    url.hostname.endsWith(SUPABASE_POOLER_HOST_SUFFIX) &&
    url.port === '6543'
  )
}

export function buildPrismaDatasourceUrl(env: PrismaDatasourceEnv = process.env): string | undefined {
  const databaseUrl = env.DATABASE_URL
  if (!databaseUrl) return undefined

  let url: URL
  try {
    url = new URL(databaseUrl)
  } catch {
    return databaseUrl
  }

  let changed = false
  const setDefaultParam = (key: string, value?: string) => {
    if (!value || url.searchParams.has(key)) return
    url.searchParams.set(key, value)
    changed = true
  }

  if (isSupabaseTransactionPooler(url)) {
    setDefaultParam('pgbouncer', 'true')
  }

  const vercelRuntime = isVercelRuntime(env)
  setDefaultParam(
    'connection_limit',
    env.PRISMA_CONNECTION_LIMIT ?? (vercelRuntime ? DEFAULT_VERCEL_CONNECTION_LIMIT : undefined)
  )
  setDefaultParam(
    'pool_timeout',
    env.PRISMA_POOL_TIMEOUT ?? (vercelRuntime ? DEFAULT_VERCEL_POOL_TIMEOUT : undefined)
  )
  setDefaultParam('application_name', env.PRISMA_APPLICATION_NAME ?? DEFAULT_APPLICATION_NAME)

  return changed ? url.toString() : databaseUrl
}
