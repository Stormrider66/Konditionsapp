import { NextResponse } from 'next/server'
import {
  getAiAllowanceStatus,
  hasAiAllowanceRemaining,
} from '@/lib/ai/billing/allowance'
import { createAiAllowanceExhaustedBody } from '@/lib/ai/billing/client-errors'

export const AI_ALLOWANCE_MINIMUM_REMAINING_SEK = {
  light: 0.1,
  foodScan: 0.25,
  richAnalysis: 1,
  longRunning: 2,
} as const

interface RequireAiAllowanceOptions {
  minimumRemainingSek?: number
}

export async function requireAiAllowance(
  clientId: string,
  options: RequireAiAllowanceOptions = {},
): Promise<NextResponse | null> {
  const { account, remainingSek } = await getAiAllowanceStatus(clientId)
  const minimumRemainingSek = Math.max(0, options.minimumRemainingSek ?? 0)

  if (
    account.status !== 'ACTIVE' ||
    !hasAiAllowanceRemaining(account) ||
    remainingSek < minimumRemainingSek
  ) {
    return NextResponse.json(
      createAiAllowanceExhaustedBody(remainingSek),
      { status: 402 },
    )
  }

  return null
}
