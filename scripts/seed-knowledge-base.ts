/**
 * Knowledge Base Seeding Script
 *
 * Seeds the knowledge base with system documents from docs/training-engine/
 * These are available to all users as system knowledge.
 *
 * Usage: npx ts-node scripts/seed-knowledge-base.ts
 *
 * Requires OPENAI_API_KEY environment variable for embedding generation.
 */

import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import OpenAI from 'openai';

const prisma = new PrismaClient();

// Configuration
const DOCS_DIR = path.join(process.cwd(), 'docs', 'training-engine');
const EMBEDDING_MODEL = 'text-embedding-ada-002';
const MAX_CHUNK_SIZE = 1000;
const SYSTEM_USER_ID = 'system'; // Special ID for system documents

interface ChunkResult {
  content: string;
  index: number;
  metadata: Record<string, unknown>;
}

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
 * Get all markdown files from docs/training-engine/
 */
function getMarkdownFiles(): string[] {
  if (!fs.existsSync(DOCS_DIR)) {
    console.error(`Directory not found: ${DOCS_DIR}`);
    return [];
  }

  const files = fs.readdirSync(DOCS_DIR);
  return files
    .filter((f) => f.endsWith('.md'))
    .map((f) => path.join(DOCS_DIR, f));
}

/**
 * Main seeding function
 */
async function seedKnowledgeBase() {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    console.error('Error: OPENAI_API_KEY environment variable is required');
    console.log('Set it with: $env:OPENAI_API_KEY = "your-key-here"');
    process.exit(1);
  }

  const openai = new OpenAI({ apiKey });

  console.log('Starting knowledge base seeding...\n');

  // Get all markdown files
  const files = getMarkdownFiles();
  console.log(`Found ${files.length} markdown files in ${DOCS_DIR}\n`);

  if (files.length === 0) {
    console.log('No files to process.');
    return;
  }

  // Clear existing system documents
  console.log('Clearing existing system knowledge chunks...');
  await prisma.knowledgeChunk.deleteMany({
    where: { coachId: SYSTEM_USER_ID },
  });
  await prisma.coachDocument.deleteMany({
    where: { coachId: SYSTEM_USER_ID },
  });

  let totalChunks = 0;
  let totalDocuments = 0;

  for (const filepath of files) {
    const filename = path.basename(filepath);
    console.log(`\nProcessing: ${filename}`);

    try {
      // Read file content
      const content = fs.readFileSync(filepath, 'utf-8');

      // Extract title from first line
      const titleMatch = content.match(/^#\s+(.+)/m);
      const title = titleMatch ? titleMatch[1] : filename.replace('.md', '');

      // Create document record
      const document = await prisma.coachDocument.create({
        data: {
          coachId: SYSTEM_USER_ID,
          name: title,
          fileType: 'MARKDOWN',
          fileUrl: `docs/training-engine/${filename}`,
          fileSize: Buffer.byteLength(content, 'utf-8'),
          description: `System documentation: ${title}`,
          isSystem: true,
          processingStatus: 'PROCESSING',
        },
      });

      console.log(`  Created document: ${document.id}`);

      // Chunk the content
      const chunks = chunkText(content, filename);
      console.log(`  Split into ${chunks.length} chunks`);

      if (chunks.length === 0) {
        await prisma.coachDocument.update({
          where: { id: document.id },
          data: {
            processingStatus: 'COMPLETED',
            chunkCount: 0,
          },
        });
        continue;
      }

      // Generate embeddings
      const contents = chunks.map((c) => c.content);
      const embeddings = await generateEmbeddings(contents, openai);

      // Store chunks with embeddings
      console.log(`  Storing ${chunks.length} chunks with embeddings...`);

      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        const embedding = embeddings[i];

        // Create chunk record
        const knowledgeChunk = await prisma.knowledgeChunk.create({
          data: {
            documentId: document.id,
            coachId: SYSTEM_USER_ID,
            content: chunk.content,
            chunkIndex: chunk.index,
            embeddingModel: EMBEDDING_MODEL,
            tokenCount: Math.ceil(chunk.content.length / 4), // Approximate
            metadata: chunk.metadata as object,
          },
        });

        // Update embedding using raw SQL (pgvector)
        const embeddingArray = `[${embedding.join(',')}]`;
        await prisma.$executeRawUnsafe(
          `UPDATE "KnowledgeChunk" SET embedding = $1::vector WHERE id = $2`,
          embeddingArray,
          knowledgeChunk.id
        );
      }

      // Update document status
      await prisma.coachDocument.update({
        where: { id: document.id },
        data: {
          processingStatus: 'COMPLETED',
          chunkCount: chunks.length,
        },
      });

      totalChunks += chunks.length;
      totalDocuments++;
      console.log(`  Completed: ${title}`);

    } catch (error) {
      console.error(`  Error processing ${filename}:`, error);
    }
  }

  console.log('\n' + '='.repeat(50));
  console.log('Knowledge base seeding complete!');
  console.log(`Documents processed: ${totalDocuments}`);
  console.log(`Total chunks created: ${totalChunks}`);
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
