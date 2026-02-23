import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
import './setup'
import { prisma } from '@/lib/prisma'
import {
  canAccessClient,
  getCurrentUser,
  requireAthlete,
  requireCoach,
  resolveAthleteClientId,
} from '@/lib/auth-utils'
import { canAccessAthlete as canAccessAthleteScoped } from '@/lib/auth/athlete-access'
import { expectDeniedResponse, resetTenantBoundaryMocks } from './setup'
import { GET as getAthleteRestrictions } from '@/app/api/restrictions/athlete/[clientId]/route'
import { GET as getAthleteCardioSessions } from '@/app/api/athletes/[clientId]/cardio-sessions/route'
import { GET as getAthleteHybridWorkouts } from '@/app/api/athletes/[clientId]/hybrid-workouts/route'
import {
  GET as getHybridWorkoutResults,
  POST as postHybridWorkoutResults,
} from '@/app/api/hybrid-workouts/[id]/results/route'
import { POST as postAgilityWorkoutAssign } from '@/app/api/agility-workouts/[id]/assign/route'
import { POST as postVideoUpload } from '@/app/api/video-analysis/upload/route'
import { POST as postDeepResearchShare } from '@/app/api/ai/deep-research/[sessionId]/share/route'
import {
  GET as getDeepResearchSession,
  DELETE as deleteDeepResearchSession,
} from '@/app/api/ai/deep-research/[sessionId]/route'
import { GET as getDeepResearchProgress } from '@/app/api/ai/deep-research/[sessionId]/progress/route'
import { POST as postAiConversations } from '@/app/api/ai/conversations/route'
import { DELETE as deleteAiMemory } from '@/app/api/ai/memory/[clientId]/route'
import { POST as postCareTeamThreads } from '@/app/api/care-team/threads/route'
import { GET as getRehabProgress } from '@/app/api/physio/rehab-programs/[id]/progress/route'
import { GET as getRehabProgramDetail } from '@/app/api/physio/rehab-programs/[id]/route'
import { GET as getPhysioRestrictionDetail } from '@/app/api/physio/restrictions/[id]/route'
import { POST as postAgentExecute } from '@/app/api/agent/execute/route'
import { GET as getRaceResults, POST as postRaceResults } from '@/app/api/race-results/route'
import {
  GET as getRaceResultDetail,
  DELETE as deleteRaceResult,
} from '@/app/api/race-results/[id]/route'
import {
  GET as getHybridAssignments,
  POST as postHybridAssignments,
} from '@/app/api/hybrid-assignments/route'

describe('Tenant boundary - access routes', () => {
  beforeEach(() => {
    resetTenantBoundaryMocks()
  })

  it('GET /api/restrictions/athlete/[clientId] denies athlete access to foreign client', async () => {
    vi.mocked(getCurrentUser).mockResolvedValue({ id: 'athlete-a', role: 'ATHLETE' } as any)
    vi.mocked(canAccessClient).mockResolvedValue(false)

    const request = new Request('http://localhost/api/restrictions/athlete/client-b')
    const response = await getAthleteRestrictions(request as any, {
      params: Promise.resolve({ clientId: 'client-b' }),
    })

    await expectDeniedResponse(response as any, 403, ['restrictions', 'restrictionSummary'])
    expect(prisma.trainingRestriction.findMany).not.toHaveBeenCalled()
  })

  it('GET /api/athletes/[clientId]/cardio-sessions denies athlete access to foreign client', async () => {
    vi.mocked(requireAthlete).mockResolvedValue({ id: 'athlete-a', role: 'ATHLETE' } as any)
    vi.mocked(canAccessClient).mockResolvedValue(false)

    const request = new Request('http://localhost/api/athletes/client-b/cardio-sessions')
    const response = await getAthleteCardioSessions(request as any, {
      params: Promise.resolve({ clientId: 'client-b' }),
    })

    await expectDeniedResponse(response as any, 403, ['data', 'assignments'])
    expect(prisma.cardioSessionAssignment.findMany).not.toHaveBeenCalled()
  })

  it('GET /api/athletes/[clientId]/hybrid-workouts denies athlete access to foreign client', async () => {
    vi.mocked(requireAthlete).mockResolvedValue({ id: 'athlete-a', role: 'ATHLETE' } as any)
    vi.mocked(canAccessClient).mockResolvedValue(false)

    const request = new Request('http://localhost/api/athletes/client-b/hybrid-workouts')
    const response = await getAthleteHybridWorkouts(request as any, {
      params: Promise.resolve({ clientId: 'client-b' }),
    })

    await expectDeniedResponse(response as any, 403, ['data', 'assignments'])
    expect(prisma.hybridWorkoutAssignment.findMany).not.toHaveBeenCalled()
  })

  it('GET /api/hybrid-workouts/[id]/results denies coach access for foreign athleteId filter', async () => {
    vi.mocked(getCurrentUser).mockResolvedValue({ id: 'coach-a', role: 'COACH' } as any)
    vi.mocked(resolveAthleteClientId).mockResolvedValue(null)
    vi.mocked(canAccessAthleteScoped).mockResolvedValue({ allowed: false } as any)

    const request = new Request(
      'http://localhost/api/hybrid-workouts/workout-1/results?athleteId=client-b'
    )
    const response = await getHybridWorkoutResults(request as any, {
      params: Promise.resolve({ id: 'workout-1' }),
    })

    await expectDeniedResponse(response as any, 403, ['results', 'pagination'])
    expect(prisma.hybridWorkoutResult.findMany).not.toHaveBeenCalled()
    expect(prisma.hybridWorkoutResult.count).not.toHaveBeenCalled()
  })

  it('POST /api/hybrid-workouts/[id]/results denies coach write for foreign athleteId', async () => {
    vi.mocked(getCurrentUser).mockResolvedValue({ id: 'coach-a', role: 'COACH' } as any)
    vi.mocked(resolveAthleteClientId).mockResolvedValue(null)
    vi.mocked(canAccessAthleteScoped).mockResolvedValue({ allowed: false } as any)

    const request = new Request('http://localhost/api/hybrid-workouts/workout-1/results', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        athleteId: 'client-b',
        scoreType: 'TIME',
        timeScore: 1000,
        scalingLevel: 'RX',
      }),
    })
    const response = await postHybridWorkoutResults(request as any, {
      params: Promise.resolve({ id: 'workout-1' }),
    })

    await expectDeniedResponse(response as any, 403, ['result', 'previousBest'])
    expect(prisma.hybridWorkout.findUnique).not.toHaveBeenCalled()
    expect(prisma.hybridWorkoutResult.create).not.toHaveBeenCalled()
  })

  it('POST /api/agility-workouts/[id]/assign denies when athleteIds include foreign athlete', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ role: 'COACH' } as any)
    vi.mocked(prisma.agilityWorkout.findUnique).mockResolvedValue({
      id: 'workout-1',
      name: 'Agility Test',
      coachId: 'coach-a',
      isPublic: false,
    } as any)
    vi.mocked(prisma.client.findMany).mockResolvedValue([
      { id: '11111111-1111-4111-8111-111111111111', name: 'Athlete One' },
      { id: '22222222-2222-4222-8222-222222222222', name: 'Athlete Two' },
    ] as any)
    vi.mocked(canAccessClient).mockImplementation(async (_userId, clientId) => {
      return clientId !== '22222222-2222-4222-8222-222222222222'
    })

    const request = new Request('http://localhost/api/agility-workouts/workout-1/assign', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        athleteIds: [
          '11111111-1111-4111-8111-111111111111',
          '22222222-2222-4222-8222-222222222222',
        ],
        assignedDate: '2026-02-09',
      }),
    })
    const response = await postAgilityWorkoutAssign(request as any, {
      params: Promise.resolve({ id: 'workout-1' }),
    })

    await expectDeniedResponse(response as any, 403, ['assignments', 'assignedCount'])
    expect(prisma.agilityWorkoutAssignment.upsert).not.toHaveBeenCalled()
    expect(prisma.calendarEvent.create).not.toHaveBeenCalled()
  })

  it('POST /api/video-analysis/upload returns 404 for foreign athleteId', async () => {
    vi.mocked(requireCoach).mockResolvedValue({ id: 'coach-a', role: 'COACH' } as any)
    vi.mocked(canAccessClient).mockResolvedValue(false)

    const response = await postVideoUpload(
      new Request('http://localhost/api/video-analysis/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'get-upload-url',
          fileName: 'clip.mp4',
          fileType: 'video/mp4',
          fileSize: 1024,
          videoType: 'STRENGTH',
          athleteId: '11111111-1111-4111-8111-111111111111',
        }),
      }) as any
    )

    expect(response.status).toBe(404)
    expect(prisma.videoAnalysis.create).not.toHaveBeenCalled()
  })

  it('POST /api/ai/deep-research/[sessionId]/share returns 404 for foreign athleteId', async () => {
    vi.mocked(requireCoach).mockResolvedValue({ id: 'coach-a', role: 'COACH' } as any)
    vi.mocked(prisma.deepResearchSession.findFirst).mockResolvedValue({
      id: 'session-1',
      status: 'COMPLETED',
      query: 'test',
      report: {},
    } as any)
    vi.mocked(canAccessClient).mockResolvedValue(false)

    const request = new Request('http://localhost/api/ai/deep-research/session-1/share', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        athleteId: '11111111-1111-4111-8111-111111111111',
        notify: false,
      }),
    })
    const response = await postDeepResearchShare(request as any, {
      params: Promise.resolve({ sessionId: 'session-1' }),
    })

    await expectDeniedResponse(response as any, 404, ['shareId', 'athleteName'])
    expect(prisma.client.findUnique).not.toHaveBeenCalled()
    expect(prisma.sharedResearchAccess.create).not.toHaveBeenCalled()
  })

  it('GET /api/ai/deep-research/[sessionId] returns 404 for foreign session', async () => {
    vi.mocked(requireCoach).mockResolvedValue({ id: 'coach-a', role: 'COACH' } as any)
    vi.mocked(prisma.deepResearchSession.findFirst).mockResolvedValue(null as any)

    const response = await getDeepResearchSession(
      new NextRequest('http://localhost/api/ai/deep-research/session-b') as any,
      { params: Promise.resolve({ sessionId: 'session-b' }) }
    )

    await expectDeniedResponse(response as any, 404)
  })

  it('DELETE /api/ai/deep-research/[sessionId] returns 404 for foreign session', async () => {
    vi.mocked(requireCoach).mockResolvedValue({ id: 'coach-a', role: 'COACH' } as any)
    vi.mocked(prisma.deepResearchSession.findFirst).mockResolvedValue(null as any)

    const response = await deleteDeepResearchSession(
      new NextRequest('http://localhost/api/ai/deep-research/session-b', { method: 'DELETE' }) as any,
      { params: Promise.resolve({ sessionId: 'session-b' }) }
    )

    await expectDeniedResponse(response as any, 404)
    expect(prisma.deepResearchSession.update).not.toHaveBeenCalled()
  })

  it('GET /api/ai/deep-research/[sessionId]/progress returns 404 for foreign session', async () => {
    vi.mocked(requireCoach).mockResolvedValue({ id: 'coach-a', role: 'COACH' } as any)
    vi.mocked(prisma.deepResearchSession.findFirst).mockResolvedValue(null as any)

    const response = await getDeepResearchProgress(
      new NextRequest('http://localhost/api/ai/deep-research/session-b/progress') as any,
      { params: Promise.resolve({ sessionId: 'session-b' }) }
    )

    expect(response.status).toBe(404)
  })

  it('POST /api/ai/conversations returns 404 for foreign athleteId', async () => {
    vi.mocked(requireCoach).mockResolvedValue({ id: 'coach-a', role: 'COACH' } as any)
    vi.mocked(canAccessClient).mockResolvedValue(false)

    const request = new Request('http://localhost/api/ai/conversations', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        modelUsed: 'gpt-4.1',
        provider: 'OPENAI',
        athleteId: '11111111-1111-4111-8111-111111111111',
      }),
    })
    const response = await postAiConversations(request as any)

    await expectDeniedResponse(response as any, 404, ['conversation'])
    expect(prisma.aIConversation.create).not.toHaveBeenCalled()
  })

  it('DELETE /api/ai/memory/[clientId] returns 404 for foreign client', async () => {
    vi.mocked(requireCoach).mockResolvedValue({ id: 'coach-a', role: 'COACH' } as any)
    vi.mocked(canAccessClient).mockResolvedValue(false)

    const request = new Request(
      'http://localhost/api/ai/memory/11111111-1111-4111-8111-111111111111?memoryId=mem-1',
      { method: 'DELETE' }
    )
    const response = await deleteAiMemory(request as any, {
      params: Promise.resolve({ clientId: '11111111-1111-4111-8111-111111111111' }),
    })

    await expectDeniedResponse(response as any, 404, ['success'])
    expect(prisma.conversationMemory.delete).not.toHaveBeenCalled()
  })

  it('POST /api/care-team/threads denies ATHLETE for foreign clientId', async () => {
    vi.mocked(getCurrentUser).mockResolvedValue({ id: 'athlete-a', role: 'ATHLETE' } as any)
    vi.mocked(canAccessClient).mockResolvedValue(false)

    const request = new Request('http://localhost/api/care-team/threads', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        clientId: '11111111-1111-4111-8111-111111111111',
        subject: 'Need support',
        priority: 'NORMAL',
      }),
    })
    const response = await postCareTeamThreads(request as any)

    await expectDeniedResponse(response as any, 403, ['id', 'client'])
    expect(prisma.careTeamThread.findUnique).not.toHaveBeenCalled()
  })

  it('POST /api/care-team/threads returns consistent 403 shape across foreign clientIds', async () => {
    vi.mocked(getCurrentUser).mockResolvedValue({ id: 'athlete-a', role: 'ATHLETE' } as any)
    vi.mocked(canAccessClient).mockResolvedValue(false)

    const responseA = await postCareTeamThreads(
      new Request('http://localhost/api/care-team/threads', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          clientId: '11111111-1111-4111-8111-111111111111',
          subject: 'Need support',
          priority: 'NORMAL',
        }),
      }) as any
    )
    const responseB = await postCareTeamThreads(
      new Request('http://localhost/api/care-team/threads', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          clientId: '22222222-2222-4222-8222-222222222222',
          subject: 'Need support',
          priority: 'NORMAL',
        }),
      }) as any
    )

    await expectDeniedResponse(responseA as any, 403, ['id'])
    await expectDeniedResponse(responseB as any, 403, ['id'])
  })

  it('GET /api/physio/rehab-programs/[id]/progress denies ATHLETE for foreign program', async () => {
    vi.mocked(getCurrentUser).mockResolvedValue({ id: 'athlete-a', role: 'ATHLETE' } as any)
    vi.mocked(prisma.rehabProgram.findUnique).mockResolvedValue({
      id: 'program-1',
      clientId: 'client-b',
      physioUserId: 'physio-a',
    } as any)
    vi.mocked(canAccessClient).mockResolvedValue(false)

    const request = new NextRequest('http://localhost/api/physio/rehab-programs/program-1/progress')
    const response = await getRehabProgress(request as any, {
      params: Promise.resolve({ id: 'program-1' }),
    })

    await expectDeniedResponse(response as any, 403, ['logs', 'total'])
    expect(prisma.rehabProgressLog.findMany).not.toHaveBeenCalled()
    expect(prisma.rehabProgressLog.count).not.toHaveBeenCalled()
  })

  it('GET /api/physio/rehab-programs/[id] denies COACH for foreign athlete program', async () => {
    vi.mocked(getCurrentUser).mockResolvedValue({ id: 'coach-a', role: 'COACH' } as any)
    vi.mocked(prisma.rehabProgram.findUnique).mockResolvedValue({
      id: 'program-1',
      clientId: 'client-b',
      physioUserId: 'physio-a',
    } as any)
    vi.mocked(canAccessClient).mockResolvedValue(false)

    const request = new NextRequest('http://localhost/api/physio/rehab-programs/program-1')
    const response = await getRehabProgramDetail(request as any, {
      params: Promise.resolve({ id: 'program-1' }),
    })

    await expectDeniedResponse(response as any, 403, ['client', 'exercises'])
  })

  it('GET /api/physio/restrictions/[id] denies ATHLETE for foreign restriction', async () => {
    vi.mocked(getCurrentUser).mockResolvedValue({ id: 'athlete-a', role: 'ATHLETE' } as any)
    vi.mocked(prisma.trainingRestriction.findUnique).mockResolvedValue({
      id: 'restriction-1',
      clientId: 'client-b',
      createdById: 'physio-a',
    } as any)
    vi.mocked(canAccessClient).mockResolvedValue(false)

    const request = new NextRequest('http://localhost/api/physio/restrictions/restriction-1')
    const response = await getPhysioRestrictionDetail(request as any, {
      params: Promise.resolve({ id: 'restriction-1' }),
    })

    await expectDeniedResponse(response as any, 403, ['client', 'injury'])
  })

  it('POST /api/agent/execute denies foreign clientId execution', async () => {
    vi.mocked(getCurrentUser).mockResolvedValue({ id: 'coach-a', role: 'COACH' } as any)
    vi.mocked(canAccessAthleteScoped).mockResolvedValue({ allowed: false } as any)

    const request = new Request('http://localhost/api/agent/execute', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ clientId: 'client-b' }),
    })
    const response = await postAgentExecute(request as any)

    await expectDeniedResponse(response as any, 403)
  })

  it('POST /api/agent/execute denies foreign actionId execution', async () => {
    vi.mocked(getCurrentUser).mockResolvedValue({ id: 'coach-a', role: 'COACH' } as any)
    vi.mocked(prisma.agentAction.findUnique).mockResolvedValue({
      id: 'action-1',
      clientId: 'client-b',
    } as any)
    vi.mocked(canAccessAthleteScoped).mockResolvedValue({ allowed: false } as any)

    const request = new Request('http://localhost/api/agent/execute', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ actionId: 'action-1' }),
    })
    const response = await postAgentExecute(request as any)

    await expectDeniedResponse(response as any, 403)
  })

  it('GET /api/race-results denies foreign clientId', async () => {
    vi.mocked(canAccessAthleteScoped).mockResolvedValue({ allowed: false } as any)

    const response = await getRaceResults(
      new NextRequest('http://localhost/api/race-results?clientId=client-b') as any
    )

    await expectDeniedResponse(response as any, 403)
    expect(prisma.raceResult.findMany).not.toHaveBeenCalled()
  })

  it('POST /api/race-results denies foreign clientId', async () => {
    vi.mocked(canAccessAthleteScoped).mockResolvedValue({ allowed: false } as any)

    const response = await postRaceResults(
      new Request('http://localhost/api/race-results', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          clientId: 'client-b',
          raceDate: '2026-02-09T00:00:00.000Z',
          distance: '5K',
          timeMinutes: 22,
        }),
      }) as any
    )

    await expectDeniedResponse(response as any, 403)
    expect(prisma.raceResult.create).not.toHaveBeenCalled()
  })

  it('GET /api/race-results/[id] returns 404 for foreign race result', async () => {
    vi.mocked(prisma.raceResult.findUnique).mockResolvedValue({
      id: 'race-1',
      clientId: 'client-b',
    } as any)
    vi.mocked(canAccessClient).mockResolvedValue(false)

    const response = await getRaceResultDetail(
      new NextRequest('http://localhost/api/race-results/race-1') as any,
      { params: Promise.resolve({ id: 'race-1' }) }
    )

    await expectDeniedResponse(response as any, 404)
  })

  it('DELETE /api/race-results/[id] returns 404 for foreign race result', async () => {
    vi.mocked(prisma.raceResult.findUnique).mockResolvedValue({
      id: 'race-1',
      clientId: 'client-b',
      usedForZones: false,
    } as any)
    vi.mocked(canAccessClient).mockResolvedValue(false)

    const response = await deleteRaceResult(
      new NextRequest('http://localhost/api/race-results/race-1', { method: 'DELETE' }) as any,
      { params: Promise.resolve({ id: 'race-1' }) }
    )

    await expectDeniedResponse(response as any, 404)
    expect(prisma.raceResult.delete).not.toHaveBeenCalled()
  })

  it('GET /api/hybrid-assignments denies foreign athleteId filter', async () => {
    vi.mocked(getCurrentUser).mockResolvedValue({ id: 'coach-a', role: 'COACH' } as any)
    vi.mocked(canAccessAthleteScoped).mockResolvedValue({ allowed: false } as any)

    const response = await getHybridAssignments(
      new NextRequest('http://localhost/api/hybrid-assignments?athleteId=client-b') as any
    )

    await expectDeniedResponse(response as any, 403)
    expect(prisma.hybridWorkoutAssignment.findMany).not.toHaveBeenCalled()
  })

  it('POST /api/hybrid-assignments denies when athleteIds include foreign athlete', async () => {
    vi.mocked(requireCoach).mockResolvedValue({ id: 'coach-a', role: 'COACH' } as any)
    vi.mocked(prisma.hybridWorkout.findFirst).mockResolvedValue({
      id: 'workout-1',
      name: 'Hybrid Test',
      coachId: 'coach-a',
      isPublic: false,
    } as any)
    vi.mocked(canAccessAthleteScoped).mockImplementation(async (_userId, athleteId) => ({
      allowed: athleteId !== 'client-b',
    }) as any)

    const response = await postHybridAssignments(
      new Request('http://localhost/api/hybrid-assignments', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          workoutId: 'workout-1',
          athleteIds: ['client-a', 'client-b'],
          assignedDate: '2026-02-09',
        }),
      }) as any
    )

    await expectDeniedResponse(response as any, 403)
    expect(prisma.hybridWorkoutAssignment.upsert).not.toHaveBeenCalled()
    expect(prisma.$transaction).not.toHaveBeenCalled()
  })
})
