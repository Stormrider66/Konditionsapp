import { describe, expect, it } from 'vitest'
import type { CoachCommandCenterData } from '@/lib/coach/command-center'
import { buildCoachOperatorBriefData } from './proactive-operator'

const stableData: CoachCommandCenterData = {
  summary: {
    totalClients: 4,
    urgentCount: 0,
    reviewCount: 0,
    stableCount: 4,
    activeAlerts: 0,
  },
  queueItems: [],
  recommendations: [],
}

const queueData: CoachCommandCenterData = {
  summary: {
    totalClients: 4,
    urgentCount: 1,
    reviewCount: 1,
    stableCount: 3,
    activeAlerts: 0,
  },
  queueItems: [
    {
      id: 'readiness-athlete-1',
      title: 'Readiness needs a same-day adjustment',
      description: 'Athlete reported 35/100 readiness.',
      priority: 'high',
      category: 'readiness',
      clientName: 'Test Athlete',
      href: '/demo/coach/clients/athlete-1',
      ctaLabel: 'Open profile',
    },
  ],
  recommendations: [],
}

describe('buildCoachOperatorBriefData localization', () => {
  it('uses English copy by default', () => {
    const brief = buildCoachOperatorBriefData(stableData)

    expect(brief.headline).toBe('The coach operator sees a stable situation')
    expect(brief.subheadline).toBe('Keep monitoring readiness, load, and pending feedback.')
    expect(brief.promptSuggestions[0].label).toBe('Weekly summary')
    expect(brief.promptSuggestions[0].prompt).toContain('proactive weekly summary')
  })

  it('preserves Swedish copy when Swedish locale is requested', () => {
    const brief = buildCoachOperatorBriefData(stableData, 'sv')

    expect(brief.headline).toBe('Coachoperatorn ser ett stabilt läge')
    expect(brief.subheadline).toBe('Fortsätt följa readiness, belastning och väntande feedback.')
    expect(brief.promptSuggestions[0].label).toBe('Veckosummering')
    expect(brief.promptSuggestions[0].prompt).toContain('proaktiv veckosummering')
  })

  it('localizes queue prompt focus areas', () => {
    const english = buildCoachOperatorBriefData(queueData)
    const swedish = buildCoachOperatorBriefData(queueData, 'sv')

    expect(english.headline).toBe('1 urgent coach case needs attention')
    expect(english.aiContext.focusAreas).toEqual(['readiness (1)'])
    expect(english.promptSuggestions[0].label).toBe('Urgent brief')
    expect(english.promptSuggestions[0].prompt).toContain('Focus areas: readiness (1)')

    expect(swedish.headline).toBe('1 akut coachärende kräver uppmärksamhet')
    expect(swedish.aiContext.focusAreas).toEqual(['beredskap (1)'])
    expect(swedish.promptSuggestions[0].label).toBe('Akut brief')
    expect(swedish.promptSuggestions[0].prompt).toContain('Fokusområden: beredskap (1)')
  })
})
