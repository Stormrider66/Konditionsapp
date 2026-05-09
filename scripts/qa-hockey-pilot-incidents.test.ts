import { createRequire } from 'node:module'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const testDir = path.dirname(fileURLToPath(import.meta.url))
const require = createRequire(import.meta.url)
const { INCIDENT_PLAYBOOK, readIncidentPlan, validateIncidentPlan } = require(path.join(testDir, 'qa-hockey-pilot-incidents.cjs'))

describe('qa-hockey-pilot-incidents', () => {
  it('builds the incident plan from env', () => {
    const plan = readIncidentPlan({
      HOCKEY_PILOT_SUPPORT_OWNER: 'Henrik',
      HOCKEY_PILOT_TECHNICAL_OWNER: 'Tech Lead',
      HOCKEY_PILOT_ROLLBACK_OWNER: 'Release Lead',
      HOCKEY_PILOT_INCIDENT_CHANNEL: '#hockey-pilot',
      HOCKEY_PILOT_SUPPORT_NOTES_URL: 'https://notes.example.com/hockey-pilot',
      HOCKEY_PILOT_OPEN_CRITICAL_ISSUES: '0',
    })

    expect(plan).toMatchObject({
      supportOwner: 'Henrik',
      technicalOwner: 'Tech Lead',
      rollbackOwner: 'Release Lead',
      incidentChannel: '#hockey-pilot',
      supportNotesUrl: 'https://notes.example.com/hockey-pilot',
      openCriticalIssues: 0,
    })
    expect(plan.playbook).toEqual(INCIDENT_PLAYBOOK)
  })

  it('passes when ownership and support state are ready', () => {
    const validation = validateIncidentPlan(readIncidentPlan({
      HOCKEY_PILOT_SUPPORT_OWNER: 'Henrik',
      HOCKEY_PILOT_TECHNICAL_OWNER: 'Tech Lead',
      HOCKEY_PILOT_ROLLBACK_OWNER: 'Release Lead',
      HOCKEY_PILOT_INCIDENT_CHANNEL: '#hockey-pilot',
      HOCKEY_PILOT_SUPPORT_NOTES_URL: 'https://notes.example.com/hockey-pilot',
      HOCKEY_PILOT_OPEN_CRITICAL_ISSUES: '0',
    }))

    expect(validation).toEqual({
      ok: true,
      errors: [],
    })
  })

  it('fails when incident ownership is incomplete', () => {
    const validation = validateIncidentPlan(readIncidentPlan({
      HOCKEY_PILOT_OPEN_CRITICAL_ISSUES: '2',
    }))

    expect(validation.ok).toBe(false)
    expect(validation.errors).toEqual([
      'Set HOCKEY_PILOT_SUPPORT_OWNER before incident response is ready.',
      'Set HOCKEY_PILOT_TECHNICAL_OWNER before incident response is ready.',
      'Set HOCKEY_PILOT_ROLLBACK_OWNER before incident response is ready.',
      'Set HOCKEY_PILOT_INCIDENT_CHANNEL before incident response is ready.',
      'Set HOCKEY_PILOT_SUPPORT_NOTES_URL before incident response is ready.',
      'Open critical support issues is 2; pause new invites until it is 0.',
    ])
  })

  it('fails invalid critical issue counts clearly', () => {
    const validation = validateIncidentPlan(readIncidentPlan({
      HOCKEY_PILOT_SUPPORT_OWNER: 'Henrik',
      HOCKEY_PILOT_TECHNICAL_OWNER: 'Tech Lead',
      HOCKEY_PILOT_ROLLBACK_OWNER: 'Release Lead',
      HOCKEY_PILOT_INCIDENT_CHANNEL: '#hockey-pilot',
      HOCKEY_PILOT_SUPPORT_NOTES_URL: 'https://notes.example.com/hockey-pilot',
      HOCKEY_PILOT_OPEN_CRITICAL_ISSUES: 'many',
    }))

    expect(validation.errors).toEqual([
      'HOCKEY_PILOT_OPEN_CRITICAL_ISSUES must be a non-negative whole number.',
    ])
  })
})
