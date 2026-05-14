import { NextResponse } from 'next/server'
import {
  getAiAllowanceStatus,
  hasAiAllowanceRemaining,
} from '@/lib/ai/billing/allowance'
import { createAiAllowanceExhaustedBody } from '@/lib/ai/billing/client-errors'

export async function requireAiAllowance(clientId: string): Promise<NextResponse | null> {
  const { account, remainingSek } = await getAiAllowanceStatus(clientId)

  if (account.status !== 'ACTIVE' || !hasAiAllowanceRemaining(account)) {
    return NextResponse.json(
      createAiAllowanceExhaustedBody(remainingSek),
      { status: 402 },
    )
  }

  return null
}
