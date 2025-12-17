'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Download, FileSpreadsheet, FileText, Loader2, Printer } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

export type SessionType = 'strength' | 'cardio'

interface SessionExportButtonProps {
  /** Type of session */
  sessionType: SessionType
  /** Function to get the current session data */
  getSessionData: () => any
  /** Optional athlete name */
  athleteName?: string
  /** Optional coach name */
  coachName?: string
  /** Button variant */
  variant?: 'default' | 'outline' | 'ghost' | 'secondary'
  /** Button size */
  size?: 'default' | 'sm' | 'lg' | 'icon'
  /** Disabled state */
  disabled?: boolean
}

export function SessionExportButton({
  sessionType,
  getSessionData,
  athleteName,
  coachName,
  variant = 'outline',
  size = 'default',
  disabled = false,
}: SessionExportButtonProps) {
  const { toast } = useToast()
  const [exporting, setExporting] = useState<'excel' | 'pdf' | 'print' | null>(null)

  const handleExportExcel = async () => {
    setExporting('excel')
    try {
      const data = getSessionData()
      if (!data) {
        throw new Error('Inga data att exportera')
      }

      const exportData = {
        ...data,
        athleteName,
        coachName,
        date: new Date(),
      }

      if (sessionType === 'strength') {
        const { downloadStrengthSessionExcel } = await import('@/lib/exports/strength-session-export')
        downloadStrengthSessionExcel(exportData)
      } else {
        const { downloadCardioSessionExcel } = await import('@/lib/exports/cardio-session-export')
        downloadCardioSessionExcel(exportData)
      }

      toast({
        title: 'Excel exporterad!',
        description: 'Passet har laddats ner som Excel-fil.',
      })
    } catch (error) {
      toast({
        title: 'Kunde inte exportera',
        description: error instanceof Error ? error.message : 'Okänt fel',
        variant: 'destructive',
      })
    } finally {
      setExporting(null)
    }
  }

  const handleExportPDF = async () => {
    setExporting('pdf')
    try {
      const data = getSessionData()
      if (!data) {
        throw new Error('Inga data att exportera')
      }

      const exportData = {
        ...data,
        athleteName,
        coachName,
        date: new Date(),
      }

      if (sessionType === 'strength') {
        const { downloadStrengthSessionPDF } = await import('@/lib/exports/strength-session-export')
        downloadStrengthSessionPDF(exportData)
      } else {
        const { downloadCardioSessionPDF } = await import('@/lib/exports/cardio-session-export')
        downloadCardioSessionPDF(exportData)
      }

      toast({
        title: 'PDF exporterad!',
        description: 'Passet har laddats ner som PDF.',
      })
    } catch (error) {
      toast({
        title: 'Kunde inte exportera',
        description: error instanceof Error ? error.message : 'Okänt fel',
        variant: 'destructive',
      })
    } finally {
      setExporting(null)
    }
  }

  const handlePrint = async () => {
    setExporting('print')
    try {
      const data = getSessionData()
      if (!data) {
        throw new Error('Inga data att skriva ut')
      }

      const exportData = {
        ...data,
        athleteName,
        coachName,
        date: new Date(),
      }

      // Generate PDF and open in new window for printing
      let blob: Blob
      if (sessionType === 'strength') {
        const { generateStrengthSessionPDF } = await import('@/lib/exports/strength-session-export')
        blob = generateStrengthSessionPDF(exportData)
      } else {
        const { generateCardioSessionPDF } = await import('@/lib/exports/cardio-session-export')
        blob = generateCardioSessionPDF(exportData)
      }

      const url = URL.createObjectURL(blob)
      const printWindow = window.open(url, '_blank')
      if (printWindow) {
        printWindow.onload = () => {
          printWindow.print()
        }
      }

      toast({
        title: 'Redo att skriva ut',
        description: 'Utskriftsdialogen öppnas...',
      })
    } catch (error) {
      toast({
        title: 'Kunde inte skriva ut',
        description: error instanceof Error ? error.message : 'Okänt fel',
        variant: 'destructive',
      })
    } finally {
      setExporting(null)
    }
  }

  const isExporting = exporting !== null

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant={variant} size={size} disabled={disabled || isExporting}>
          {isExporting ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              {exporting === 'excel' && 'Exporterar Excel...'}
              {exporting === 'pdf' && 'Exporterar PDF...'}
              {exporting === 'print' && 'Förbereder utskrift...'}
            </>
          ) : (
            <>
              <Download className="h-4 w-4 mr-2" />
              Exportera
            </>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={handleExportExcel} disabled={isExporting}>
          <FileSpreadsheet className="h-4 w-4 mr-2" />
          Exportera till Excel
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleExportPDF} disabled={isExporting}>
          <FileText className="h-4 w-4 mr-2" />
          Exportera till PDF
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handlePrint} disabled={isExporting}>
          <Printer className="h-4 w-4 mr-2" />
          Skriv ut
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
