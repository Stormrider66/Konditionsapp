'use client'

import { useState, useRef } from 'react'
import { useLocale } from 'next-intl'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Download, FileSpreadsheet, FileText, Loader2 } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import {
  generateProgramPDFFromElement,
  downloadProgramPDF,
  generateProgramPDFFilename,
} from '@/lib/exports/program-pdf-export'
import { ProgramPDFContent } from '@/components/exports/ProgramPDFContent'
import type { ParsedProgram } from '@/lib/ai/program-parser'

type AppLocale = 'en' | 'sv'

const copy = (locale: AppLocale, en: string, sv: string) => locale === 'sv' ? sv : en

interface ProgramExportButtonProps {
  /** The parsed program data to export */
  program: ParsedProgram
  /** The athlete name for the export */
  athleteName?: string
  /** The coach name for the export */
  coachName?: string
  /** Organization name for PDF branding */
  organization?: string
  /** Start date for the program */
  startDate?: Date
  /** Button variant */
  variant?: 'default' | 'outline' | 'ghost' | 'secondary'
  /** Button size */
  size?: 'default' | 'sm' | 'lg' | 'icon'
}

export function ProgramExportButton({
  program,
  athleteName,
  coachName,
  organization,
  startDate = new Date(),
  variant = 'outline',
  size = 'default',
}: ProgramExportButtonProps) {
  const { toast } = useToast()
  const locale: AppLocale = useLocale() === 'sv' ? 'sv' : 'en'
  const [exporting, setExporting] = useState<'excel' | 'pdf' | null>(null)
  const pdfContentRef = useRef<HTMLDivElement>(null)

  const handleExportExcel = async () => {
    setExporting('excel')
    try {
      const { downloadProgramExcel } = await import('@/lib/exports/program-excel-export')
      await downloadProgramExcel({
        program,
        athleteName,
        coachName,
        startDate,
        locale,
      })
      toast({
        title: copy(locale, 'Excel exported!', 'Excel exporterad!'),
        description: copy(locale, 'The training program has been downloaded as an Excel file.', 'Träningsprogrammet har laddats ner som Excel-fil.'),
      })
    } catch (error) {
      toast({
        title: copy(locale, 'Could not export', 'Kunde inte exportera'),
        description: error instanceof Error ? error.message : copy(locale, 'Unknown error', 'Okänt fel'),
        variant: 'destructive',
      })
    } finally {
      setExporting(null)
    }
  }

  /**
   * Client-side PDF fallback: renders the hidden ProgramPDFContent element
   * via html2canvas + jsPDF. This is the original path; we keep it as a
   * fallback for the server route in case the request fails.
   */
  const exportPdfClientSide = async (): Promise<void> => {
    // Wait a tick for the hidden PDF content to render
    await new Promise((resolve) => setTimeout(resolve, 100))

    const pdfElement = pdfContentRef.current
    if (!pdfElement) {
      throw new Error('PDF content not found')
    }

    const pdfBlob = await generateProgramPDFFromElement(pdfElement, {
      program,
      athleteName,
      coachName,
      organization,
      startDate,
    })

    const filename = generateProgramPDFFilename(program.name)
    downloadProgramPDF(pdfBlob, filename)
  }

  /**
   * Download a PDF blob as a file using a temporary object URL.
   */
  const downloadBlob = (blob: Blob, filename: string): void => {
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  /**
   * Server-side PDF path: POST the already-parsed program to
   * /api/exports/program-pdf and stream the PDF response. This is the
   * default path — it removes the html2canvas CPU burn on the client,
   * which is what times out for large periodized programs on slow
   * devices/connections.
   */
  const exportPdfServerSide = async (): Promise<void> => {
    const response = await fetch('/api/exports/program-pdf', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        program,
        athleteName,
        coachName,
        organization,
        startDate: startDate ? startDate.toISOString() : undefined,
      }),
    })

    if (!response.ok) {
      throw new Error(`Server PDF generation failed (${response.status})`)
    }

    const blob = await response.blob()
    downloadBlob(blob, generateProgramPDFFilename(program.name))
  }

  const handleExportPDF = async () => {
    setExporting('pdf')
    try {
      try {
        await exportPdfServerSide()
      } catch (serverError) {
        console.warn(
          'Server PDF export failed, falling back to client-side generator',
          serverError
        )
        await exportPdfClientSide()
      }

      toast({
        title: copy(locale, 'PDF exported!', 'PDF exporterad!'),
        description: copy(locale, 'The training program has been downloaded as a PDF.', 'Träningsprogrammet har laddats ner som PDF.'),
      })
    } catch (error) {
      toast({
        title: copy(locale, 'Could not export', 'Kunde inte exportera'),
        description: error instanceof Error ? error.message : copy(locale, 'Unknown error', 'Okänt fel'),
        variant: 'destructive',
      })
    } finally {
      setExporting(null)
    }
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant={variant} size={size} disabled={exporting !== null}>
            {exporting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {copy(locale, 'Exporting...', 'Exporterar...')}
              </>
            ) : (
              <>
                <Download className="h-4 w-4 mr-2" />
                {copy(locale, 'Export', 'Exportera')}
              </>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={handleExportExcel} disabled={exporting !== null}>
            <FileSpreadsheet className="h-4 w-4 mr-2" />
            {copy(locale, 'Export to Excel', 'Exportera till Excel')}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleExportPDF} disabled={exporting !== null}>
            <FileText className="h-4 w-4 mr-2" />
            {copy(locale, 'Export to PDF', 'Exportera till PDF')}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Hidden PDF Content for export */}
      <div
        ref={pdfContentRef}
        className="fixed left-[-9999px] top-0"
        aria-hidden="true"
      >
        <ProgramPDFContent
          program={program}
          athleteName={athleteName}
          coachName={coachName}
          organization={organization}
          startDate={startDate}
        />
      </div>
    </>
  )
}
