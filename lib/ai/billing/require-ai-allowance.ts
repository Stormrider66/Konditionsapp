import { NextResponse } from 'next/server'
import {
  getAiAllowanceStatus,
  hasAiAllowanceRemaining,
} from '@/lib/ai/billing/allowance'

export async function requireAiAllowance(clientId: string): Promise<NextResponse | null> {
  const { account, remainingSek } = await getAiAllowanceStatus(clientId)

  if (account.status !== 'ACTIVE' || !hasAiAllowanceRemaining(account)) {
    return NextResponse.json(
      {
        error: 'Dina AI-krediter är slut för den här månaden.',
        code: 'AI_ALLOWANCE_EXHAUSTED',
        remainingSek,
      },
      { status: 402 },
    )
  }

  return null
}
