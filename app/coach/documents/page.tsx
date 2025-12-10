// app/coach/documents/page.tsx
import { requireCoach } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'
import { DocumentsClient } from '@/components/documents/DocumentsClient'

export default async function DocumentsPage() {
  const user = await requireCoach()

  // Fetch coach's documents
  const documents = await prisma.coachDocument.findMany({
    where: { coachId: user.id },
    include: {
      chunks: {
        select: {
          id: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  })

  // Check if user has OpenAI key for embeddings
  const apiKeys = await prisma.userApiKey.findUnique({
    where: { userId: user.id },
    select: { openaiKeyValid: true },
  })

  const hasOpenAIKey = apiKeys?.openaiKeyValid ?? false

  // Transform documents for client
  const documentsWithChunkCount = documents.map((doc) => ({
    id: doc.id,
    name: doc.name,
    description: doc.description,
    fileType: doc.fileType,
    fileUrl: doc.fileUrl,
    fileSize: doc.fileSize,
    mimeType: doc.mimeType,
    isSystem: doc.isSystem,
    processingStatus: doc.processingStatus,
    processingError: doc.processingError,
    chunkCount: doc.chunks.length,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  }))

  return (
    <DocumentsClient
      documents={documentsWithChunkCount}
      hasOpenAIKey={hasOpenAIKey}
    />
  )
}
