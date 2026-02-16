/**
 * Program PDF Export
 *
 * Generates professional PDF reports from AI-generated training programs.
 * Uses html2canvas + jsPDF pattern from existing PDF generator.
 */

import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import type { ParsedProgram } from '@/lib/ai/program-parser';

export interface ProgramPDFOptions {
  filename?: string;
  quality?: number;
  scale?: number;
  includeAthleteInfo?: boolean;
}

export interface ProgramPDFData {
  program: ParsedProgram;
  athleteName?: string;
  coachName?: string;
  organization?: string;
  startDate?: Date;
}

/**
 * Generate PDF from a rendered HTML element
 */
export async function generateProgramPDFFromElement(
  element: HTMLElement,
  data: ProgramPDFData,
  options: ProgramPDFOptions = {}
): Promise<Blob> {
  const { quality = 0.95, scale = 2 } = options;

  // Capture HTML as canvas
  const canvas = await html2canvas(element, {
    scale,
    useCORS: true,
    logging: false,
    backgroundColor: '#ffffff',
    windowWidth: 1200,
    onclone: (clonedDoc) => {
      const clonedElement = clonedDoc.querySelector('[data-pdf-content]');
      if (clonedElement instanceof HTMLElement) {
        clonedElement.style.maxWidth = 'none';
        clonedElement.style.width = '1200px';
      }
    },
  });

  // Convert canvas to image
  const imgData = canvas.toDataURL('image/jpeg', quality);

  // Create PDF (A4 format)
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
    compress: true,
  });

  // A4 dimensions in mm
  const pageWidth = 210;
  const pageHeight = 297;
  const margin = 10;

  // Calculate image size to fit page with margin
  const imgWidth = pageWidth - 2 * margin;
  const imgHeight = (canvas.height * imgWidth) / canvas.width;

  let heightLeft = imgHeight;
  let position = margin;

  // Add first page
  pdf.addImage(imgData, 'JPEG', margin, position, imgWidth, imgHeight, '', 'FAST');
  heightLeft -= pageHeight - 2 * margin;

  // Add more pages if content is longer
  while (heightLeft > 0) {
    position = heightLeft - imgHeight + margin;
    pdf.addPage();
    pdf.addImage(imgData, 'JPEG', margin, position, imgWidth, imgHeight, '', 'FAST');
    heightLeft -= pageHeight - 2 * margin;
  }

  // Add metadata
  pdf.setProperties({
    title: `Träningsprogram - ${data.program.name}`,
    subject: 'AI-genererat träningsprogram',
    author: data.coachName || data.organization || 'AI Studio',
    keywords: 'träningsprogram, träning, periodisering',
    creator: data.organization || 'Trainomics',
  });

  return pdf.output('blob');
}

/**
 * Generate filename for program PDF
 */
export function generateProgramPDFFilename(programName: string): string {
  const safeName = programName
    .replace(/[åä]/gi, 'a')
    .replace(/[ö]/gi, 'o')
    .replace(/[^a-zA-Z0-9\s-]/g, '')
    .replace(/\s+/g, '_')
    .substring(0, 50);

  const date = new Date().toISOString().split('T')[0];
  return `Traningsprogram_${safeName}_${date}.pdf`;
}

/**
 * Download PDF blob
 */
export function downloadProgramPDF(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Main function to generate and download program PDF
 * Expects a rendered ProgramPDFContent component in the DOM
 */
export async function generateAndDownloadProgramPDF(
  data: ProgramPDFData,
  options?: ProgramPDFOptions
): Promise<void> {
  // Find the rendered PDF content element
  const element = document.querySelector('[data-program-pdf-content]') as HTMLElement;

  if (!element) {
    throw new Error('Could not find program PDF content element');
  }

  const pdfBlob = await generateProgramPDFFromElement(element, data, options);
  const filename = options?.filename || generateProgramPDFFilename(data.program.name);
  downloadProgramPDF(pdfBlob, filename);
}
