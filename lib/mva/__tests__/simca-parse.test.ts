import { describe, it, expect } from 'vitest'
import {
  detectFormat,
  extractSimcaSummaryFromContent,
  validateSimcaImport,
  matchRoster,
} from '../simca-parse'

describe('detectFormat', () => {
  it('uses the file extension first', () => {
    expect(detectFormat('result.json', '{}')).toBe('json')
    expect(detectFormat('result.csv', 'a,b')).toBe('csv')
    expect(detectFormat('result.tsv', 'a\tb')).toBe('csv')
  })

  it('falls back to content sniffing', () => {
    expect(detectFormat('result', '[{"a":1}]')).toBe('json')
    expect(detectFormat('result', 'a;b;c')).toBe('csv')
    expect(detectFormat('result', 'plain text')).toBe('text')
  })
})

describe('extractSimcaSummaryFromContent', () => {
  it('parses athletes and VIP from delimited content with varied column names', () => {
    const csv = [
      'Object,PC1,PC2,HotellingT2,DModX,Outlier',
      'Anna Karlsson,1.2,-0.4,3.1,0.8,0',
      'Björn Ek,-2.1,0.9,5.6,1.4,1',
    ].join('\n')
    const summary = extractSimcaSummaryFromContent(csv, 'csv')
    expect(summary.athletes).toHaveLength(2)
    expect(summary.athletes[0].name).toBe('Anna Karlsson')
    expect(summary.athletes[0].pc1).toBe(1.2)
    expect(summary.athletes[1].isOutlier).toBe(true)
  })

  it('handles decimal commas and semicolon delimiters', () => {
    const csv = 'player;pc1;pc2\nAnna;1,5;0,3'
    const summary = extractSimcaSummaryFromContent(csv, 'csv')
    expect(summary.athletes[0].pc1).toBe(1.5)
    expect(summary.athletes[0].pc2).toBe(0.3)
  })

  it('parses VIP rows from JSON', () => {
    const json = JSON.stringify({
      vip: [
        { variable: 'sprint_10m', vip: 1.8, coefficient: -0.5 },
        { variable: 'vo2max', vip: 0.6, coefficient: 0.2 },
      ],
    })
    const summary = extractSimcaSummaryFromContent(json, 'json')
    expect(summary.vipScores).toHaveLength(2)
    expect(summary.vipScores[0].variableName).toBe('sprint_10m')
    expect(summary.vipScores[0].vip).toBe(1.8)
  })
})

describe('validateSimcaImport', () => {
  it('warns when nothing is recognized', () => {
    const summary = extractSimcaSummaryFromContent('foo,bar\n1,2', 'csv')
    const warnings = validateSimcaImport(summary, 1, 'csv')
    expect(warnings.some((w) => w.code === 'nothing_recognized')).toBe(true)
  })

  it('infos when VIP is missing but athletes parse', () => {
    const csv = 'name,pc1\nAnna,1.0\nBjörn,2.0'
    const summary = extractSimcaSummaryFromContent(csv, 'csv')
    const warnings = validateSimcaImport(summary, 2, 'csv')
    expect(warnings.some((w) => w.code === 'no_vip')).toBe(true)
    expect(warnings.some((w) => w.code === 'nothing_recognized')).toBe(false)
  })

  it('produces no warnings for a complete file', () => {
    const csv = [
      'name,pc1,pc2,outlier',
      'Anna,1.0,0.1,0',
      'Björn,2.0,-0.2,0',
      'variable,vip',
    ].join('\n')
    // Athletes + at least one VIP via a second logical block is awkward in CSV;
    // use JSON to represent both cleanly.
    const json = JSON.stringify({
      scores: [
        { name: 'Anna', pc1: 1.0, pc2: 0.1, outlier: 0 },
        { name: 'Björn', pc1: 2.0, pc2: -0.2, outlier: 0 },
      ],
      vip: [{ variable: 'sprint_10m', vip: 1.5 }],
    })
    expect(validateSimcaImport(extractSimcaSummaryFromContent(json, 'json'), 0, 'json')).toHaveLength(0)
    // csv var only to keep the fixture referenced
    expect(csv.length).toBeGreaterThan(0)
  })
})

describe('matchRoster', () => {
  const summary = extractSimcaSummaryFromContent(
    'name,pc1\nAnna Karlsson,1.0\nBjörn Ek,2.0\nGuest Player,3.0',
    'csv'
  )

  it('matches exact and substring names, reports unmatched on both sides', () => {
    const roster = [
      { id: 'c1', name: 'Anna Karlsson' },
      { id: 'c2', name: 'Björn' }, // substring of "Björn Ek"
      { id: 'c3', name: 'Cecilia Holm' }, // present on roster, absent from file
    ]
    const match = matchRoster(summary.athletes, roster)
    expect(match.matched.map((m) => m.clientId).sort()).toEqual(['c1', 'c2'])
    expect(match.unmatchedSimca).toContain('Guest Player')
    expect(match.unmatchedRoster).toContain('Cecilia Holm')
  })

  it('does not double-assign a roster member', () => {
    const roster = [{ id: 'c1', name: 'Anna' }]
    const dup = extractSimcaSummaryFromContent('name,pc1\nAnna,1\nAnna,2', 'csv')
    const match = matchRoster(dup.athletes, roster)
    // Duplicate SIMCA names collapse to one athlete (unique by key).
    expect(match.matched).toHaveLength(1)
  })
})
