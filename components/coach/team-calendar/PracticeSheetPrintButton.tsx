'use client'

import { Button } from '@/components/ui/button'
import { Printer } from 'lucide-react'

export function PracticeSheetPrintButton() {
  return (
    <Button type="button" variant="outline" size="sm" onClick={() => window.print()} className="print:hidden">
      <Printer className="mr-1.5 h-4 w-4" />
      Skriv ut
    </Button>
  )
}
