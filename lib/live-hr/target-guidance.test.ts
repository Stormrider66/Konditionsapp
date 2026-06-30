import { describe, expect, it } from 'vitest'
import { buildLiveHRTargetGuidance } from './target-guidance'
import type { LiveHRParticipantData, LiveHRWorkflowBlock, LiveHRWorkoutTargetStep } from './types'

function participant(partial: Partial<LiveHRParticipantData>): LiveHRParticipantData {
  return {
    id: 'participant-1',
    clientId: 'client-1',
    clientName: 'Markus',
    heartRate: null,
    zone: null,
    power: null,
    cadence: null,
    powerZone: null,
    machineType: null,
    lastUpdated: null,
    isStale: false,
    joinedAt: new Date(0).toISOString(),
    ...partial,
  }
}

function step(partial: Partial<LiveHRWorkoutTargetStep>): LiveHRWorkoutTargetStep {
  return {
    id: 'step-1',
    index: 0,
    label: 'Bike',
    type: 'INTERVAL',
    ...partial,
  }
}

describe('Live HR target guidance', () => {
  it('marks power as on target inside the watt tolerance', () => {
    const guidance = buildLiveHRTargetGuidance({
      participant: participant({ power: 314 }),
      step: step({ targetPower: 320 }),
      nowMs: 10_000,
    })

    expect(guidance.status).toBe('on')
    expect(guidance.metrics[0]).toMatchObject({
      key: 'power',
      status: 'on',
      actualLabel: '314 W',
      targetLabel: '320 W',
      deltaLabel: '-6 W',
    })
  })

  it('flags high power and low cadence independently', () => {
    const guidance = buildLiveHRTargetGuidance({
      participant: participant({ power: 360, cadence: 86 }),
      step: step({ targetPower: 320, targetCadence: 95 }),
      nowMs: 10_000,
    })

    expect(guidance.status).toBe('high')
    expect(guidance.metrics.map((metric) => [metric.key, metric.status])).toEqual([
      ['power', 'high'],
      ['cadence', 'low'],
    ])
  })

  it('builds countdown progress from active target block', () => {
    const activeBlock: LiveHRWorkflowBlock = {
      id: 'block-1',
      clientId: 'client-1',
      type: 'INTERVAL',
      label: 'Bike',
      sequence: 0,
      startedAt: new Date(1_000).toISOString(),
      endedAt: null,
      stepIndex: 0,
      target: step({ durationSeconds: 60 }),
    }

    const guidance = buildLiveHRTargetGuidance({
      participant: participant({}),
      activeBlock,
      nowMs: 31_000,
    })

    expect(guidance.timer).toMatchObject({
      elapsedSeconds: 30,
      remainingSeconds: 30,
      durationSeconds: 60,
      progress: 0.5,
      isOvertime: false,
    })
  })
})
