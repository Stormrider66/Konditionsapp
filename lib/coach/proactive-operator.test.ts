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
    pendingTestReviews: 0,
    unresolvedPainAlerts: 0,
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
    pendingTestReviews: 0,
    unresolvedPainAlerts: 0,
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

const testReviewData: CoachCommandCenterData = {
  summary: {
    totalClients: 4,
    urgentCount: 0,
    reviewCount: 1,
    stableCount: 3,
    activeAlerts: 0,
    pendingTestReviews: 1,
    unresolvedPainAlerts: 0,
  },
  queueItems: [
    {
      id: 'test-review-test-1',
      title: 'Test data needs review',
      description: 'Test Athlete has a running test that needs approval before program decisions use it.',
      priority: 'medium',
      category: 'testing',
      clientName: 'Test Athlete',
      href: '/demo/coach/tests/test-1#quality-review',
      ctaLabel: 'Review test',
      meta: '1 quality warning',
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

  it('adds pending test approvals to the operator AI context and prompts', () => {
    const brief = buildCoachOperatorBriefData(testReviewData)

    expect(brief.subheadline).toBe('1 test needs coach approval before program decisions use the data.')
    expect(brief.summary.testReviewCount).toBe(1)
    expect(brief.summary.highPriorityTestReviewCount).toBe(0)
    expect(brief.aiContext.focusAreas).toEqual(['test approvals (1)'])
    expect(brief.aiContext.testReview).toEqual({
      count: 1,
      highPriorityCount: 0,
      summary: '1 test needs coach approval before program decisions use the data.',
    })
    expect(brief.promptSuggestions[0].prompt).toContain('pending test approvals')
    expect(brief.promptSuggestions[0].prompt).toContain('Include 1 pending test approval')
  })

  it('localizes pending test approval context in Swedish', () => {
    const brief = buildCoachOperatorBriefData(testReviewData, 'sv')

    expect(brief.subheadline).toBe('1 test behöver coachgodkännande innan datan används i programbeslut.')
    expect(brief.aiContext.focusAreas).toEqual(['testgodkännanden (1)'])
    expect(brief.promptSuggestions[0].prompt).toContain('väntande testgodkännanden')
    expect(brief.promptSuggestions[0].prompt).toContain('Ta med 1 väntande testgodkännande')
  })
})
