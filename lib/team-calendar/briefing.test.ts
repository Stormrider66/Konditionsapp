import { describe, expect, it } from 'vitest'
import {
  buildTeamCalendarBriefing,
  getTeamCalendarLoadLevel,
  teamCalendarEventNeedsContent,
  teamCalendarEventReadyToAssign,
  type TeamCalendarBriefingEvent,
} from '@/lib/team-calendar/briefing'

const team = { id: 'team-1', name: 'Piteå Hockey A-lag', sportType: 'TEAM_ICE_HOCKEY' }

function event(overrides: Partial<TeamCalendarBriefingEvent>): TeamCalendarBriefingEvent {
  return {
    id: overrides.id ?? 'event-1',
    title: overrides.title ?? 'Träning',
    type: overrides.type ?? 'STRENGTH',
    location: overrides.location ?? null,
    startDate: overrides.startDate ?? new Date('2026-05-18T15:00:00.000Z'),
    endDate: overrides.endDate ?? new Date('2026-05-18T16:00:00.000Z'),
    allDay: overrides.allDay ?? false,
    contentStatus: overrides.contentStatus ?? 'PLANNED',
    contentOwner: overrides.contentOwner ?? 'physical_trainer',
    practicePlan: overrides.practicePlan ?? null,
    linkedWorkoutId: overrides.linkedWorkoutId ?? null,
    linkedWorkoutName: overrides.linkedWorkoutName ?? null,
    assignedBroadcastId: overrides.assignedBroadcastId ?? null,
    assignmentSummary: overrides.assignmentSummary ?? null,
  }
}

describe('team calendar briefing', () => {
  it('identifies missing physical content, ready sessions, and missing ice plans', () => {
    const briefing = buildTeamCalendarBriefing({
      team,
      rangeStart: new Date('2026-05-18T00:00:00.000Z'),
      rangeEnd: new Date('2026-05-24T23:59:59.999Z'),
      events: [
        event({
          id: 'missing-content',
          title: 'Matchstyrka',
          type: 'STRENGTH',
          contentStatus: 'NEEDS_CONTENT',
        }),
        event({
          id: 'ready',
          title: 'Kondition',
          type: 'CARDIO',
          startDate: new Date('2026-05-19T15:00:00.000Z'),
          endDate: new Date('2026-05-19T16:00:00.000Z'),
          contentStatus: 'CONTENT_READY',
          linkedWorkoutId: 'cardio-1',
          linkedWorkoutName: 'Shift-repeat 4x6',
        }),
        event({
          id: 'ice',
          title: 'Is A',
          type: 'ICE_PRACTICE',
          startDate: new Date('2026-05-20T15:00:00.000Z'),
          endDate: new Date('2026-05-20T16:15:00.000Z'),
        }),
      ],
    })

    expect(briefing.totals.needsContent).toBe(1)
    expect(briefing.totals.readyToAssign).toBe(1)
    expect(briefing.totals.missingIcePlans).toBe(1)
    expect(briefing.nextActions.map((action) => action.type)).toEqual(
      expect.arrayContaining(['build_content', 'assign_ready', 'complete_ice_plan'])
    )
    expect(briefing.summaryText).toContain('1 need content')
    expect(briefing.events.find((item) => item.id === 'ready')?.planningFlags).toContain('Ready to assign')
  })

  it('does not mark assigned physical sessions as missing content', () => {
    const assigned = event({
      contentStatus: 'ASSIGNED',
      linkedWorkoutId: 'strength-1',
      assignedBroadcastId: 'broadcast-1',
    })

    expect(teamCalendarEventNeedsContent(assigned)).toBe(false)
    expect(teamCalendarEventReadyToAssign(assigned)).toBe(false)
  })

  it('warns about physical load the day before a game', () => {
    const briefing = buildTeamCalendarBriefing({
      team,
      rangeStart: new Date('2026-05-18T00:00:00.000Z'),
      rangeEnd: new Date('2026-05-24T23:59:59.999Z'),
      events: [
        event({
          id: 'strength-day-before-game',
          title: 'Tung styrka',
          type: 'STRENGTH',
          startDate: new Date('2026-05-22T15:00:00.000Z'),
          endDate: new Date('2026-05-22T16:15:00.000Z'),
          contentStatus: 'CONTENT_READY',
          linkedWorkoutId: 'strength-1',
        }),
        event({
          id: 'game',
          title: 'Match',
          type: 'GAME',
          startDate: new Date('2026-05-23T15:00:00.000Z'),
          endDate: new Date('2026-05-23T17:00:00.000Z'),
        }),
      ],
    })

    expect(briefing.warnings.some((warning) => warning.includes('Physical work the day before game'))).toBe(true)
  })

  it('keeps Swedish briefing copy when requested', () => {
    const briefing = buildTeamCalendarBriefing({
      team,
      rangeStart: new Date('2026-05-18T00:00:00.000Z'),
      rangeEnd: new Date('2026-05-24T23:59:59.999Z'),
      locale: 'sv',
      events: [
        event({
          id: 'ready',
          title: 'Kondition',
          type: 'CARDIO',
          contentStatus: 'CONTENT_READY',
          linkedWorkoutId: 'cardio-1',
          linkedWorkoutName: 'Shift-repeat 4x6',
        }),
      ],
    })

    expect(briefing.summaryText).toContain('1 är redo att tilldela')
    expect(briefing.events.find((item) => item.id === 'ready')?.planningFlags).toContain('Redo att tilldela')
  })

  it('uses high load level for six or more load points', () => {
    expect(getTeamCalendarLoadLevel(2.9)).toBe('low')
    expect(getTeamCalendarLoadLevel(3)).toBe('moderate')
    expect(getTeamCalendarLoadLevel(6)).toBe('high')
  })
})
