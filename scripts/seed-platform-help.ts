/**
 * Platform Help Seeding Script (incremental)
 *
 * Seeds docs/platform-help/ as system documents + PLATFORM-category
 * KnowledgeSkill entries so the floating AI chat can answer "how does the
 * app work?" questions for both athletes and coaches.
 *
 * Follows the embedding_v2 pattern from scripts/seed-hockey-knowledge-skill.ts
 * (768-dim vectors, Google preferred, OpenAI fallback). Incremental and
 * idempotent:
 *  - Documents are matched on fileUrl; existing ones are re-chunked in place.
 *  - Skills are matched on nameEn; existing ones are updated in place.
 *  - Nothing outside the platform-help corpus is touched.
 *
 * Usage: npx tsx scripts/seed-platform-help.ts
 */

import { PrismaClient, type Prisma } from '@prisma/client'
import { readFileSync, existsSync } from 'fs'
import { join } from 'path'
import crypto from 'crypto'
import { config } from 'dotenv'

config({ path: '.env.local' })
config({ path: '.env' })

const prisma = new PrismaClient()

const PLATFORM_HELP_DIR = join(process.cwd(), 'docs', 'platform-help')
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

// ============================================================================
// Skill definitions — PLATFORM category, athlete- and coach-facing
// ============================================================================

interface PlatformSkillDef {
  name: string
  nameEn: string
  keywords: string[]
  description: string
  docFiles: string[] // filenames within docs/platform-help/
  priority: number
  maxChunks: number
}

const PLATFORM_SKILL_DEFINITIONS: PlatformSkillDef[] = [
  {
    name: 'Plattformen för Atleter',
    nameEn: 'Platform Basics for Athletes',
    keywords: [
      'how does the app', 'hur fungerar appen', 'var hittar jag', 'where do i find',
      'getting started', 'komma igång', 'dashboard', 'navigation', 'navigering',
      'hur gör jag', 'how do i',
    ],
    description:
      'Hur atletdelen av plattformen fungerar: dashboard, navigering, var funktioner finns, vanliga frågor och svar för atleter. Använd för "hur gör jag", "var hittar jag" och allmänna app-frågor från atleter.',
    docFiles: ['getting-started-athlete.md', 'faq-athlete.md'],
    priority: 8,
    maxChunks: 4,
  },
  {
    name: 'Plattformen för Coacher',
    nameEn: 'Platform Basics for Coaches',
    keywords: [
      'coach dashboard', 'studios', 'studio', 'clients', 'klienter', 'athletes page',
      'add athlete', 'lägga till atlet', 'coach settings', 'coachinställningar',
    ],
    description:
      'Hur coachdelen av plattformen fungerar: dashboard, klienthantering, studior (Strength, Cardio, Hybrid, Agility, AI Studio), kalender, monitorering, inställningar samt vanliga coachfrågor. Använd för coachers "hur gör jag"-frågor.',
    docFiles: ['getting-started-coach.md', 'faq-coach.md'],
    priority: 8,
    maxChunks: 4,
  },
  {
    name: 'Beredskap & Check-ins (Plattform)',
    nameEn: 'Readiness & Check-ins (Platform)',
    keywords: [
      'readiness', 'beredskap', 'check-in', 'checkin', 'check in', 'morning briefing',
      'morgonbrief', 'readiness score', 'beredskapspoäng',
    ],
    description:
      'Hur dagliga check-ins och beredskapspoängen fungerar i plattformen: vilka fält som samlas in, hur poängen beräknas, beslut (PROCEED/REDUCE/EASY/REST), hur beredskap påverkar AI-genererade pass och morgonbriefer.',
    docFiles: ['readiness-and-checkins.md'],
    priority: 8,
    maxChunks: 3,
  },
  {
    name: 'Pass & Loggning (Plattform)',
    nameEn: 'Workouts & Logging (Platform)',
    keywords: [
      'log workout', 'logga pass', 'ad-hoc', 'ad hoc', 'wod', 'workout of the day',
      'dagens pass', 'browse workouts', 'träningsbibliotek', 'training library',
      'workout history', 'passhistorik',
    ],
    description:
      'Alla sätt atleter får och loggar pass i plattformen: programpass, coach-tilldelade sessioner, AI-pass (WOD), ad-hoc-loggning, träningsbibliotek, historik och RPE.',
    docFiles: ['workouts-and-logging.md'],
    priority: 7,
    maxChunks: 3,
  },
  {
    name: 'Träningsprogram (Plattform)',
    nameEn: 'Training Programs (Platform)',
    keywords: [
      'generate program', 'generera program', 'program builder', 'programbyggare',
      'assign program', 'tilldela program', 'create program', 'skapa program',
      'training program', 'träningsprogram',
    ],
    description:
      'Hur träningsprogram fungerar i plattformen: programbyggaren, AI-generering av flerveckorsprogram (metodiker, bakgrundsgenerering), självtränade atleters programgenerering via chatten, tilldelning och kalendervy.',
    docFiles: ['training-programs.md'],
    priority: 7,
    maxChunks: 3,
  },
  {
    name: 'Tester i Plattformen',
    nameEn: 'Testing in the Platform',
    keywords: [
      'create test', 'skapa test', 'enter test', 'lägga in test', 'test results',
      'testresultat', 'test protocol', 'testprotokoll', 'pdf export', 'test report',
      'testrapport', 'zones from test', 'zoner från test',
    ],
    description:
      'Hur fysiologiska tester används i plattformen: skapa tester, mata in steg och laktatvärden, automatisk tröskeldetektion, träningszoner från tester, kurvvarningar, ergometertester, var atleter ser resultat och PDF-export.',
    docFiles: ['testing-and-thresholds.md'],
    priority: 7,
    maxChunks: 3,
  },
  {
    name: 'Träningsbelastning & ACWR (Plattform)',
    nameEn: 'Training Load & ACWR (Platform)',
    keywords: [
      'acwr', 'training load', 'träningsbelastning', 'monitoring page', 'monitorering',
      'load monitoring', 'belastningszon', 'injury risk', 'skaderisk',
    ],
    description:
      'Hur träningsbelastning och ACWR fungerar i plattformen: hur loggade pass bidrar till belastning, nattlig ACWR-beräkning, zoner (OPTIMAL/CAUTION/DANGER/CRITICAL), monitoreringsvyn och hur AI:n använder ACWR som skyddsräcken.',
    docFiles: ['training-load-and-acwr.md'],
    priority: 7,
    maxChunks: 3,
  },
  {
    name: 'Nutrition i Plattformen',
    nameEn: 'Nutrition Features (Platform)',
    keywords: [
      'meal log', 'måltidslogg', 'logga måltid', 'food scanner', 'matskanner',
      'fueling', 'macro targets', 'makromål', 'calorie target', 'kalorimål',
      'nutrition plan', 'kostplan',
    ],
    description:
      'Nutritionsfunktioner i plattformen: måltidsloggning (manuellt, via AI-chatt, med matskannern), dagliga tränings-medvetna makromål, fueling-sidan, följsamhetsstatistik och skannerns personaliseringsminne.',
    docFiles: ['nutrition-features.md'],
    priority: 7,
    maxChunks: 3,
  },
  {
    name: 'Integrationer (Strava/Garmin/Concept2)',
    nameEn: 'Integrations (Strava/Garmin/Concept2)',
    keywords: [
      'strava', 'garmin', 'concept2', 'oura', 'sync', 'synka', 'connect', 'koppla',
      'integration', 'wearable', 'klocka', 'watch',
    ],
    description:
      'Hur integrationer fungerar: koppla Strava, Garmin, Concept2 och Oura, vilken data som synkas (aktiviteter, sömn, HRV, ergometerresultat), hur synkade aktiviteter dyker upp och felsökning vid avbruten koppling.',
    docFiles: ['integrations.md'],
    priority: 8,
    maxChunks: 3,
  },
  {
    name: 'AI-funktioner & Krediter',
    nameEn: 'AI Features & Credits',
    keywords: [
      'ai chat', 'ai-chatt', 'ai credits', 'ai-krediter', 'krediter', 'credits',
      'allowance', 'api key', 'api-nyckel', 'byok', 'voice', 'röst', 'video analysis',
      'videoanalys', 'consent', 'samtycke', 'confirmation', 'bekräfta', 'top-up',
    ],
    description:
      'Allt om AI i plattformen: vad AI-chatten kan göra för atleter respektive coacher, bekräftelsekort för åtgärder, GDPR-samtycke, konversationsminne, kunskapsskills, röstfunktioner, videoanalys, AI-krediter per prenumerationsnivå, påfyllningspaket och coachernas egna API-nycklar (BYOK).',
    docFiles: ['ai-features-guide.md'],
    priority: 9,
    maxChunks: 4,
  },
  {
    name: 'Prenumerationer & Nivåer',
    nameEn: 'Subscriptions & Tiers',
    keywords: [
      'subscription', 'prenumeration', 'tier', 'nivå', 'upgrade', 'uppgradera',
      'pricing', 'pris', 'trial', 'provperiod', 'standard', 'elite', 'enterprise',
    ],
    description:
      'Prenumerationsnivåer i plattformen: atletnivåer (FREE/STANDARD/PRO/ELITE) och coachnivåer (FREE/BASIC/PRO/ENTERPRISE), vad varje nivå låser upp, atletgränser, provperioder och var prenumerationen hanteras.',
    docFiles: ['subscriptions-and-tiers.md'],
    priority: 7,
    maxChunks: 3,
  },
  {
    name: 'Skador & Rehab (Plattform)',
    nameEn: 'Injury & Rehab (Platform)',
    keywords: [
      'report injury', 'rapportera skada', 'injury report', 'skaderapport',
      'pain report', 'restriction', 'restriktion', 'physio', 'fysio', 'rehab plan',
    ],
    description:
      'Hur skaderapportering och rehab fungerar i plattformen: rapportera via formulär eller AI-chatt, vad som händer efter en rapport, träningsrestriktioner, hur skador påverkar AI-genererade pass, fysioroll och coachvarningar.',
    docFiles: ['injury-and-rehab.md'],
    priority: 7,
    maxChunks: 3,
  },
  {
    name: 'Meddelanden, Lag & Kalender',
    nameEn: 'Messaging, Teams & Calendar',
    keywords: [
      'message', 'meddelande', 'meddelanden', 'team calendar', 'lagkalender',
      'team', 'lag', 'calendar event', 'kalenderhändelse', 'vacation', 'semester',
      'match schedule', 'matchschema',
    ],
    description:
      'Meddelanden mellan coach och atlet, laghantering med lagkalender och planering av lagpass, kalenderhändelser som påverkar träning (semester, resa, sjukdom, läger) och matchscheman för lagsporter.',
    docFiles: ['messaging-teams-calendar.md'],
    priority: 6,
    maxChunks: 3,
  },
  {
    name: 'Ordlista (Plattform)',
    nameEn: 'Platform Glossary',
    keywords: [
      'what does', 'vad betyder', 'what is', 'vad är', 'betyder', 'glossary',
      'ordlista', 'term', 'definition',
    ],
    description:
      'Ordlista över termer som används i plattformen: testning och fysiologi, träningsbelastning och monitorering, program och pass, nutrition, AI-funktioner samt konto och plattform.',
    docFiles: ['glossary.md'],
    priority: 6,
    maxChunks: 3,
  },
]

// ============================================================================
// Helpers — mirrors scripts/seed-hockey-knowledge-skill.ts
// ============================================================================

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
  const decipher = crypto.createDecipheriv(
    'aes-256-gcm',
    key,
    Buffer.from(ivB64, 'base64')
  )
  decipher.setAuthTag(Buffer.from(tagB64, 'base64'))
  return Buffer.concat([
    decipher.update(Buffer.from(dataB64, 'base64')),
    decipher.final(),
  ]).toString('utf8')
}

async function resolveSystemUserId(): Promise<string> {
  const existing = await prisma.user.findFirst({
    where: { email: 'system@trainomics.app' },
    select: { id: true },
  })
  if (existing) return existing.id

  const created = await prisma.user.create({
    data: { email: 'system@trainomics.app', name: 'System Knowledge Base', role: 'ADMIN' },
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
  if ((!forcedProvider || forcedProvider === 'google') && googleKey) {
    return { provider: 'google', key: googleKey }
  }
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

function chunkText(text: string, fileName: string, docName: string): Chunk[] {
  const cleanText = text.replace(/\r\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim()
  const paragraphs = cleanText.split(/\n\n+/)
  const chunks: Chunk[] = []
  let current = ''
  let section = docName
  let index = 0

  const pushChunk = () => {
    const content = current.trim()
    if (!content) return
    chunks.push({
      content,
      index,
      metadata: { fileName, source: 'platform_help', section },
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

// ============================================================================
// Incremental upserts
// ============================================================================

async function upsertDocument(
  filename: string,
  provider: Provider,
  key: string,
  vtype: string,
  systemUserId: string
): Promise<{ id: string; title: string; chunks: number } | null> {
  const filepath = join(PLATFORM_HELP_DIR, filename)
  if (!existsSync(filepath)) {
    console.warn(`  ⚠ File not found: platform-help/${filename}`)
    return null
  }

  const content = readFileSync(filepath, 'utf8')
  const titleMatch = content.match(/^#\s+(.+)/m)
  const title = titleMatch ? titleMatch[1] : filename.replace('.md', '')
  const fileUrl = `docs/platform-help/${filename}`

  const existing = await prisma.coachDocument.findFirst({
    where: { fileUrl, isSystem: true },
    select: { id: true },
  })

  const document = existing
    ? await prisma.coachDocument.update({
        where: { id: existing.id },
        data: {
          name: title,
          fileSize: Buffer.byteLength(content, 'utf8'),
          description: `Platform help: ${title}`,
          mimeType: 'text/markdown',
          processingStatus: 'PROCESSING',
          processingError: null,
        },
        select: { id: true },
      })
    : await prisma.coachDocument.create({
        data: {
          coachId: systemUserId,
          name: title,
          fileType: 'MARKDOWN',
          fileUrl,
          fileSize: Buffer.byteLength(content, 'utf8'),
          description: `Platform help: ${title}`,
          mimeType: 'text/markdown',
          isSystem: true,
          processingStatus: 'PROCESSING',
        },
        select: { id: true },
      })

  await prisma.knowledgeChunk.deleteMany({ where: { documentId: document.id } })

  const chunks = chunkText(content, filename, title)
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

  return { id: document.id, title, chunks: chunks.length }
}

async function upsertSkill(
  def: PlatformSkillDef,
  docFileToId: Map<string, string>,
  provider: Provider,
  key: string,
  vtype: string
): Promise<boolean> {
  const documentIds = def.docFiles
    .map((file) => docFileToId.get(file))
    .filter((id): id is string => Boolean(id))

  if (documentIds.length === 0) {
    console.warn(`  ⚠ No documents resolved for skill "${def.nameEn}" — skipping.`)
    return false
  }

  const data = {
    name: def.name,
    nameEn: def.nameEn,
    description: def.description,
    category: 'PLATFORM' as const,
    keywords: def.keywords,
    priority: def.priority,
    documentIds,
    maxChunks: def.maxChunks,
    isActive: true,
  }

  const existing = await prisma.knowledgeSkill.findFirst({
    where: { OR: [{ nameEn: def.nameEn }, { name: def.name }] },
    select: { id: true },
  })

  const skill = existing
    ? await prisma.knowledgeSkill.update({ where: { id: existing.id }, data, select: { id: true } })
    : await prisma.knowledgeSkill.create({ data, select: { id: true } })

  // Same text format as the runtime backfill (ensureSkillEmbeddings).
  const skillText = `${def.name} ${def.nameEn} ${def.description} ${def.keywords.join(' ')}`
  const embedding = await generateEmbedding(skillText, provider, key, 'SEMANTIC_SIMILARITY')
  await prisma.$executeRawUnsafe(
    `UPDATE "KnowledgeSkill" SET "embedding_v2" = $1::${vtype} WHERE id = $2`,
    toVectorLiteral(embedding),
    skill.id
  )

  return true
}

// ============================================================================
// Main
// ============================================================================

async function seedPlatformHelp() {
  console.log('Seeding platform-help corpus (incremental)...')

  const systemUserId = await resolveSystemUserId()
  const { provider, key } = await resolveProvider()
  const vtype = await getVectorType()
  await ensureVectorColumn('KnowledgeChunk', vtype)
  await ensureVectorColumn('KnowledgeSkill', vtype)

  const referencedFiles = new Set<string>()
  for (const def of PLATFORM_SKILL_DEFINITIONS) {
    for (const file of def.docFiles) referencedFiles.add(file)
  }

  const docFileToId = new Map<string, string>()
  let totalChunks = 0

  for (const filename of referencedFiles) {
    console.log(`Processing: platform-help/${filename}`)
    const result = await upsertDocument(filename, provider, key, vtype, systemUserId)
    if (result) {
      docFileToId.set(filename, result.id)
      totalChunks += result.chunks
      console.log(`  ✓ ${result.title} (${result.chunks} chunks)`)
    }
  }

  console.log('\nUpserting PLATFORM knowledge skills...')
  let skillsUpserted = 0
  for (const def of PLATFORM_SKILL_DEFINITIONS) {
    if (await upsertSkill(def, docFileToId, provider, key, vtype)) {
      skillsUpserted++
      console.log(`  ✓ ${def.nameEn}`)
    }
  }

  console.log('\n' + '='.repeat(50))
  console.log('Platform help seeding complete!')
  console.log(`Documents processed: ${docFileToId.size}`)
  console.log(`Total chunks created: ${totalChunks}`)
  console.log(`Skills upserted: ${skillsUpserted}`)
  console.log('='.repeat(50) + '\n')
}

seedPlatformHelp()
  .catch((error) => {
    console.error('Fatal error:', error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
