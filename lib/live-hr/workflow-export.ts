import { prisma } from '@/lib/prisma'
import { ATHLETE_COLORS } from '@/lib/interval-session/types'
import type { LiveHRWorkflowAssignment, LiveHRWorkflowBlock } from './types'

type ExportResult =
  | { success: true; intervalSessionId: string }
  | { success: false; error: string }

function blockEnd(block: LiveHRWorkflowBlock, fallback: Date): Date {
  return block.endedAt ? new Date(block.endedAt) : fallback
}

function blockStart(block: LiveHRWorkflowBlock): Date {
  return new Date(block.startedAt)
}

function isWorkBlock(block: LiveHRWorkflowBlock): boolean {
  return block.type !== 'REST'
}

function blockAppliesToClient(block: LiveHRWorkflowBlock, clientId: string): boolean {
  return block.clientId === null || block.clientId === clientId
}

function serializeProtocol(input: {
  liveSessionId: string
  blocks: LiveHRWorkflowBlock[]
  assignments?: Record<string, LiveHRWorkflowAssignment>
}) {
  const workBlocks = input.blocks.filter(isWorkBlock)

  return JSON.parse(JSON.stringify({
    intervalCount: workBlocks.length,
    description: 'Exported from Live HR tagged workout',
    source: {
      type: 'LIVE_HR',
      id: input.liveSessionId,
    },
    steps: input.blocks.map((block, index) => ({
      label: block.label,
      type: block.type,
      targetDurationSeconds: block.endedAt
        ? Math.max(0, Math.round((new Date(block.endedAt).getTime() - new Date(block.startedAt).getTime()) / 1000))
        : block.target?.durationSeconds,
      notes: block.target?.notes,
      liveHrClientId: block.clientId,
      liveHrSequence: block.sequence,
      stepIndex: block.stepIndex ?? index,
      target: block.target ?? undefined,
    })),
    assignments: input.assignments ?? {},
  }))
}

export async function exportLiveHRWorkflowToIntervalSession(input: {
  coachId: string
  sessionId: string
  blocks: LiveHRWorkflowBlock[]
  assignments?: Record<string, LiveHRWorkflowAssignment>
}): Promise<ExportResult> {
  const liveSession = await prisma.liveHRSession.findFirst({
    where: { id: input.sessionId, coachId: input.coachId },
    include: {
      participants: {
        include: { client: { select: { id: true, name: true } } },
        orderBy: { joinedAt: 'asc' },
      },
    },
  })

  if (!liveSession) return { success: false, error: 'Live HR session not found' }
  if (liveSession.participants.length === 0) return { success: false, error: 'No athletes in session' }

  const sortedBlocks = [...input.blocks]
    .filter((block) => Number.isFinite(new Date(block.startedAt).getTime()))
    .sort((a, b) => new Date(a.startedAt).getTime() - new Date(b.startedAt).getTime() || a.sequence - b.sequence)

  if (sortedBlocks.filter(isWorkBlock).length === 0) {
    return { success: false, error: 'No interval tags to save' }
  }

  const now = new Date()
  const firstStartedAt = blockStart(sortedBlocks[0])
  const participantIds = new Map<string, string>()

  const intervalSession = await prisma.$transaction(async (tx) => {
    const created = await tx.intervalSession.create({
      data: {
        coachId: input.coachId,
        teamId: liveSession.teamId,
        name: `${liveSession.name || 'Live HR'} tagged session`,
        sportType: 'LIVE_HR',
        protocol: serializeProtocol({
          liveSessionId: liveSession.id,
          blocks: sortedBlocks,
          assignments: input.assignments,
        }),
        status: 'ENDED',
        timerStartedAt: firstStartedAt,
        startedAt: firstStartedAt,
        endedAt: now,
      },
    })

    await tx.intervalSessionParticipant.createMany({
      data: liveSession.participants.map((participant, index) => ({
        sessionId: created.id,
        clientId: participant.clientId,
        color: ATHLETE_COLORS[index % ATHLETE_COLORS.length],
        sortOrder: index,
      })),
      skipDuplicates: true,
    })

    const createdParticipants = await tx.intervalSessionParticipant.findMany({
      where: { sessionId: created.id },
      select: { id: true, clientId: true },
    })
    for (const participant of createdParticipants) {
      participantIds.set(participant.clientId, participant.id)
    }

    const intervalNumbers = new Map<string, number>()
    const laps: Array<{
      participantId: string
      intervalNumber: number
      splitTimeMs: number
      cumulativeMs: number
      recordedAt: Date
    }> = []

    for (const block of sortedBlocks) {
      if (!isWorkBlock(block)) continue
      const startedAt = blockStart(block)
      const endedAt = blockEnd(block, now)
      const splitTimeMs = Math.max(0, endedAt.getTime() - startedAt.getTime())
      if (splitTimeMs <= 0) continue

      for (const participant of liveSession.participants) {
        if (!blockAppliesToClient(block, participant.clientId)) continue
        const intervalParticipantId = participantIds.get(participant.clientId)
        if (!intervalParticipantId) continue
        const nextIntervalNumber = (intervalNumbers.get(participant.clientId) ?? 0) + 1
        intervalNumbers.set(participant.clientId, nextIntervalNumber)
        laps.push({
          participantId: intervalParticipantId,
          intervalNumber: nextIntervalNumber,
          splitTimeMs,
          cumulativeMs: Math.max(0, endedAt.getTime() - firstStartedAt.getTime()),
          recordedAt: endedAt,
        })
      }
    }

    if (laps.length > 0) {
      await tx.intervalLap.createMany({ data: laps })
    }

    return created
  })

  return { success: true, intervalSessionId: intervalSession.id }
}
