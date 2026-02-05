/**
 * Knowledge Base Seeding Script
 *
 * Seeds the knowledge base with system documents from:
 * - docs/knowledge-library/ (curated AI knowledge docs)
 * - docs/training-engine/ (existing training-engine docs)
 *
 * Also creates KnowledgeSkill entries for auto-retrieval matching.
 *
 * Usage: npx tsx scripts/seed-knowledge-base.ts
 *
 * API key resolution order:
 * 1. OPENAI_API_KEY environment variable (if set)
 * 2. First coach with a valid OpenAI key in the database (BYOK, auto-decrypted)
 */

import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import crypto from 'crypto';
import OpenAI from 'openai';
import { config } from 'dotenv';

// Load environment variables
config({ path: '.env.local' });
config({ path: '.env' });

const prisma = new PrismaClient();

// ============================================================================
// Inline decryption (avoids server-only imports)
// ============================================================================
const ENC_PREFIX = 'enc:v1:';

function decryptSecret(ciphertext: string): string {
  if (!ciphertext.startsWith(ENC_PREFIX)) {
    return ciphertext; // Backwards compatibility: plaintext
  }
  const raw = process.env.API_KEY_ENCRYPTION_KEY;
  if (!raw) {
    throw new Error('API_KEY_ENCRYPTION_KEY is not configured');
  }
  const key = Buffer.from(raw, 'base64');
  if (key.length !== 32) {
    throw new Error('API_KEY_ENCRYPTION_KEY must decode to 32 bytes');
  }
  const parts = ciphertext.slice(ENC_PREFIX.length).split(':');
  if (parts.length !== 3) throw new Error('Invalid encrypted secret format');

  const [ivB64, tagB64, dataB64] = parts;
  const iv = Buffer.from(ivB64, 'base64');
  const tag = Buffer.from(tagB64, 'base64');
  const data = Buffer.from(dataB64, 'base64');

  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);
  const plaintext = Buffer.concat([decipher.update(data), decipher.final()]);
  return plaintext.toString('utf8');
}

async function resolveOpenAIKey(): Promise<{ apiKey: string; systemUserId: string }> {
  // Find or create a system user to own the documents
  let systemUser = await prisma.user.findFirst({
    where: { email: 'system@konditionstest.se' },
    select: { id: true },
  });

  if (!systemUser) {
    systemUser = await prisma.user.create({
      data: {
        email: 'system@konditionstest.se',
        name: 'System Knowledge Base',
        role: 'ADMIN',
      },
      select: { id: true },
    });
    console.log(`  Created system user: ${systemUser.id}`);
  } else {
    console.log(`  Found existing system user: ${systemUser.id}`);
  }

  const systemUserId = systemUser.id;

  // 1. Try environment variable
  if (process.env.OPENAI_API_KEY) {
    console.log('  Using OPENAI_API_KEY from environment.\n');
    return { apiKey: process.env.OPENAI_API_KEY, systemUserId };
  }

  // 2. Try fetching from any coach's BYOK keys
  console.log('  No OPENAI_API_KEY env var found. Looking for a coach BYOK key...');
  const apiKeyRow = await prisma.userApiKey.findFirst({
    where: {
      openaiKeyValid: true,
      openaiKeyEncrypted: { not: null },
    },
    select: {
      userId: true,
      openaiKeyEncrypted: true,
    },
  });

  if (!apiKeyRow?.openaiKeyEncrypted) {
    throw new Error(
      'No OpenAI API key found. Either set OPENAI_API_KEY env var or ensure a coach has a valid OpenAI key in BYOK settings.'
    );
  }

  const decrypted = decryptSecret(apiKeyRow.openaiKeyEncrypted);
  console.log(`  Found valid OpenAI key from user ${apiKeyRow.userId.slice(0, 8)}...\n`);
  return { apiKey: decrypted, systemUserId };
}

// Configuration
const KNOWLEDGE_LIBRARY_DIR = path.join(process.cwd(), 'docs', 'knowledge-library');
const TRAINING_ENGINE_DIR = path.join(process.cwd(), 'docs', 'training-engine');
const EMBEDDING_MODEL = 'text-embedding-ada-002';
const MAX_CHUNK_SIZE = 1000;

interface ChunkResult {
  content: string;
  index: number;
  metadata: Record<string, unknown>;
}

// ============================================================================
// Knowledge Skill Definitions
// ============================================================================

interface SkillDef {
  name: string;
  nameEn: string;
  category: string;
  keywords: string[];
  description: string;
  docFiles: { dir: 'knowledge-library' | 'training-engine'; file: string }[];
  priority: number;
  maxChunks: number;
}

const SKILL_DEFINITIONS: SkillDef[] = [
  {
    name: 'Polariserad Träning',
    nameEn: 'Polarized Training',
    category: 'METHODOLOGY',
    keywords: ['polarized', 'polariserad', '80/20', 'lågintensiv', 'zon 1', 'zone 1', 'seiler'],
    description: 'Polariserad träningsmetodik med 80% lågintensiv och 20% högintensiv träning. Stephen Seilers forskning om optimal zondistribution för uthållighetsidrottare. Basperiod, build och peak-periodisering.',
    docFiles: [
      { dir: 'knowledge-library', file: 'polarized-training.md' },
      { dir: 'training-engine', file: 'Polarized_Training_Architecture.md' },
    ],
    priority: 10,
    maxChunks: 3,
  },
  {
    name: 'Norsk Dubbeltröskelmetod',
    nameEn: 'Norwegian Double Threshold',
    category: 'METHODOLOGY',
    keywords: ['norwegian', 'norsk', 'dubbeltröskel', 'double threshold', 'tröskelblock', 'threshold block', 'gjøvaag'],
    description: 'Norsk dubbeltröskelmetod med 2 tröskelpass per dag i blockperiodisering. Utvecklad av norska skidlandslaget. Fokus på laktattröskelintensitet för att förbättra laktatclearance och mitokondriell densitet.',
    docFiles: [
      { dir: 'knowledge-library', file: 'norwegian-threshold.md' },
      { dir: 'training-engine', file: 'Norwegian_Double_Threshold_Training_Protocol.md' },
    ],
    priority: 10,
    maxChunks: 3,
  },
  {
    name: 'Canova Maratonmetodik',
    nameEn: 'Canova Marathon Method',
    category: 'METHODOLOGY',
    keywords: ['canova', 'maraton', 'marathon', 'maratontempo', 'marathon pace', 'special block', 'progressive long run'],
    description: 'Renato Canovas maratonspecifika träningsmetodik. Baserad på procent av maratontempo. Inkluderar Special Block med dubbla pass, progressive long runs och specifik nedtrappning inför tävling.',
    docFiles: [
      { dir: 'knowledge-library', file: 'canova-method.md' },
      { dir: 'training-engine', file: 'Canova_Algorithmic_Architecture.md' },
    ],
    priority: 9,
    maxChunks: 3,
  },
  {
    name: 'Pyramidal Träning',
    nameEn: 'Pyramidal Training',
    category: 'METHODOLOGY',
    keywords: ['pyramidal', 'pyramid', 'zon 2', 'zone 2', 'tempo', 'sweet spot'],
    description: 'Pyramidal träningsmodell med gradvis minskande volym genom zonerna. Mer zon 2-arbete än polariserad modell. Lämplig för medelgoda atleter och maratonlöpare.',
    docFiles: [
      { dir: 'knowledge-library', file: 'pyramidal-training.md' },
      { dir: 'training-engine', file: 'Pyramidal_Training_Architecture.md' },
    ],
    priority: 8,
    maxChunks: 3,
  },
  {
    name: 'Laktattröskeltest',
    nameEn: 'Lactate Threshold Testing',
    category: 'TESTING',
    keywords: ['laktat', 'lactate', 'tröskel', 'threshold', 'd-max', 'dmax', 'obla', '4 mmol', 'stegtest', 'laktatkurva'],
    description: 'Laktattröskeltestning med D-max, modifierad D-max och OBLA-metoder. Testprotokoll, tolkning av laktatkurva, zonberäkning. Anaerob tröskel definieras som ANDRA korsningen av 4 mmol/L.',
    docFiles: [
      { dir: 'knowledge-library', file: 'lactate-threshold-testing.md' },
      { dir: 'training-engine', file: 'Advanced_Lactate_Threshold_Analysis_Elite_Athletes.md' },
      { dir: 'training-engine', file: 'D-max_Lactate_Threshold_Algorithms.md' },
    ],
    priority: 10,
    maxChunks: 4,
  },
  {
    name: 'VO2max & Fysiologi',
    nameEn: 'VO2max & Physiology',
    category: 'PHYSIOLOGY',
    keywords: ['vo2max', 'vo2', 'syreupptagning', 'oxygen uptake', 'fysiologi', 'physiology', 'vdot', 'löpekonomi', 'running economy'],
    description: 'VO2max fysiologi, testning och tränbarhet. Centrala och perifera begränsningar. VDOT-konceptet, löpekonomi, fraktionell utnyttjning. Ålderseffekter och genetik.',
    docFiles: [
      { dir: 'knowledge-library', file: 'vo2max-physiology.md' },
      { dir: 'training-engine', file: 'Computational_Physiology_for_Endurance_Performance.md' },
      { dir: 'training-engine', file: 'Physiological_Frameworks_Algorithmic_Endurance_Training.md' },
    ],
    priority: 9,
    maxChunks: 3,
  },
  {
    name: 'Styrketräning för Uthållighet',
    nameEn: 'Strength Training for Endurance',
    category: 'STRENGTH',
    keywords: ['styrka', 'strength', '1rm', 'maxstyrka', 'styrketräning', 'knäböj', 'squat', 'marklyft', 'deadlift', '2-for-2'],
    description: 'Styrketräning för uthållighetsatleter. 5-fasperiodisering, 1RM-estimering (Epley/Brzycki), 2-for-2 progressionsregel. Övningsval och belastningszoner anpassade för löpning, cykling och skidåkning.',
    docFiles: [
      { dir: 'knowledge-library', file: 'strength-for-endurance.md' },
      { dir: 'training-engine', file: 'Strength_Training_for_Runners_Scientific_Framework.md' },
    ],
    priority: 9,
    maxChunks: 3,
  },
  {
    name: 'Skadeförebyggande & ACWR',
    nameEn: 'Injury Prevention & ACWR',
    category: 'INJURY_PREVENTION',
    keywords: ['skada', 'injury', 'acwr', 'workload', 'belastning', 'delaware', 'rehab', 'rehabilitering', 'return to sport', 'överbelastning'],
    description: 'Skadeförebyggande med ACWR (Acute:Chronic Workload Ratio). Zoner: OPTIMAL (0.8-1.3), CAUTION, DANGER, CRITICAL. Delaware pain rules, return-to-sport kriterier, load management.',
    docFiles: [
      { dir: 'knowledge-library', file: 'injury-prevention-acwr.md' },
    ],
    priority: 10,
    maxChunks: 3,
  },
  {
    name: 'HYROX Träning',
    nameEn: 'HYROX Training',
    category: 'SPORT_SPECIFIC',
    keywords: ['hyrox', 'hybrid', 'skierg', 'sled push', 'sled pull', 'wall balls', 'farmer carry', 'burpee broad jump', 'sandbag'],
    description: 'HYROX-specifik träning. 8 stationer + löpning. Hybridträning med balans kondition och styrka. Periodisering, race pacing, stationsstrategier och transitions-träning.',
    docFiles: [
      { dir: 'knowledge-library', file: 'hyrox-training.md' },
      { dir: 'training-engine', file: 'HYROX_Performance_Engineering_Technical_Analysis.md' },
    ],
    priority: 10,
    maxChunks: 3,
  },
  {
    name: 'Näring för Uthållighet',
    nameEn: 'Nutrition for Endurance',
    category: 'NUTRITION',
    keywords: ['näring', 'nutrition', 'kolhydrat', 'carb', 'protein', 'fueling', 'hydration', 'race nutrition', 'kost', 'mat', 'energi', 'red-s'],
    description: 'Näringsstrategi för uthållighetsatleter. Periodiserad näring, kolhydratladdning, tävlingsnäring, proteinintag, supplementering. RED-S medvetenhet.',
    docFiles: [
      { dir: 'knowledge-library', file: 'nutrition-endurance.md' },
      { dir: 'training-engine', file: 'Advanced_Algorithmic_Design_for_Endurance_Nutrition.md' },
    ],
    priority: 8,
    maxChunks: 3,
  },
  {
    name: 'Löpekonomi & Biomekanik',
    nameEn: 'Running Economy & Biomechanics',
    category: 'SPORT_SPECIFIC',
    keywords: ['löpekonomi', 'running economy', 'biomekanik', 'biomechanics', 'kadens', 'cadence', 'markontakt', 'ground contact', 'gångart', 'gait', 'teknik', 'stegfrekvens'],
    description: 'Löpekonomi och biomekanisk analys. Kadens, markontakttid, vertikal oscillering, asymmetri. Gångartanalys, löpteknikövningar och förbättringsstrategier.',
    docFiles: [
      { dir: 'knowledge-library', file: 'running-economy.md' },
    ],
    priority: 7,
    maxChunks: 3,
  },
  {
    name: 'Cykelträning',
    nameEn: 'Cycling Training',
    category: 'SPORT_SPECIFIC',
    keywords: ['cykel', 'cycling', 'ftp', 'watt', 'power', 'w/kg', 'sweet spot', 'tss', 'ctl', 'zwift', 'inomhuscykling'],
    description: 'Cykelträning med FTP-baserade powerzoner. Periodisering, specifika träningspass, kraftprofil, TSS/CTL/ATL-modell. Inomhusträning och tävlingsförberedelse.',
    docFiles: [
      { dir: 'knowledge-library', file: 'cycling-training.md' },
    ],
    priority: 8,
    maxChunks: 3,
  },
  {
    name: 'Triatlonprogrammering',
    nameEn: 'Triathlon Programming',
    category: 'SPORT_SPECIFIC',
    keywords: ['triatlon', 'triathlon', 'ironman', 'brick', 'sim', 'swim', 'transition', 'multi-sport', 'sprint distance', 'olympic'],
    description: 'Triatlonprogrammering för sprint till ironman-distans. Volymbalans mellan sim, cykel och löp. Brick sessions, transitions, periodisering och tävlingsstrategi.',
    docFiles: [
      { dir: 'knowledge-library', file: 'triathlon-programming.md' },
    ],
    priority: 8,
    maxChunks: 3,
  },
  {
    name: 'Längdskidåkning',
    nameEn: 'Cross-Country Skiing',
    category: 'SPORT_SPECIFIC',
    keywords: ['skidåkning', 'skiing', 'längdskid', 'cross-country', 'dubbelstakning', 'double poling', 'klassisk', 'skating', 'rullskid', 'höjdträning', 'altitude'],
    description: 'Längdskidträning med klassisk och fristilsteknik. Dubbelstakning, höjdträning (Live High Train Low), barmarkträning, rullskidor. Periodisering och tävlingsförberedelse.',
    docFiles: [
      { dir: 'knowledge-library', file: 'skiing-training.md' },
    ],
    priority: 8,
    maxChunks: 3,
  },
  {
    name: 'Ergometertest',
    nameEn: 'Ergometer Testing',
    category: 'TESTING',
    keywords: ['ergometer', 'concept2', 'rodd', 'row', 'skierg', 'bikeerg', 'wattbike', '2k test', 'critical power', 'cp test', 'map test', 'ramp test'],
    description: 'Ergometertest och protokoll. Concept2, Wattbike, SkiErg. 4x4 intervaltest, 3-min all-out, CP-test, 2K/1K TT, MAP ramp. Drag factor, resultatanalys och zonberäkning.',
    docFiles: [
      { dir: 'knowledge-library', file: 'ergometer-testing.md' },
      { dir: 'training-engine', file: 'Standardization_Field_Testing_Protocols_Ergometer_Conditioning.md' },
    ],
    priority: 9,
    maxChunks: 3,
  },
  {
    name: 'Periodiseringsprinciper',
    nameEn: 'Periodization Principles',
    category: 'PROGRAMMING',
    keywords: ['periodisering', 'periodization', 'makrocykel', 'mesocykel', 'mikrocykel', 'deload', 'avlastning', 'taper', 'tapering', 'supercompensation', 'block'],
    description: 'Periodiseringsprinciper: makro/meso/mikrocykel. Klassisk, block och omvänd periodisering. Avlastningsveckor, tapering, supercompensation. ATL/CTL/TSB-modellen.',
    docFiles: [
      { dir: 'knowledge-library', file: 'periodization-principles.md' },
    ],
    priority: 9,
    maxChunks: 3,
  },
  {
    name: 'Återhämtning & Överträning',
    nameEn: 'Recovery & Overtraining',
    category: 'RECOVERY',
    keywords: ['återhämtning', 'recovery', 'överträning', 'overtraining', 'hrv', 'sömn', 'sleep', 'vila', 'rest', 'trött', 'fatigue', 'ots'],
    description: 'Återhämtning och överträningssyndrom. HRV-monitorering, sömnoptimering. Functional vs non-functional overreaching. Biomarkörer, return-to-training och återhämtningsstrategier.',
    docFiles: [
      { dir: 'knowledge-library', file: 'recovery-overtraining.md' },
    ],
    priority: 8,
    maxChunks: 3,
  },
];

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Split text into chunks for embedding
 */
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

/**
 * Generate embeddings using OpenAI
 */
async function generateEmbeddings(
  texts: string[],
  openai: OpenAI
): Promise<number[][]> {
  const batchSize = 100;
  const results: number[][] = [];

  for (let i = 0; i < texts.length; i += batchSize) {
    const batch = texts.slice(i, i + batchSize);
    console.log(`  Generating embeddings ${i + 1}-${i + batch.length} of ${texts.length}...`);

    const response = await openai.embeddings.create({
      model: EMBEDDING_MODEL,
      input: batch,
    });

    for (const item of response.data) {
      results.push(item.embedding);
    }

    // Rate limit protection
    if (i + batchSize < texts.length) {
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }

  return results;
}

/**
 * Get all markdown files from a directory
 */
function getMarkdownFiles(dir: string): string[] {
  if (!fs.existsSync(dir)) {
    console.warn(`Directory not found: ${dir}`);
    return [];
  }

  const files = fs.readdirSync(dir);
  return files
    .filter((f) => f.endsWith('.md'))
    .map((f) => path.join(dir, f));
}

/**
 * Process and seed a single document file, returning the created document ID.
 */
async function seedDocument(
  filepath: string,
  sourceDir: string,
  openai: OpenAI,
  systemUserId: string
): Promise<{ id: string; title: string; chunks: number } | null> {
  const filename = path.basename(filepath);
  const dirName = path.basename(sourceDir);

  try {
    const content = fs.readFileSync(filepath, 'utf-8');

    const titleMatch = content.match(/^#\s+(.+)/m);
    const title = titleMatch ? titleMatch[1] : filename.replace('.md', '');

    const document = await prisma.coachDocument.create({
      data: {
        coachId: systemUserId,
        name: title,
        fileType: 'MARKDOWN',
        fileUrl: `docs/${dirName}/${filename}`,
        fileSize: Buffer.byteLength(content, 'utf-8'),
        description: `System documentation: ${title}`,
        isSystem: true,
        processingStatus: 'PROCESSING',
      },
    });

    const chunks = chunkText(content, filename);

    if (chunks.length === 0) {
      await prisma.coachDocument.update({
        where: { id: document.id },
        data: { processingStatus: 'COMPLETED', chunkCount: 0 },
      });
      return { id: document.id, title, chunks: 0 };
    }

    const contents = chunks.map((c) => c.content);
    const embeddings = await generateEmbeddings(contents, openai);

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const embedding = embeddings[i];

      const knowledgeChunk = await prisma.knowledgeChunk.create({
        data: {
          documentId: document.id,
          coachId: systemUserId,
          content: chunk.content,
          chunkIndex: chunk.index,
          embeddingModel: EMBEDDING_MODEL,
          tokenCount: Math.ceil(chunk.content.length / 4),
          metadata: chunk.metadata as object,
        },
      });

      const embeddingArray = `[${embedding.join(',')}]`;
      await prisma.$executeRawUnsafe(
        `UPDATE "KnowledgeChunk" SET embedding = $1::vector WHERE id = $2`,
        embeddingArray,
        knowledgeChunk.id
      );
    }

    await prisma.coachDocument.update({
      where: { id: document.id },
      data: { processingStatus: 'COMPLETED', chunkCount: chunks.length },
    });

    return { id: document.id, title, chunks: chunks.length };
  } catch (error) {
    console.error(`  Error processing ${filename}:`, error);
    return null;
  }
}

// ============================================================================
// Main Seeding Function
// ============================================================================

async function seedKnowledgeBase() {
  console.log('Resolving OpenAI API key...');
  const { apiKey, systemUserId } = await resolveOpenAIKey();
  const openai = new OpenAI({ apiKey });

  console.log('Starting knowledge base seeding...\n');

  // ── Step 1: Clear existing system data ──────────────────────────────────
  console.log('Clearing existing system data...');
  await prisma.$executeRawUnsafe(`DELETE FROM "KnowledgeSkill" WHERE true`);
  await prisma.knowledgeChunk.deleteMany({ where: { coachId: systemUserId } });
  await prisma.coachDocument.deleteMany({ where: { coachId: systemUserId } });
  console.log('  Cleared existing knowledge skills, chunks, and documents.\n');

  // ── Step 2: Ensure pgvector embedding columns ──────────────────────────
  console.log('Ensuring pgvector columns...');
  try {
    await prisma.$executeRawUnsafe(
      `ALTER TABLE "KnowledgeChunk" ADD COLUMN IF NOT EXISTS embedding vector(1536)`
    );
    console.log('  KnowledgeChunk.embedding column ready.');
  } catch (error) {
    console.warn('  KnowledgeChunk embedding column may already exist:', error);
  }
  try {
    await prisma.$executeRawUnsafe(
      `ALTER TABLE "KnowledgeSkill" ADD COLUMN IF NOT EXISTS embedding vector(1536)`
    );
    console.log('  KnowledgeSkill.embedding column ready.\n');
  } catch (error) {
    console.warn('  KnowledgeSkill embedding column may already exist:', error);
  }

  // ── Step 3: Seed documents from both directories ────────────────────────
  // Map from "dir/filename" → document ID for linking skills
  const docFileToId = new Map<string, string>();
  let totalChunks = 0;
  let totalDocuments = 0;

  // Process knowledge-library docs first (curated)
  const knowledgeLibFiles = getMarkdownFiles(KNOWLEDGE_LIBRARY_DIR);
  console.log(`Found ${knowledgeLibFiles.length} files in docs/knowledge-library/`);

  for (const filepath of knowledgeLibFiles) {
    const filename = path.basename(filepath);
    console.log(`\nProcessing: knowledge-library/${filename}`);
    const result = await seedDocument(filepath, KNOWLEDGE_LIBRARY_DIR, openai, systemUserId);
    if (result) {
      docFileToId.set(`knowledge-library/${filename}`, result.id);
      totalChunks += result.chunks;
      totalDocuments++;
      console.log(`  ✓ ${result.title} (${result.chunks} chunks)`);
    }
  }

  // Process training-engine docs (only those referenced by skills)
  const referencedTrainingFiles = new Set<string>();
  for (const skill of SKILL_DEFINITIONS) {
    for (const docRef of skill.docFiles) {
      if (docRef.dir === 'training-engine') {
        referencedTrainingFiles.add(docRef.file);
      }
    }
  }

  console.log(`\nProcessing ${referencedTrainingFiles.size} referenced training-engine docs...`);
  for (const filename of referencedTrainingFiles) {
    const filepath = path.join(TRAINING_ENGINE_DIR, filename);
    if (!fs.existsSync(filepath)) {
      console.warn(`  ⚠ File not found: training-engine/${filename}`);
      continue;
    }
    console.log(`\nProcessing: training-engine/${filename}`);
    const result = await seedDocument(filepath, TRAINING_ENGINE_DIR, openai, systemUserId);
    if (result) {
      docFileToId.set(`training-engine/${filename}`, result.id);
      totalChunks += result.chunks;
      totalDocuments++;
      console.log(`  ✓ ${result.title} (${result.chunks} chunks)`);
    }
  }

  // ── Step 4: Create KnowledgeSkill entries ───────────────────────────────
  console.log('\n\nCreating KnowledgeSkill entries...');
  let skillsCreated = 0;

  for (const skillDef of SKILL_DEFINITIONS) {
    // Resolve document IDs
    const resolvedDocIds: string[] = [];
    for (const docRef of skillDef.docFiles) {
      const key = `${docRef.dir}/${docRef.file}`;
      const docId = docFileToId.get(key);
      if (docId) {
        resolvedDocIds.push(docId);
      } else {
        console.warn(`  ⚠ Document not found for skill "${skillDef.name}": ${key}`);
      }
    }

    try {
      const skill = await prisma.knowledgeSkill.create({
        data: {
          name: skillDef.name,
          nameEn: skillDef.nameEn,
          description: skillDef.description,
          category: skillDef.category as any,
          keywords: skillDef.keywords,
          priority: skillDef.priority,
          documentIds: resolvedDocIds,
          maxChunks: skillDef.maxChunks,
          isActive: true,
        },
      });

      // Generate and store description embedding for semantic matching
      console.log(`  Creating embedding for "${skillDef.name}"...`);
      const [embedding] = await generateEmbeddings([skillDef.description], openai);
      const embeddingArray = `[${embedding.join(',')}]`;
      await prisma.$executeRawUnsafe(
        `UPDATE "KnowledgeSkill" SET embedding = $1::vector WHERE id = $2`,
        embeddingArray,
        skill.id
      );

      skillsCreated++;
      console.log(`  ✓ ${skillDef.name} (${resolvedDocIds.length} docs linked)`);
    } catch (error) {
      console.error(`  ✗ Error creating skill "${skillDef.name}":`, error);
    }
  }

  // ── Summary ─────────────────────────────────────────────────────────────
  console.log('\n' + '='.repeat(50));
  console.log('Knowledge base seeding complete!');
  console.log(`Documents processed: ${totalDocuments}`);
  console.log(`Total chunks created: ${totalChunks}`);
  console.log(`Knowledge skills created: ${skillsCreated}`);
  console.log('='.repeat(50) + '\n');
}

// Run the seeding
seedKnowledgeBase()
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
