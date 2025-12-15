// app/coach/ai-studio/page.tsx
import { requireCoach } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'
import { AIStudioClient } from '@/components/ai-studio/AIStudioClient'

interface PageProps {
  searchParams: Promise<{
    mode?: string
    clientId?: string
  }>
}

export default async function AIStudioPage({ searchParams }: PageProps) {
  const user = await requireCoach()
  const params = await searchParams

  // Fetch coach's clients for athlete selection
  const clients = await prisma.client.findMany({
    where: { userId: user.id },
    select: {
      id: true,
      name: true,
      email: true,
      sportProfile: {
        select: {
          primarySport: true,
        },
      },
    },
    orderBy: { name: 'asc' },
  })

  // Fetch coach's documents (include all statuses so user can see pending/failed)
  const documents = await prisma.coachDocument.findMany({
    where: {
      coachId: user.id,
    },
    select: {
      id: true,
      name: true,
      description: true,
      fileType: true,
      chunkCount: true,
      createdAt: true,
      processingStatus: true,
    },
    orderBy: { createdAt: 'desc' },
  })

  // Fetch available AI models (for finding default model)
  const models = await prisma.aIModel.findMany({
    where: { isActive: true },
  })

  // Check if user has API keys configured and get default model
  const apiKeys = await prisma.userApiKey.findUnique({
    where: { userId: user.id },
    select: {
      anthropicKeyValid: true,
      googleKeyValid: true,
      openaiKeyValid: true,
      defaultModelId: true,
    },
  })

  // Fetch recent conversations
  const conversations = await prisma.aIConversation.findMany({
    where: {
      coachId: user.id,
      status: 'ACTIVE',
    },
    select: {
      id: true,
      title: true,
      modelUsed: true,
      provider: true,
      createdAt: true,
      updatedAt: true,
      athlete: {
        select: {
          id: true,
          name: true,
        },
      },
    },
    orderBy: { updatedAt: 'desc' },
    take: 10,
  })

  const hasApiKeys = !!(apiKeys?.anthropicKeyValid || apiKeys?.googleKeyValid)

  // Find the user's default model or fallback to system default
  const defaultModelId = apiKeys?.defaultModelId
  const defaultModel = defaultModelId
    ? models.find(m => m.id === defaultModelId)
    : models.find(m => m.isDefault) || models[0]

  return (
    <AIStudioClient
      clients={clients}
      documents={documents}
      conversations={conversations}
      hasApiKeys={hasApiKeys}
      apiKeyStatus={{
        anthropic: apiKeys?.anthropicKeyValid ?? false,
        google: apiKeys?.googleKeyValid ?? false,
        openai: apiKeys?.openaiKeyValid ?? false,
      }}
      defaultModel={defaultModel || null}
      initialMode={params.mode}
      initialClientId={params.clientId}
    />
  )
}
