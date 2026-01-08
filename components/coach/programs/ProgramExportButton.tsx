'use client'

import { useState, useRef } from 'react'
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
      })
      toast({
        title: 'Excel exporterad!',
        description: 'Träningsprogrammet har laddats ner som Excel-fil.',
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

      toast({
        title: 'PDF exporterad!',
        description: 'Träningsprogrammet har laddats ner som PDF.',
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

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant={variant} size={size} disabled={exporting !== null}>
            {exporting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Exporterar...
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
          <DropdownMenuItem onClick={handleExportExcel} disabled={exporting !== null}>
            <FileSpreadsheet className="h-4 w-4 mr-2" />
            Exportera till Excel
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleExportPDF} disabled={exporting !== null}>
            <FileText className="h-4 w-4 mr-2" />
            Exportera till PDF
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
