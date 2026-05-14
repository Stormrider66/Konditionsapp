import { describe, expect, it } from 'vitest'
import { buildSmokeBalanceUpdate, parseSmokeArgs } from './prepare-ai-billing-smoke'

describe('prepare-ai-billing-smoke', () => {
  it('parses dry-run options from cli args and env fallback', () => {
    expect(parseSmokeArgs(
      ['--budget=0.50', '--remaining=0.10'],
      { TRAINOMICS_QA_ATHLETE_EMAIL: 'athlete@example.com' } as unknown as NodeJS.ProcessEnv,
    )).toEqual({
      email: 'athlete@example.com',
      clientId: undefined,
      budgetSek: 0.5,
      remainingSek: 0.1,
      apply: false,
    })
  })

  it('uses explicit client id and apply flag', () => {
    expect(parseSmokeArgs(
      ['--client-id=client-1', '--budget=1,25', '--remaining=0', '--apply'],
      {} as unknown as NodeJS.ProcessEnv,
    )).toMatchObject({
      clientId: 'client-1',
      budgetSek: 1.25,
      remainingSek: 0,
      apply: true,
    })
  })

  it('builds an exhausted allowance account shape', () => {
    expect(buildSmokeBalanceUpdate({ budgetSek: 0.25, remainingSek: 0 })).toEqual({
      includedBudgetSek: 0.25,
      includedUsedSek: 0.25,
      topUpBalanceSek: 0,
      hardCapSek: 0.25,
      status: 'ACTIVE',
    })
  })

  it('rejects impossible remaining balance', () => {
    expect(() => parseSmokeArgs(['--budget=0.25', '--remaining=1'], {} as unknown as NodeJS.ProcessEnv))
      .toThrow('--remaining cannot be larger than --budget')
  })
})
