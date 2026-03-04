// lib/pdf-generator.ts
import { jsPDF } from 'jspdf'
import html2canvas from 'html2canvas'
import { ReportData } from '@/types'
import { format } from 'date-fns'

export interface PDFGenerationOptions {
  filename?: string
  quality?: number // 0-1, default 0.95
  scale?: number // default 2 for high quality
}

/**
 * Genererar en PDF från ett HTML-element som innehåller rapporten
 * @param element - HTML-elementet som ska konverteras till PDF
 * @param reportData - Rapport-data för filnamn och metadata
 * @param options - Valfria inställningar för PDF-generering
 * @returns Promise med PDF som Blob
 */
export async function generatePDFFromElement(
  element: HTMLElement,
  reportData: ReportData,
  options: PDFGenerationOptions = {}
): Promise<Blob> {
  const {
    quality = 0.95,
    scale = 2,
  } = options

  // Använd html2canvas för att fånga HTML som bild
  // Detta stödjer svenska tecken och Recharts-diagram perfekt
  // A4 @ 96dpi = 794px bredd, vi använder 800px för bra passning
  const a4Width = 800
  const canvas = await html2canvas(element, {
    scale, // Högre skala = bättre kvalitet
    useCORS: true, // För att hantera externa bilder
    logging: false,
    backgroundColor: '#ffffff',
    windowWidth: a4Width, // Optimerat för A4-format
    onclone: (clonedDoc) => {
      // Justera styling för PDF-rendering
      const clonedElement = clonedDoc.querySelector('[data-pdf-content]')
      if (clonedElement instanceof HTMLElement) {
        // Sätt bredd optimerad för A4
        clonedElement.style.maxWidth = 'none'
        clonedElement.style.width = `${a4Width}px`
        clonedElement.style.padding = '20px'
        clonedElement.style.boxSizing = 'border-box'

        // Säkerställ att alla diagram syns och har rätt storlek
        const charts = clonedElement.querySelectorAll('.recharts-wrapper')
        charts.forEach((chart) => {
          if (chart instanceof HTMLElement) {
            chart.style.width = '100%'
            chart.style.height = 'auto'
            chart.style.minHeight = '300px'
          }
        })

        // Förbättra tabeller för A4
        const tables = clonedElement.querySelectorAll('table')
        tables.forEach((table) => {
          if (table instanceof HTMLElement) {
            table.style.fontSize = '11px'
            table.style.width = '100%'
          }
        })

        // Smart page break: inject spacers to prevent sections from being split
        // A4 usable height = 277mm, content width = 800px → 1 content px = 190/800 = 0.2375mm
        // Page height in content px = 277 / 0.2375 ≈ 1166px
        const pageHeightPx = Math.floor(277 / (190 / a4Width))
        const sections = clonedElement.querySelectorAll('[data-pdf-section]')
        const containerTop = clonedElement.offsetTop
        let cumulativeOffset = 0

        sections.forEach((section) => {
          if (!(section instanceof HTMLElement)) return

          const adjustedTop = section.offsetTop - containerTop + cumulativeOffset
          const sectionHeight = section.offsetHeight
          const adjustedBottom = adjustedTop + sectionHeight

          // Find the next page boundary after the section's top
          const pageEnd = Math.ceil((adjustedTop + 1) / pageHeightPx) * pageHeightPx

          // Check if section spans a page boundary
          if (adjustedBottom > pageEnd && adjustedTop < pageEnd) {
            // Only insert spacer if the section fits on a single page (< 85% of page height)
            if (sectionHeight < pageHeightPx * 0.85) {
              const spacerHeight = pageEnd - adjustedTop + 8 // 8px extra padding
              const spacer = clonedDoc.createElement('div')
              spacer.style.height = `${spacerHeight}px`
              spacer.style.width = '100%'
              spacer.style.flexShrink = '0'
              section.parentElement!.insertBefore(spacer, section)
              cumulativeOffset += spacerHeight
            }
          }
        })
      }
    },
  })

  // Konvertera canvas till bild
  const imgData = canvas.toDataURL('image/jpeg', quality)

  // Skapa PDF med A4-format
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
    compress: true,
  })

  // A4 dimensioner i mm
  const pageWidth = 210
  const pageHeight = 297
  const margin = 10

  // Beräkna bildstorlek för att passa på sidan med marginal
  const imgWidth = pageWidth - (2 * margin)
  const imgHeight = (canvas.height * imgWidth) / canvas.width

  let heightLeft = imgHeight
  let position = margin

  // Lägg till första sidan
  pdf.addImage(imgData, 'JPEG', margin, position, imgWidth, imgHeight, '', 'FAST')
  heightLeft -= (pageHeight - 2 * margin)

  // Lägg till fler sidor om innehållet är längre än en sida
  while (heightLeft > 0) {
    position = heightLeft - imgHeight + margin
    pdf.addPage()
    pdf.addImage(imgData, 'JPEG', margin, position, imgWidth, imgHeight, '', 'FAST')
    heightLeft -= (pageHeight - 2 * margin)
  }

  // Lägg till metadata
  pdf.setProperties({
    title: `Konditionstest - ${reportData.client.name}`,
    subject: 'Konditionstestrapport',
    author: reportData.organization,
    keywords: 'konditionstest, vo2max, träningszoner',
    creator: reportData.organization,
  })

  // Konvertera till Blob
  return pdf.output('blob')
}

/**
 * Genererar ett smart filnamn baserat på rapport-data
 * Format: Konditionstest_NamnNamnsson_2025-09-02.pdf
 */
export function generatePDFFilename(reportData: ReportData): string {
  // Ersätt mellanslag med understreck och ta bort specialtecken
  const clientName = reportData.client.name
    .replace(/\s+/g, '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Ta bort accenter

  const testDate = format(reportData.test.testDate, 'yyyy-MM-dd')

  return `Konditionstest_${clientName}_${testDate}.pdf`
}

/**
 * Laddar ner en PDF-blob till användarens dator
 */
export function downloadPDF(blob: Blob, filename: string): void {
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
 * Huvudfunktion för att generera och ladda ner PDF från rapport-data
 * Detta är den funktion som används av komponenter
 */
export async function generateAndDownloadPDF(
  reportData: ReportData,
  options?: PDFGenerationOptions
): Promise<void> {
  // Hitta rapport-elementet i DOM
  const reportElement = document.querySelector('[data-pdf-content]') as HTMLElement

  if (!reportElement) {
    throw new Error('Kunde inte hitta rapport-element att exportera')
  }

  // Generera PDF
  const pdfBlob = await generatePDFFromElement(reportElement, reportData, options)

  // Generera filnamn
  const filename = options?.filename || generatePDFFilename(reportData)

  // Ladda ner
  downloadPDF(pdfBlob, filename)
}

/**
 * Genererar PDF som base64 string för att skicka via email
 */
export async function generatePDFAsBase64(
  reportData: ReportData,
  options?: PDFGenerationOptions
): Promise<string> {
  // Hitta rapport-elementet i DOM
  const reportElement = document.querySelector('[data-pdf-content]') as HTMLElement

  if (!reportElement) {
    throw new Error('Kunde inte hitta rapport-element att exportera')
  }

  // Generera PDF
  const pdfBlob = await generatePDFFromElement(reportElement, reportData, options)

  // Konvertera Blob till base64
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => {
      const base64 = reader.result as string
      // Ta bort data:application/pdf;base64, prefix
      const base64Data = base64.split(',')[1]
      resolve(base64Data)
    }
    reader.onerror = reject
    reader.readAsDataURL(pdfBlob)
  })
}
