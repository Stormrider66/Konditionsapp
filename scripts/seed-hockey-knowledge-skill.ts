/**
 * Seed the de-identified hockey off-season performance knowledge skill.
 *
 * Usage:
 *   set -a && source .env.local && set +a
 *   npx tsx --tsconfig tsconfig.scripts.json scripts/seed-hockey-knowledge-skill.ts
 *
 * The script creates/updates:
 * - one system CoachDocument
 * - embedded KnowledgeChunk rows in embedding_v2
 * - one selectable KnowledgeSkill entry
 */

import { PrismaClient, type Prisma } from '@prisma/client'
import { readFileSync } from 'fs'
import { join } from 'path'
import crypto from 'crypto'
import { config } from 'dotenv'

config({ path: '.env.local' })
config({ path: '.env' })

const prisma = new PrismaClient()

const DOC_FILE = 'hockey-performance-programming.md'
const DOC_PATH = join(process.cwd(), 'docs', 'knowledge-library', DOC_FILE)
const DOCUMENT_NAME = 'Ishockey Offseason Performance'
const DOCUMENT_NAME_EN = 'Ice Hockey Offseason Performance Programming'
const DOCUMENT_DESCRIPTION =
  'De-identifierad coachingguide för professionell ishockey-offseason: fasplanering, styrka, power, agility, RSA, hybridkonditionering, prehab och return-to-skate.'

const SKILL_KEYWORDS = [
  'ishockey',
  'hockey',
  'ice hockey',
  'offseason',
  'summer training',
  'sommarträning',
  'preseason',
  'hockey fys',
  'hockey conditioning',
  'hockey strength',
  'styrka hockey',
  'power hockey',
  'snabbstyrka',
  'maxstyrka',
  'kbox',
  'flywheel',
  'sled',
  'släde',
  'agility',
  'skridsko',
  'skating',
  'repeated sprint',
  'RSA',
  'hockey shifts',
  'hockeybyten',
  'A3',
  'prolog',
  '8x4',
  '10x3',
  '3-2-1',
  'hybrid',
  'groin',
  'ljumske',
  'adductor',
  'shoulder',
  'axel',
  'return to skate',
]

const EMBEDDING_DIMENSIONS = 768
const GOOGLE_MODEL = 'gemini-embedding-2-preview'
const OPENAI_MODEL = 'text-embedding-3-small'
const MAX_CHUNK_SIZE = 1400

type Provider = 'google' | 'openai'

type Chunk = {
  content: string
  index: number
  metadata: Record<string, unknown>
}

function decryptSecret(ciphertext: string): string {
  const prefix = 'enc:v1:'
  if (!ciphertext.startsWith(prefix)) return ciphertext

  const raw = process.env.API_KEY_ENCRYPTION_KEY
  if (!raw) throw new Error('API_KEY_ENCRYPTION_KEY is not set. Load all vars from .env.local.')
  const key = Buffer.from(raw, 'base64')
  if (key.length !== 32) throw new Error('API_KEY_ENCRYPTION_KEY must decode to 32 bytes')

  const parts = ciphertext.slice(prefix.length).split(':')
  if (parts.length !== 3) throw new Error('Invalid encrypted secret format')

  const [ivB64, tagB64, dataB64] = parts
  const iv = Buffer.from(ivB64, 'base64')
  const tag = Buffer.from(tagB64, 'base64')
  const data = Buffer.from(dataB64, 'base64')

  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv)
  decipher.setAuthTag(tag)
  return Buffer.concat([decipher.update(data), decipher.final()]).toString('utf8')
}

async function resolveSystemUserId(): Promise<string> {
  const existing = await prisma.user.findFirst({
    where: { email: 'system@trainomics.app' },
    select: { id: true },
  })
  if (existing) return existing.id

  const created = await prisma.user.create({
    data: {
      email: 'system@trainomics.app',
      name: 'System Knowledge Base',
      role: 'ADMIN',
    },
    select: { id: true },
  })
  return created.id
}

async function resolveProvider(): Promise<{ provider: Provider; key: string }> {
  const forcedProvider = process.env.EMBEDDING_PROVIDER as Provider | undefined
  const googleKey =
    process.env.GOOGLE_API_KEY ||
    process.env.GEMINI_API_KEY ||
    process.env.GOOGLE_GENERATIVE_AI_API_KEY
  if ((!forcedProvider || forcedProvider === 'google') && googleKey) return { provider: 'google', key: googleKey }
  if ((!forcedProvider || forcedProvider === 'openai') && process.env.OPENAI_API_KEY) {
    return { provider: 'openai', key: process.env.OPENAI_API_KEY }
  }

  const googleCandidate = await prisma.userApiKey.findFirst({
    where: {
      googleKeyValid: true,
      googleKeyEncrypted: { not: null },
      user: { role: 'ADMIN' },
    },
    select: { googleKeyEncrypted: true, userId: true },
  })
  if ((!forcedProvider || forcedProvider === 'google') && googleCandidate?.googleKeyEncrypted) {
    console.log(`Using Google embedding key from admin ${googleCandidate.userId.slice(0, 8)}...`)
    return { provider: 'google', key: decryptSecret(googleCandidate.googleKeyEncrypted) }
  }

  const openaiCandidate = await prisma.userApiKey.findFirst({
    where: {
      openaiKeyValid: true,
      openaiKeyEncrypted: { not: null },
      user: { role: 'ADMIN' },
    },
    select: { openaiKeyEncrypted: true, userId: true },
  })
  if ((!forcedProvider || forcedProvider === 'openai') && openaiCandidate?.openaiKeyEncrypted) {
    console.log(`Using OpenAI embedding key from admin ${openaiCandidate.userId.slice(0, 8)}...`)
    return { provider: 'openai', key: decryptSecret(openaiCandidate.openaiKeyEncrypted) }
  }

  throw new Error(
    'No embedding key found. Set GOOGLE_API_KEY/GEMINI_API_KEY/OPENAI_API_KEY or add a valid admin BYOK key.'
  )
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function isRetryableEmbeddingError(error: unknown): boolean {
  const maybeError = error as { status?: number; message?: string }
  const message = maybeError?.message ?? ''
  return (
    maybeError?.status === 429 ||
    maybeError?.status === 500 ||
    maybeError?.status === 502 ||
    maybeError?.status === 503 ||
    maybeError?.status === 504 ||
    /resource exhausted|rate limit|temporarily unavailable|timeout/i.test(message)
  )
}

function chunkText(text: string): Chunk[] {
  const cleanText = text.replace(/\r\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim()
  const paragraphs = cleanText.split(/\n\n+/)
  const chunks: Chunk[] = []
  let current = ''
  let section = DOCUMENT_NAME
  let index = 0

  const pushChunk = () => {
    const content = current.trim()
    if (!content) return
    chunks.push({
      content,
      index,
      metadata: {
        fileName: DOC_FILE,
        source: 'deidentified_hockey_program_corpus_2020_2026',
        section,
      },
    })
    index += 1
    current = ''
  }

  for (const paragraph of paragraphs) {
    const heading = paragraph.match(/^#{1,3}\s+(.+)/)
    if (heading) section = heading[1].trim()

    if (current.length + paragraph.length + 2 > MAX_CHUNK_SIZE) {
      pushChunk()
    }

    if (paragraph.length > MAX_CHUNK_SIZE) {
      const sentences = paragraph.match(/[^.!?]+[.!?]+/g) || [paragraph]
      for (const sentence of sentences) {
        if (current.length + sentence.length + 1 > MAX_CHUNK_SIZE) pushChunk()
        current += `${current ? ' ' : ''}${sentence.trim()}`
      }
    } else {
      current += `${current ? '\n\n' : ''}${paragraph}`
    }
  }

  pushChunk()
  return chunks
}

async function generateEmbedding(
  text: string,
  provider: Provider,
  key: string,
  taskType: 'RETRIEVAL_DOCUMENT' | 'RETRIEVAL_QUERY' | 'SEMANTIC_SIMILARITY'
): Promise<number[]> {
  const retryDelaysMs = [1_500, 4_000, 9_000, 20_000, 45_000]

  for (let attempt = 0; attempt <= retryDelaysMs.length; attempt += 1) {
    try {
      return await generateEmbeddingOnce(text, provider, key, taskType)
    } catch (error) {
      if (attempt === retryDelaysMs.length || !isRetryableEmbeddingError(error)) {
        throw error
      }
      const delayMs = retryDelaysMs[attempt]
      console.warn(
        `Embedding ${provider} call was rate-limited/temporary (${attempt + 1}/${retryDelaysMs.length}). Retrying in ${Math.round(delayMs / 1000)}s...`
      )
      await sleep(delayMs)
    }
  }

  throw new Error('Embedding retry loop exited unexpectedly')
}

async function generateEmbeddingOnce(
  text: string,
  provider: Provider,
  key: string,
  taskType: 'RETRIEVAL_DOCUMENT' | 'RETRIEVAL_QUERY' | 'SEMANTIC_SIMILARITY'
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
    if (!values?.length) throw new Error('Empty embedding from Google')
    return values
  }

  const OpenAI = (await import('openai')).default
  const openai = new OpenAI({ apiKey: key })
  const response = await openai.embeddings.create({
    model: OPENAI_MODEL,
    input: text,
    dimensions: EMBEDDING_DIMENSIONS,
  })
  return response.data[0].embedding
}

async function getVectorType(): Promise<'extensions.vector' | 'vector'> {
  try {
    await prisma.$queryRawUnsafe('SELECT NULL::extensions.vector')
    return 'extensions.vector'
  } catch {
    return 'vector'
  }
}

async function ensureVectorColumn(tableName: 'KnowledgeChunk' | 'KnowledgeSkill', vtype: string) {
  const check = await prisma.$queryRawUnsafe<{ exists: boolean }[]>(
    `SELECT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = $1 AND column_name = 'embedding_v2'
    ) as exists`,
    tableName
  )

  if (!check[0]?.exists) {
    await prisma.$executeRawUnsafe(
      `ALTER TABLE "${tableName}" ADD COLUMN IF NOT EXISTS "embedding_v2" ${vtype}(${EMBEDDING_DIMENSIONS})`
    )
  }
}

function toVectorLiteral(values: number[]): string {
  const cleaned = values.map((value, index) => {
    const numberValue = Number(value)
    if (!Number.isFinite(numberValue)) {
      throw new Error(`Invalid embedding value at index ${index}`)
    }
    return numberValue
  })
  return `[${cleaned.join(',')}]`
}

async function main() {
  console.log('Seeding hockey knowledge skill...')

  const content = readFileSync(DOC_PATH, 'utf8')
  const systemUserId = await resolveSystemUserId()
  const { provider, key } = await resolveProvider()
  const vtype = await getVectorType()
  await ensureVectorColumn('KnowledgeChunk', vtype)
  await ensureVectorColumn('KnowledgeSkill', vtype)

  const existingDocument = await prisma.coachDocument.findFirst({
    where: {
      coachId: systemUserId,
      name: DOCUMENT_NAME,
      isSystem: true,
    },
    select: { id: true },
  })

  const document = existingDocument
    ? await prisma.coachDocument.update({
        where: { id: existingDocument.id },
        data: {
          description: DOCUMENT_DESCRIPTION,
          fileType: 'MARKDOWN',
          fileUrl: `docs/knowledge-library/${DOC_FILE}`,
          fileSize: Buffer.byteLength(content, 'utf8'),
          mimeType: 'text/markdown',
          processingStatus: 'PROCESSING',
          processingError: null,
          metadata: {
            source: 'deidentified_hockey_program_corpus_2020_2026',
            weightedSeasons: '2024-2026',
            documentNameEn: DOCUMENT_NAME_EN,
          },
        },
      })
    : await prisma.coachDocument.create({
        data: {
          coachId: systemUserId,
          name: DOCUMENT_NAME,
          description: DOCUMENT_DESCRIPTION,
          fileType: 'MARKDOWN',
          fileUrl: `docs/knowledge-library/${DOC_FILE}`,
          fileSize: Buffer.byteLength(content, 'utf8'),
          mimeType: 'text/markdown',
          isSystem: true,
          processingStatus: 'PROCESSING',
          metadata: {
            source: 'deidentified_hockey_program_corpus_2020_2026',
            weightedSeasons: '2024-2026',
            documentNameEn: DOCUMENT_NAME_EN,
          },
        },
      })

  await prisma.knowledgeChunk.deleteMany({ where: { documentId: document.id } })

  const chunks = chunkText(content)
  console.log(`Embedding ${chunks.length} document chunks with ${provider}...`)

  for (const chunk of chunks) {
    const embedding = await generateEmbedding(chunk.content, provider, key, 'RETRIEVAL_DOCUMENT')
    const row = await prisma.knowledgeChunk.create({
      data: {
        documentId: document.id,
        coachId: systemUserId,
        content: chunk.content,
        chunkIndex: chunk.index,
        embeddingModel: provider === 'google' ? GOOGLE_MODEL : OPENAI_MODEL,
        tokenCount: Math.ceil(chunk.content.length / 4),
        metadata: chunk.metadata as Prisma.InputJsonValue,
      },
      select: { id: true },
    })

    await prisma.$executeRawUnsafe(
      `UPDATE "KnowledgeChunk" SET "embedding_v2" = $1::${vtype} WHERE id = $2`,
      toVectorLiteral(embedding),
      row.id
    )
  }

  await prisma.coachDocument.update({
    where: { id: document.id },
    data: { processingStatus: 'COMPLETED', processingError: null, chunkCount: chunks.length },
  })

  const skillText = `${DOCUMENT_NAME} ${DOCUMENT_NAME_EN} ${DOCUMENT_DESCRIPTION} ${SKILL_KEYWORDS.join(' ')}`
  const skillEmbedding = await generateEmbedding(skillText, provider, key, 'SEMANTIC_SIMILARITY')

  const existingSkill = await prisma.knowledgeSkill.findFirst({
    where: {
      OR: [{ name: DOCUMENT_NAME }, { nameEn: DOCUMENT_NAME_EN }],
    },
    select: { id: true },
  })

  const skill = existingSkill
    ? await prisma.knowledgeSkill.update({
        where: { id: existingSkill.id },
        data: {
          name: DOCUMENT_NAME,
          nameEn: DOCUMENT_NAME_EN,
          description: DOCUMENT_DESCRIPTION,
          category: 'SPORT_SPECIFIC',
          keywords: SKILL_KEYWORDS,
          priority: 10,
          isActive: true,
          documentIds: [document.id],
          maxChunks: 8,
        },
        select: { id: true },
      })
    : await prisma.knowledgeSkill.create({
        data: {
          name: DOCUMENT_NAME,
          nameEn: DOCUMENT_NAME_EN,
          description: DOCUMENT_DESCRIPTION,
          category: 'SPORT_SPECIFIC',
          keywords: SKILL_KEYWORDS,
          priority: 10,
          isActive: true,
          documentIds: [document.id],
          maxChunks: 8,
        },
        select: { id: true },
      })

  await prisma.$executeRawUnsafe(
    `UPDATE "KnowledgeSkill" SET "embedding_v2" = $1::${vtype} WHERE id = $2`,
    toVectorLiteral(skillEmbedding),
    skill.id
  )

  console.log('Hockey knowledge skill seeded.')
  console.log(`Document: ${document.id}`)
  console.log(`Skill: ${skill.id}`)
  console.log(`Chunks: ${chunks.length}`)
}

main()
  .catch(async (error) => {
    console.error('Failed to seed hockey knowledge skill:', error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
