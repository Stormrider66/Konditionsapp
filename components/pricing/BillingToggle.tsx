'use client'

/**
 * Billing period toggle for the pricing page.
 *
 * Lives as a tiny client island inside the otherwise server-rendered
 * pricing page. The active period is encoded in the URL (?billing=
 * monthly) so the rest of the page — including all the price tags —
 * stays a server component and pricing cards re-render on navigation
 * rather than via client state.
 */

import { useRouter, useSearchParams } from 'next/navigation'
import { useTransition } from 'react'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'

interface BillingToggleProps {
  isYearly: boolean
  monthlyLabel: string
  yearlyLabel: string
  /** Text for the discount badge when yearly is active, e.g. "-17%". */
  discountLabel: string
}

export function BillingToggle({
  isYearly,
  monthlyLabel,
  yearlyLabel,
  discountLabel,
}: BillingToggleProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [, startTransition] = useTransition()

  const handleChange = (checked: boolean) => {
    const params = new URLSearchParams(searchParams?.toString() ?? '')
    if (checked) {
      // Yearly is the default; drop the param so the URL stays clean.
      params.delete('billing')
    } else {
      params.set('billing', 'monthly')
    }
    const query = params.toString()
    startTransition(() => {
      router.replace(query ? `?${query}` : '?', { scroll: false })
    })
  }

  return (
    <div className="flex items-center justify-center gap-4 mb-12">
      <span
        className={`text-sm font-medium ${!isYearly ? 'text-foreground' : 'text-muted-foreground'}`}
      >
        {monthlyLabel}
      </span>
      <Switch checked={isYearly} onCheckedChange={handleChange} />
      <span
        className={`text-sm font-medium ${isYearly ? 'text-foreground' : 'text-muted-foreground'}`}
      >
        {yearlyLabel}
      </span>
      {isYearly && (
        <Badge
          variant="secondary"
          className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
        >
          {discountLabel}
        </Badge>
      )}
    </div>
  )
}
