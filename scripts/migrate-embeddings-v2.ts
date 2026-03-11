/**
 * Migration Script: Re-embed existing data to embedding_v2 (768 dims)
 *
 * Migrates KnowledgeChunk and KnowledgeSkill rows from the legacy
 * `embedding` column (1536-dim, ada-002) to the new `embedding_v2` column
 * (768-dim, Gemini Embedding / text-embedding-3-small).
 *
 * Usage:
 *   # Load ALL env vars from .env.local (needs DATABASE_URL + API_KEY_ENCRYPTION_KEY)
 *   set -a && source .env.local && set +a
 *   npx tsx scripts/migrate-embeddings-v2.ts
 *
 * Options:
 *   --dry-run     Show what would be migrated without making changes
 *   --batch-size  Number of rows to process at a time (default: 50)
 *   --table       Only migrate a specific table: 'chunks' or 'skills'
 *
 * The script auto-resolves a Google API key from the database (admin user keys).
 * Override with: GOOGLE_API_KEY=... or OPENAI_API_KEY=...
 */

import { PrismaClient } from '@prisma/client'
import crypto from 'crypto'

const prisma = new PrismaClient()

// ─── Configuration ──────────────────────────────────────────────────────────

const EMBEDDING_DIMENSIONS = 768
const GOOGLE_MODEL = 'gemini-embedding-2-preview'
const OPENAI_MODEL = 'text-embedding-3-small'

const args = process.argv.slice(2)
const DRY_RUN = args.includes('--dry-run')
const BATCH_SIZE = (() => {
  const idx = args.indexOf('--batch-size')
  return idx >= 0 ? parseInt(args[idx + 1], 10) || 50 : 50
})()
const TABLE_FILTER = (() => {
  const idx = args.indexOf('--table')
  return idx >= 0 ? args[idx + 1] : null
})()

// ─── Provider Setup ─────────────────────────────────────────────────────────

type Provider = 'google' | 'openai'

/** Decrypt an AES-256-GCM encrypted secret from the database (handles plaintext fallback) */
function decryptSecret(ciphertext: string): string {
  const PREFIX = 'enc:v1:'
  if (!ciphertext.startsWith(PREFIX)) return ciphertext // plaintext (older rows)

  const raw = process.env.API_KEY_ENCRYPTION_KEY
  if (!raw) throw new Error('API_KEY_ENCRYPTION_KEY is not set — load all vars from .env.local')
  const key = Buffer.from(raw, 'base64')
  if (key.length !== 32) throw new Error('API_KEY_ENCRYPTION_KEY must decode to 32 bytes')

  const parts = ciphertext.slice(PREFIX.length).split(':')
  if (parts.length !== 3) throw new Error('Invalid encrypted secret format')
  const [ivB64, tagB64, dataB64] = parts
  const iv = Buffer.from(ivB64, 'base64')
  const tag = Buffer.from(tagB64, 'base64')
  const data = Buffer.from(dataB64, 'base64')

  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv)
  decipher.setAuthTag(tag)
  return Buffer.concat([decipher.update(data), decipher.final()]).toString('utf8')
}

async function resolveProvider(): Promise<{ provider: Provider; key: string }> {
  // 1) Check env var overrides
  const googleKey = process.env.GOOGLE_API_KEY
  const openaiKey = process.env.OPENAI_API_KEY
  if (googleKey) return { provider: 'google', key: googleKey }
  if (openaiKey) return { provider: 'openai', key: openaiKey }

  // 2) Pull from database — find an admin user with a valid Google key
  console.log('  No env API key found, looking up Google key from database...')
  const candidate = await prisma.userApiKey.findFirst({
    where: {
      googleKeyValid: true,
      googleKeyEncrypted: { not: null },
      user: { role: 'ADMIN' },
    },
    select: { googleKeyEncrypted: true, userId: true },
  })

  if (candidate?.googleKeyEncrypted) {
    const decrypted = decryptSecret(candidate.googleKeyEncrypted)
    console.log(`  Found Google key from admin user ${candidate.userId.slice(0, 8)}...`)
    return { provider: 'google', key: decrypted }
  }

  // 3) Try OpenAI key from DB
  const openaiCandidate = await prisma.userApiKey.findFirst({
    where: {
      openaiKeyValid: true,
      openaiKeyEncrypted: { not: null },
      user: { role: 'ADMIN' },
    },
    select: { openaiKeyEncrypted: true, userId: true },
  })

  if (openaiCandidate?.openaiKeyEncrypted) {
    const decrypted = decryptSecret(openaiCandidate.openaiKeyEncrypted)
    console.log(`  Found OpenAI key from admin user ${openaiCandidate.userId.slice(0, 8)}...`)
    return { provider: 'openai', key: decrypted }
  }

  throw new Error(
    'No API key found. Set GOOGLE_API_KEY env var, or ensure an admin user has a valid Google key in the database.'
  )
}

async function generateEmbedding(
  text: string,
  provider: Provider,
  key: string,
  taskType: string,
): Promise<number[]> {
  if (provider === 'google') {
    const { GoogleGenAI } = await import('@google/genai')
    const client = new GoogleGenAI({ apiKey: key })
    const response = await client.models.embedContent({
      model: GOOGLE_MODEL,
      contents: text,
      config: {
        outputDimensionality: EMBEDDING_DIMENSIONS,
        taskType,
      },
    })
    const values = response.embeddings?.[0]?.values
    if (!values || values.length === 0) throw new Error('Empty embedding from Gemini')
    return values
  }

  // OpenAI
  const OpenAI = (await import('openai')).default
  const openai = new OpenAI({ apiKey: key })
  const response = await openai.embeddings.create({
    model: OPENAI_MODEL,
    input: text,
    dimensions: EMBEDDING_DIMENSIONS,
  })
  return response.data[0].embedding
}

// ─── Vector Type Detection ──────────────────────────────────────────────────

async function getVectorType(): Promise<string> {
  try {
    await prisma.$queryRawUnsafe(`SELECT NULL::extensions.vector`)
    return 'extensions.vector'
  } catch {
    return 'vector'
  }
}

async function ensureColumn(tableName: string, vtype: string): Promise<void> {
  const check = await prisma.$queryRawUnsafe<{ exists: boolean }[]>(
    `SELECT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = $1 AND column_name = 'embedding_v2'
    ) as exists`,
    tableName,
  )

  if (!check[0]?.exists) {
    console.log(`  Creating embedding_v2 column on ${tableName}...`)
    await prisma.$executeRawUnsafe(
      `ALTER TABLE "${tableName}" ADD COLUMN IF NOT EXISTS "embedding_v2" ${vtype}(${EMBEDDING_DIMENSIONS})`
    )
  }
}

// ─── Migration Logic ────────────────────────────────────────────────────────

async function migrateChunks(provider: Provider, key: string, vtype: string): Promise<number> {
  await ensureColumn('KnowledgeChunk', vtype)

  // Find chunks that have content but no embedding_v2
  const total = await prisma.knowledgeChunk.count({
    where: { content: { not: '' } },
  })

  const migrated = await prisma.$queryRawUnsafe<{ cnt: bigint }[]>(
    `SELECT COUNT(*) as cnt FROM "KnowledgeChunk" WHERE "embedding_v2" IS NOT NULL`
  )
  const alreadyDone = Number(migrated[0]?.cnt ?? 0)
  const remaining = total - alreadyDone

  console.log(`\n📄 KnowledgeChunk: ${total} total, ${alreadyDone} already migrated, ${remaining} remaining`)

  if (remaining === 0) {
    console.log('  Nothing to migrate.')
    return 0
  }

  if (DRY_RUN) {
    console.log(`  [DRY RUN] Would re-embed ${remaining} chunks in batches of ${BATCH_SIZE}`)
    return remaining
  }

  let processed = 0

  while (processed < remaining) {
    const chunks = await prisma.$queryRawUnsafe<{ id: string; content: string }[]>(
      `SELECT id, content FROM "KnowledgeChunk"
       WHERE "embedding_v2" IS NULL AND content != ''
       ORDER BY "createdAt" ASC
       LIMIT $1`,
      BATCH_SIZE,
    )

    if (chunks.length === 0) break

    for (const chunk of chunks) {
      try {
        const embedding = await generateEmbedding(
          chunk.content,
          provider,
          key,
          'RETRIEVAL_DOCUMENT',
        )
        const embeddingArray = `[${embedding.join(',')}]`
        await prisma.$executeRawUnsafe(
          `UPDATE "KnowledgeChunk" SET "embedding_v2" = $1::${vtype}, "embeddingModel" = $2 WHERE id = $3`,
          embeddingArray,
          provider === 'google' ? GOOGLE_MODEL : OPENAI_MODEL,
          chunk.id,
        )
        processed++
      } catch (error) {
        console.error(`  ❌ Failed to embed chunk ${chunk.id}:`, error instanceof Error ? error.message : error)
      }
    }

    console.log(`  ✓ ${processed}/${remaining} chunks`)
  }

  return processed
}

async function migrateSkills(provider: Provider, key: string, vtype: string): Promise<number> {
  await ensureColumn('KnowledgeSkill', vtype)

  const skills = await prisma.knowledgeSkill.findMany({
    where: { isActive: true },
    select: { id: true, name: true, nameEn: true, description: true, keywords: true },
  })

  const migrated = await prisma.$queryRawUnsafe<{ cnt: bigint }[]>(
    `SELECT COUNT(*) as cnt FROM "KnowledgeSkill" WHERE "embedding_v2" IS NOT NULL`
  )
  const alreadyDone = Number(migrated[0]?.cnt ?? 0)
  const remaining = skills.length - alreadyDone

  console.log(`\n🎯 KnowledgeSkill: ${skills.length} total, ${alreadyDone} already migrated, ${remaining} remaining`)

  if (remaining === 0) {
    console.log('  Nothing to migrate.')
    return 0
  }

  if (DRY_RUN) {
    console.log(`  [DRY RUN] Would re-embed ${remaining} skills`)
    return remaining
  }

  let processed = 0

  // Find skills missing embedding_v2
  const missing = await prisma.$queryRawUnsafe<{ id: string }[]>(
    `SELECT id FROM "KnowledgeSkill" WHERE "embedding_v2" IS NULL AND "isActive" = true`
  )
  const missingIds = new Set(missing.map(r => r.id))

  for (const skill of skills) {
    if (!missingIds.has(skill.id)) continue

    try {
      const text = `${skill.name} ${skill.nameEn || ''} ${skill.description} ${(skill.keywords as string[]).join(' ')}`
      const embedding = await generateEmbedding(text, provider, key, 'SEMANTIC_SIMILARITY')
      const embeddingArray = `[${embedding.join(',')}]`
      await prisma.$executeRawUnsafe(
        `UPDATE "KnowledgeSkill" SET "embedding_v2" = $1::${vtype} WHERE id = $2`,
        embeddingArray,
        skill.id,
      )
      processed++
    } catch (error) {
      console.error(`  ❌ Failed to embed skill ${skill.id}:`, error instanceof Error ? error.message : error)
    }
  }

  console.log(`  ✓ ${processed}/${remaining} skills`)
  return processed
}

// ─── Main ───────────────────────────────────────────────────────────────────

async function main() {
  console.log('═══════════════════════════════════════════════════')
  console.log('  Embedding Migration: ada-002 (1536) → v2 (768)')
  console.log('═══════════════════════════════════════════════════')
  if (DRY_RUN) console.log('  ⚠️  DRY RUN — no changes will be made')

  const { provider, key } = await resolveProvider()
  console.log(`  Provider: ${provider} (${provider === 'google' ? GOOGLE_MODEL : OPENAI_MODEL})`)
  console.log(`  Dimensions: ${EMBEDDING_DIMENSIONS}`)
  console.log(`  Batch size: ${BATCH_SIZE}`)

  const vtype = await getVectorType()
  console.log(`  Vector type: ${vtype}`)

  let totalMigrated = 0

  if (!TABLE_FILTER || TABLE_FILTER === 'chunks') {
    totalMigrated += await migrateChunks(provider, key, vtype)
  }

  if (!TABLE_FILTER || TABLE_FILTER === 'skills') {
    totalMigrated += await migrateSkills(provider, key, vtype)
  }

  console.log(`\n✅ Migration complete. ${DRY_RUN ? 'Would migrate' : 'Migrated'}: ${totalMigrated} rows`)
  console.log('\nNext steps:')
  console.log('  1. Verify search works with new embeddings')
  console.log('  2. Once verified, drop legacy columns:')
  console.log('     ALTER TABLE "KnowledgeChunk" DROP COLUMN IF EXISTS "embedding";')
  console.log('     ALTER TABLE "KnowledgeSkill" DROP COLUMN IF EXISTS "embedding";')
  console.log('  3. Rename embedding_v2 → embedding (optional):')
  console.log('     ALTER TABLE "KnowledgeChunk" RENAME COLUMN "embedding_v2" TO "embedding";')
  console.log('     ALTER TABLE "KnowledgeSkill" RENAME COLUMN "embedding_v2" TO "embedding";')

  await prisma.$disconnect()
}

main().catch((error) => {
  console.error('Migration failed:', error)
  prisma.$disconnect()
  process.exit(1)
})
