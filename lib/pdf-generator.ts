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
  const canvas = await html2canvas(element, {
    scale, // Högre skala = bättre kvalitet
    useCORS: true, // För att hantera externa bilder
    logging: false,
    backgroundColor: '#ffffff',
    windowWidth: 1200, // Fast bredd för konsekvent layout
    onclone: (clonedDoc) => {
      // Justera styling för PDF-rendering
      const clonedElement = clonedDoc.querySelector('[data-pdf-content]')
      if (clonedElement instanceof HTMLElement) {
        // Ta bort max-width för att få full bredd i PDF
        clonedElement.style.maxWidth = 'none'
        clonedElement.style.width = '1200px'

        // Säkerställ att alla diagram syns
        const charts = clonedElement.querySelectorAll('.recharts-wrapper')
        charts.forEach((chart) => {
          if (chart instanceof HTMLElement) {
            chart.style.width = '100%'
            chart.style.height = 'auto'
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
