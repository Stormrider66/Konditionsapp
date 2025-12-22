/**
 * Script to embed training-engine documentation for RAG
 *
 * Usage: npx ts-node scripts/embed-training-docs.ts
 *
 * Requires OPENAI_API_KEY in environment or .env.local
 *
 * Note: System documents are stored with isSystem=true and require an admin user.
 * The script will find or create a system admin user for document ownership.
 */

import { readFileSync, readdirSync } from 'fs'
import { join } from 'path'
import OpenAI from 'openai'
import { PrismaClient, DocumentType } from '@prisma/client'

const prisma = new PrismaClient()

// Embedding configuration
const EMBEDDING_MODEL = 'text-embedding-ada-002'
const MAX_CHUNK_SIZE = 1000 // characters
const CHUNK_OVERLAP = 200 // characters

interface Chunk {
  content: string
  index: number
  metadata: {
    fileName: string
    section?: string
  }
}

/**
 * Split text into overlapping chunks
 */
function chunkText(text: string, fileName: string): Chunk[] {
  const chunks: Chunk[] = []
  let index = 0
  let position = 0

  while (position < text.length) {
    const end = Math.min(position + MAX_CHUNK_SIZE, text.length)
    let chunkEnd = end

    // Try to break at paragraph or sentence boundary
    if (end < text.length) {
      const paragraphBreak = text.lastIndexOf('\n\n', end)
      const sentenceBreak = text.lastIndexOf('. ', end)

      if (paragraphBreak > position + MAX_CHUNK_SIZE / 2) {
        chunkEnd = paragraphBreak + 2
      } else if (sentenceBreak > position + MAX_CHUNK_SIZE / 2) {
        chunkEnd = sentenceBreak + 2
      }
    }

    const content = text.slice(position, chunkEnd).trim()

    if (content.length > 50) { // Skip very short chunks
      chunks.push({
        content,
        index,
        metadata: { fileName },
      })
      index++
    }

    position = chunkEnd - CHUNK_OVERLAP
    if (position <= 0 || position >= text.length) {
      position = chunkEnd
    }
  }

  return chunks
}

/**
 * Generate embeddings for chunks
 */
async function embedChunks(
  chunks: Chunk[],
  openai: OpenAI
): Promise<Array<Chunk & { embedding: number[] }>> {
  const results: Array<Chunk & { embedding: number[] }> = []

  // Process in batches of 20
  const batchSize = 20

  for (let i = 0; i < chunks.length; i += batchSize) {
    const batch = chunks.slice(i, i + batchSize)
    const texts = batch.map((c) => c.content)

    console.log(`  Embedding batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(chunks.length / batchSize)}...`)

    const response = await openai.embeddings.create({
      model: EMBEDDING_MODEL,
      input: texts,
    })

    for (let j = 0; j < batch.length; j++) {
      results.push({
        ...batch[j],
        embedding: response.data[j].embedding,
      })
    }

    // Rate limiting
    await new Promise((resolve) => setTimeout(resolve, 100))
  }

  return results
}

async function main() {
  console.log('Starting training-engine documentation embedding...\n')

  // Check for API key
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    console.error('Error: OPENAI_API_KEY environment variable not set')
    console.error('Set it in .env.local or export it: export OPENAI_API_KEY=your-key')
    process.exit(1)
  }

  const openai = new OpenAI({ apiKey })

  // Find an admin or coach user to own system documents
  const adminUser = await prisma.user.findFirst({
    where: {
      OR: [
        { role: 'ADMIN' },
        { role: 'COACH' },
      ],
    },
    orderBy: { createdAt: 'asc' },
  })

  if (!adminUser) {
    console.error('Error: No admin or coach user found in database.')
    console.error('Create a user first before running this script.')
    process.exit(1)
  }

  console.log(`Using user "${adminUser.email}" as document owner\n`)

  // Read all markdown files from training-engine docs
  const docsDir = join(process.cwd(), 'docs', 'training-engine')
  const files = readdirSync(docsDir).filter((f) => f.endsWith('.md'))

  console.log(`Found ${files.length} documentation files\n`)

  // First, check if we already have system documents
  const existingDocs = await prisma.coachDocument.count({
    where: { isSystem: true },
  })

  if (existingDocs > 0) {
    console.log(`Found ${existingDocs} existing system documents.`)
    console.log('Clearing existing system documents and chunks...\n')

    // Delete existing system knowledge chunks
    await prisma.knowledgeChunk.deleteMany({
      where: {
        document: { isSystem: true },
      },
    })

    // Delete existing system documents
    await prisma.coachDocument.deleteMany({
      where: { isSystem: true },
    })
  }

  let totalChunks = 0

  for (const fileName of files) {
    const filePath = join(docsDir, fileName)
    const content = readFileSync(filePath, 'utf-8')

    console.log(`Processing: ${fileName} (${content.length} chars)`)

    // Create document record
    const doc = await prisma.coachDocument.create({
      data: {
        name: fileName.replace('.md', ''),
        fileType: DocumentType.MARKDOWN,
        fileUrl: `docs/training-engine/${fileName}`,
        fileSize: content.length,
        description: `Training engine documentation: ${fileName}`,
        isSystem: true,
        coachId: adminUser.id,
        processingStatus: 'COMPLETED',
      },
    })

    // Chunk the content
    const chunks = chunkText(content, fileName)
    console.log(`  Created ${chunks.length} chunks`)

    // Generate embeddings
    const embeddedChunks = await embedChunks(chunks, openai)

    // Store chunks in database using raw SQL for vector
    for (const chunk of embeddedChunks) {
      const embeddingStr = `[${chunk.embedding.join(',')}]`

      await prisma.$executeRaw`
        INSERT INTO "KnowledgeChunk" (
          "id", "documentId", "coachId", "content", "chunkIndex",
          "metadata", "embeddingModel", "embedding", "createdAt"
        ) VALUES (
          gen_random_uuid(),
          ${doc.id},
          ${adminUser.id},
          ${chunk.content},
          ${chunk.index},
          ${JSON.stringify(chunk.metadata)}::jsonb,
          ${EMBEDDING_MODEL},
          ${embeddingStr}::vector,
          NOW()
        )
      `
    }

    // Update document chunk count
    await prisma.coachDocument.update({
      where: { id: doc.id },
      data: { chunkCount: chunks.length },
    })

    totalChunks += chunks.length
    console.log(`  Stored ${chunks.length} embedded chunks\n`)
  }

  console.log('='.repeat(50))
  console.log(`Embedding complete!`)
  console.log(`  Files processed: ${files.length}`)
  console.log(`  Total chunks: ${totalChunks}`)
  console.log('='.repeat(50))

  await prisma.$disconnect()
}

main().catch((error) => {
  console.error('Error:', error)
  prisma.$disconnect()
  process.exit(1)
})
