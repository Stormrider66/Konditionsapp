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
import { useLocale } from '@/i18n/client'

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
  const locale = useLocale()
  const t = (sv: string, en: string) => locale === 'sv' ? sv : en
  const [exporting, setExporting] = useState<'excel' | 'pdf' | 'print' | null>(null)

  const handleExportExcel = async () => {
    setExporting('excel')
    try {
      const data = getSessionData()
      if (!data) {
        throw new Error(t('Inga data att exportera', 'No data to export'))
      }

      const exportData = {
        ...data,
        athleteName,
        coachName,
        date: new Date(),
        locale,
      }

      if (sessionType === 'strength') {
        const { downloadStrengthSessionExcel } = await import('@/lib/exports/strength-session-export')
        await downloadStrengthSessionExcel(exportData)
      } else {
        const { downloadCardioSessionExcel } = await import('@/lib/exports/cardio-session-export')
        await downloadCardioSessionExcel(exportData)
      }

      toast({
        title: t('Excel exporterad!', 'Excel exported!'),
        description: t('Passet har laddats ner som Excel-fil.', 'The session has been downloaded as an Excel file.'),
      })
    } catch (error) {
      toast({
        title: t('Kunde inte exportera', 'Could not export'),
        description: error instanceof Error ? error.message : t('Okänt fel', 'Unknown error'),
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
        throw new Error(t('Inga data att exportera', 'No data to export'))
      }

      const exportData = {
        ...data,
        athleteName,
        coachName,
        date: new Date(),
        locale,
      }

      if (sessionType === 'strength') {
        const { downloadStrengthSessionPDF } = await import('@/lib/exports/strength-session-export')
        downloadStrengthSessionPDF(exportData)
      } else {
        const { downloadCardioSessionPDF } = await import('@/lib/exports/cardio-session-export')
        downloadCardioSessionPDF(exportData)
      }

      toast({
        title: t('PDF exporterad!', 'PDF exported!'),
        description: t('Passet har laddats ner som PDF.', 'The session has been downloaded as a PDF.'),
      })
    } catch (error) {
      toast({
        title: t('Kunde inte exportera', 'Could not export'),
        description: error instanceof Error ? error.message : t('Okänt fel', 'Unknown error'),
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
        throw new Error(t('Inga data att skriva ut', 'No data to print'))
      }

      const exportData = {
        ...data,
        athleteName,
        coachName,
        date: new Date(),
        locale,
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
        title: t('Redo att skriva ut', 'Ready to print'),
        description: t('Utskriftsdialogen öppnas...', 'The print dialog is opening...'),
      })
    } catch (error) {
      toast({
        title: t('Kunde inte skriva ut', 'Could not print'),
        description: error instanceof Error ? error.message : t('Okänt fel', 'Unknown error'),
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
              {exporting === 'excel' && t('Exporterar Excel...', 'Exporting Excel...')}
              {exporting === 'pdf' && t('Exporterar PDF...', 'Exporting PDF...')}
              {exporting === 'print' && t('Förbereder utskrift...', 'Preparing print...')}
            </>
          ) : (
            <>
              <Download className="h-4 w-4 mr-2" />
              {t('Exportera', 'Export')}
            </>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={handleExportExcel} disabled={isExporting}>
          <FileSpreadsheet className="h-4 w-4 mr-2" />
          {t('Exportera till Excel', 'Export to Excel')}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleExportPDF} disabled={isExporting}>
          <FileText className="h-4 w-4 mr-2" />
          {t('Exportera till PDF', 'Export to PDF')}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handlePrint} disabled={isExporting}>
          <Printer className="h-4 w-4 mr-2" />
          {t('Skriv ut', 'Print')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
