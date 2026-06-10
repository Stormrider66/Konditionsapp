/**
 * Platform Help Seeding Script (incremental)
 *
 * Seeds docs/platform-help/ as system documents + PLATFORM-category
 * KnowledgeSkill entries so the floating AI chat can answer "how does the
 * app work?" questions for both athletes and coaches.
 *
 * Unlike scripts/seed-knowledge-base.ts (full wipe-and-reseed), this script
 * is INCREMENTAL and idempotent:
 *  - Documents are matched on fileUrl; existing ones are re-chunked in place.
 *  - Skills are matched on nameEn; existing ones are updated in place.
 *  - Nothing outside the platform-help corpus is touched.
 *
 * Usage: npx tsx scripts/seed-platform-help.ts
 *
 * API key resolution order matches seed-knowledge-base.ts:
 * 1. OPENAI_API_KEY environment variable
 * 2. First coach with a valid OpenAI key in the database (BYOK)
 */

import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import crypto from 'crypto';
import OpenAI from 'openai';
import { config } from 'dotenv';

config({ path: '.env.local' });
config({ path: '.env' });

const prisma = new PrismaClient();

const PLATFORM_HELP_DIR = path.join(process.cwd(), 'docs', 'platform-help');
const EMBEDDING_MODEL = 'text-embedding-ada-002';
const MAX_CHUNK_SIZE = 1000;

// ============================================================================
// Inline decryption (avoids server-only imports) — same as seed-knowledge-base
// ============================================================================
const ENC_PREFIX = 'enc:v1:';

function decryptSecret(ciphertext: string): string {
  if (!ciphertext.startsWith(ENC_PREFIX)) return ciphertext;
  const raw = process.env.API_KEY_ENCRYPTION_KEY;
  if (!raw) throw new Error('API_KEY_ENCRYPTION_KEY is not configured');
  const key = Buffer.from(raw, 'base64');
  if (key.length !== 32) throw new Error('API_KEY_ENCRYPTION_KEY must decode to 32 bytes');
  const parts = ciphertext.slice(ENC_PREFIX.length).split(':');
  if (parts.length !== 3) throw new Error('Invalid encrypted secret format');
  const [ivB64, tagB64, dataB64] = parts;
  const decipher = crypto.createDecipheriv(
    'aes-256-gcm',
    key,
    Buffer.from(ivB64, 'base64')
  );
  decipher.setAuthTag(Buffer.from(tagB64, 'base64'));
  return Buffer.concat([
    decipher.update(Buffer.from(dataB64, 'base64')),
    decipher.final(),
  ]).toString('utf8');
}

async function resolveOpenAIKey(): Promise<{ apiKey: string; systemUserId: string }> {
  let systemUser = await prisma.user.findFirst({
    where: { email: 'system@trainomics.app' },
    select: { id: true },
  });
  if (!systemUser) {
    systemUser = await prisma.user.create({
      data: { email: 'system@trainomics.app', name: 'System Knowledge Base', role: 'ADMIN' },
      select: { id: true },
    });
    console.log(`  Created system user: ${systemUser.id}`);
  }
  const systemUserId = systemUser.id;

  if (process.env.OPENAI_API_KEY) {
    console.log('  Using OPENAI_API_KEY from environment.\n');
    return { apiKey: process.env.OPENAI_API_KEY, systemUserId };
  }

  const apiKeyRow = await prisma.userApiKey.findFirst({
    where: { openaiKeyValid: true, openaiKeyEncrypted: { not: null } },
    select: { userId: true, openaiKeyEncrypted: true },
  });
  if (!apiKeyRow?.openaiKeyEncrypted) {
    throw new Error(
      'No OpenAI API key found. Set OPENAI_API_KEY or ensure a coach has a valid OpenAI key in BYOK settings.'
    );
  }
  const decrypted = decryptSecret(apiKeyRow.openaiKeyEncrypted);
  console.log(`  Found valid OpenAI key from user ${apiKeyRow.userId.slice(0, 8)}...\n`);
  return { apiKey: decrypted, systemUserId };
}

// ============================================================================
// Skill definitions — PLATFORM category, athlete- and coach-facing
// ============================================================================

interface PlatformSkillDef {
  name: string;
  nameEn: string;
  keywords: string[];
  description: string;
  docFiles: string[]; // filenames within docs/platform-help/
  priority: number;
  maxChunks: number;
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
      'Hur träningsprogram fungerar i plattformen: programbyggaren, AI-generering av fleråriga/flerveckorsprogram (metodiker, bakgrundsgenerering), självtränade atleters programgenerering via chatten, tilldelning och kalendervy.',
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
      'strava', 'garmin', 'concept2', 'sync', 'synka', 'connect', 'koppla',
      'integration', 'wearable', 'klocka', 'watch',
    ],
    description:
      'Hur integrationer fungerar: koppla Strava, Garmin och Concept2, vilken data som synkas (aktiviteter, sömn, HRV, ergometerresultat), hur synkade aktiviteter dyker upp och felsökning vid avbruten koppling.',
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
];

// ============================================================================
// Chunking + embeddings — same logic as seed-knowledge-base.ts
// ============================================================================

interface ChunkResult {
  content: string;
  index: number;
  metadata: Record<string, unknown>;
}

function chunkText(text: string, filename: string): ChunkResult[] {
  const chunks: ChunkResult[] = [];
  const cleanText = text.replace(/\r\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
  const paragraphs = cleanText.split(/\n\n+/);

  let currentChunk = '';
  let chunkIndex = 0;

  for (const paragraph of paragraphs) {
    if (currentChunk.length + paragraph.length > MAX_CHUNK_SIZE) {
      if (currentChunk.trim()) {
        chunks.push({
          content: currentChunk.trim(),
          index: chunkIndex++,
          metadata: { filename, chunkType: 'paragraph' },
        });
      }

      if (paragraph.length > MAX_CHUNK_SIZE) {
        const sentences = paragraph.match(/[^.!?]+[.!?]+/g) || [paragraph];
        let sentenceChunk = '';
        for (const sentence of sentences) {
          if (sentenceChunk.length + sentence.length > MAX_CHUNK_SIZE) {
            if (sentenceChunk.trim()) {
              chunks.push({
                content: sentenceChunk.trim(),
                index: chunkIndex++,
                metadata: { filename, chunkType: 'sentence' },
              });
            }
            sentenceChunk = sentence;
          } else {
            sentenceChunk += sentence;
          }
        }
        currentChunk = sentenceChunk;
      } else {
        currentChunk = paragraph;
      }
    } else {
      currentChunk += (currentChunk ? '\n\n' : '') + paragraph;
    }
  }

  if (currentChunk.trim()) {
    chunks.push({
      content: currentChunk.trim(),
      index: chunkIndex,
      metadata: { filename, chunkType: 'paragraph' },
    });
  }

  return chunks;
}

async function generateEmbeddings(texts: string[], openai: OpenAI): Promise<number[][]> {
  const batchSize = 100;
  const results: number[][] = [];
  for (let i = 0; i < texts.length; i += batchSize) {
    const batch = texts.slice(i, i + batchSize);
    const response = await openai.embeddings.create({ model: EMBEDDING_MODEL, input: batch });
    for (const item of response.data) results.push(item.embedding);
    if (i + batchSize < texts.length) {
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }
  return results;
}

// ============================================================================
// Incremental upserts
// ============================================================================

async function upsertDocument(
  filename: string,
  openai: OpenAI,
  systemUserId: string
): Promise<{ id: string; title: string; chunks: number } | null> {
  const filepath = path.join(PLATFORM_HELP_DIR, filename);
  if (!fs.existsSync(filepath)) {
    console.warn(`  ⚠ File not found: platform-help/${filename}`);
    return null;
  }

  const content = fs.readFileSync(filepath, 'utf-8');
  const titleMatch = content.match(/^#\s+(.+)/m);
  const title = titleMatch ? titleMatch[1] : filename.replace('.md', '');
  const fileUrl = `docs/platform-help/${filename}`;

  let document = await prisma.coachDocument.findFirst({
    where: { fileUrl, isSystem: true },
    select: { id: true },
  });

  if (document) {
    await prisma.knowledgeChunk.deleteMany({ where: { documentId: document.id } });
    await prisma.coachDocument.update({
      where: { id: document.id },
      data: {
        name: title,
        fileSize: Buffer.byteLength(content, 'utf-8'),
        description: `Platform help: ${title}`,
        processingStatus: 'PROCESSING',
      },
    });
  } else {
    document = await prisma.coachDocument.create({
      data: {
        coachId: systemUserId,
        name: title,
        fileType: 'MARKDOWN',
        fileUrl,
        fileSize: Buffer.byteLength(content, 'utf-8'),
        description: `Platform help: ${title}`,
        isSystem: true,
        processingStatus: 'PROCESSING',
      },
      select: { id: true },
    });
  }

  const chunks = chunkText(content, filename);
  const embeddings = chunks.length > 0
    ? await generateEmbeddings(chunks.map((c) => c.content), openai)
    : [];

  for (let i = 0; i < chunks.length; i++) {
    const knowledgeChunk = await prisma.knowledgeChunk.create({
      data: {
        documentId: document.id,
        coachId: systemUserId,
        content: chunks[i].content,
        chunkIndex: chunks[i].index,
        embeddingModel: EMBEDDING_MODEL,
        tokenCount: Math.ceil(chunks[i].content.length / 4),
        metadata: chunks[i].metadata as object,
      },
    });
    await prisma.$executeRawUnsafe(
      `UPDATE "KnowledgeChunk" SET embedding = $1::vector WHERE id = $2`,
      `[${embeddings[i].join(',')}]`,
      knowledgeChunk.id
    );
  }

  await prisma.coachDocument.update({
    where: { id: document.id },
    data: { processingStatus: 'COMPLETED', chunkCount: chunks.length },
  });

  return { id: document.id, title, chunks: chunks.length };
}

async function upsertSkill(
  def: PlatformSkillDef,
  docFileToId: Map<string, string>,
  openai: OpenAI
): Promise<boolean> {
  const documentIds = def.docFiles
    .map((file) => docFileToId.get(file))
    .filter((id): id is string => Boolean(id));

  if (documentIds.length === 0) {
    console.warn(`  ⚠ No documents resolved for skill "${def.nameEn}" — skipping.`);
    return false;
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
  };

  const existing = await prisma.knowledgeSkill.findFirst({
    where: { nameEn: def.nameEn },
    select: { id: true },
  });

  const skill = existing
    ? await prisma.knowledgeSkill.update({ where: { id: existing.id }, data })
    : await prisma.knowledgeSkill.create({ data });

  // Description embedding for semantic matching (legacy 1536-dim column; the
  // runtime embedding_v2 column is backfilled lazily by ensureSkillEmbeddings).
  const [embedding] = await generateEmbeddings([def.description], openai);
  await prisma.$executeRawUnsafe(
    `UPDATE "KnowledgeSkill" SET embedding = $1::vector WHERE id = $2`,
    `[${embedding.join(',')}]`,
    skill.id
  );
  // Clear any stale embedding_v2 so the runtime backfill re-embeds the
  // updated description instead of keeping the old vector.
  await prisma.$executeRawUnsafe(
    `UPDATE "KnowledgeSkill" SET embedding_v2 = NULL WHERE id = $1`,
    skill.id
  ).catch(() => undefined);

  return true;
}

// ============================================================================
// Main
// ============================================================================

async function seedPlatformHelp() {
  console.log('Resolving OpenAI API key...');
  const { apiKey, systemUserId } = await resolveOpenAIKey();
  const openai = new OpenAI({ apiKey });

  console.log('Seeding platform-help corpus (incremental)...\n');

  const referencedFiles = new Set<string>();
  for (const def of PLATFORM_SKILL_DEFINITIONS) {
    for (const file of def.docFiles) referencedFiles.add(file);
  }

  const docFileToId = new Map<string, string>();
  let totalChunks = 0;

  for (const filename of referencedFiles) {
    console.log(`Processing: platform-help/${filename}`);
    const result = await upsertDocument(filename, openai, systemUserId);
    if (result) {
      docFileToId.set(filename, result.id);
      totalChunks += result.chunks;
      console.log(`  ✓ ${result.title} (${result.chunks} chunks)`);
    }
  }

  console.log('\nUpserting PLATFORM knowledge skills...');
  let skillsUpserted = 0;
  for (const def of PLATFORM_SKILL_DEFINITIONS) {
    if (await upsertSkill(def, docFileToId, openai)) {
      skillsUpserted++;
      console.log(`  ✓ ${def.nameEn}`);
    }
  }

  console.log('\n' + '='.repeat(50));
  console.log('Platform help seeding complete!');
  console.log(`Documents processed: ${docFileToId.size}`);
  console.log(`Total chunks created: ${totalChunks}`);
  console.log(`Skills upserted: ${skillsUpserted}`);
  console.log('='.repeat(50) + '\n');
}

seedPlatformHelp()
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
