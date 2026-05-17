'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Check, Copy, Printer } from 'lucide-react'
import { toast } from 'sonner'

export function PracticeSheetActions() {
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!copied) return
    const timeout = window.setTimeout(() => setCopied(false), 1800)
    return () => window.clearTimeout(timeout)
  }, [copied])

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href)
      setCopied(true)
      toast.success('Länk kopierad')
    } catch {
      toast.error('Kunde inte kopiera länken')
    }
  }

  return (
    <div className="flex flex-wrap gap-2 print:hidden">
      <Button type="button" variant="outline" size="sm" onClick={copyLink}>
        {copied ? <Check className="mr-1.5 h-4 w-4" /> : <Copy className="mr-1.5 h-4 w-4" />}
        {copied ? 'Kopierad' : 'Kopiera länk'}
      </Button>
      <Button type="button" variant="outline" size="sm" onClick={() => window.print()}>
        <Printer className="mr-1.5 h-4 w-4" />
        Skriv ut
      </Button>
    </div>
  )
}

export function PracticeSheetPrintButton() {
  return <PracticeSheetActions />
}
