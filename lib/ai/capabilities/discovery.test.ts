import { describe, expect, it } from 'vitest'
import {
  buildAiCapabilityDiscoveryPrompt,
  summarizeAiCapabilitiesForDiscovery,
  type AiCapabilityDiscoveryItem,
} from './discovery'

const capabilities: AiCapabilityDiscoveryItem[] = [
  {
    id: 'listAthletes',
    label: 'List athletes',
    description: 'Find athletes the coach can access.',
    actionType: 'read',
    riskLevel: 'low',
    requiresConfirmation: false,
  },
  {
    id: 'prepareCoachMessageDraft',
    label: 'Send coach message',
    description: 'Send a prepared message after confirmation.',
    actionType: 'send',
    riskLevel: 'high',
    requiresConfirmation: true,
  },
]

describe('AI capability discovery', () => {
  it('summarizes direct and confirmation-required capabilities', () => {
    expect(summarizeAiCapabilitiesForDiscovery(capabilities)).toEqual({
      total: 2,
      direct: 1,
      confirmationRequired: 1,
      byActionType: {
        read: 1,
        navigation: 0,
        write: 0,
        send: 1,
        delete: 0,
        major_edit: 0,
      },
    })
  })

  it('builds a grounded user prompt from the live capability list', () => {
    const prompt = buildAiCapabilityDiscoveryPrompt({
      role: 'COACH',
      locale: 'en',
      operationsEnabled: true,
      pageTitle: 'Coach dashboard',
      capabilities,
    })

    expect(prompt).toContain('What can you do here?')
    expect(prompt).toContain('Page: Coach dashboard')
    expect(prompt).toContain('AI operations beta: enabled')
    expect(prompt).toContain('Summary: 2 available, 1 direct, 1 require confirmation.')
    expect(prompt).toContain('List athletes (listAthletes)')
    expect(prompt).toContain('Send coach message (prepareCoachMessageDraft)')
    expect(prompt).toContain('Do not invent capabilities outside this list.')
  })

  it('explains when no registered capabilities are available', () => {
    const prompt = buildAiCapabilityDiscoveryPrompt({
      role: 'ATHLETE',
      locale: 'en',
      operationsEnabled: false,
      capabilities: [],
    })

    expect(prompt).toContain('No registered capabilities are available right now.')
    expect(prompt).toContain('AI operations beta: not enabled')
  })
})
