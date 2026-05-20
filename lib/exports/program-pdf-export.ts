/**
 * Program PDF Export
 *
 * Generates professional PDF reports from AI-generated training programs.
 * Uses html2canvas + jsPDF pattern from existing PDF generator.
 */

import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas-pro';
import type { ParsedProgram } from '@/lib/ai/program-parser';

type AppLocale = 'en' | 'sv';

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
  locale?: AppLocale;
}

const COPY: Record<AppLocale, {
  titlePrefix: string;
  subject: string;
  keywords: string;
  filenamePrefix: string;
}> = {
  en: {
    titlePrefix: 'Training program',
    subject: 'AI-generated training program',
    keywords: 'training program, training, periodization',
    filenamePrefix: 'TrainingProgram',
  },
  sv: {
    titlePrefix: 'Träningsprogram',
    subject: 'AI-genererat träningsprogram',
    keywords: 'träningsprogram, träning, periodisering',
    filenamePrefix: 'Traningsprogram',
  },
};

function getExportLocale(locale?: string): AppLocale {
  return locale === 'sv' ? 'sv' : 'en';
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
  const locale = getExportLocale(data.locale);
  const copy = COPY[locale];

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
    title: `${copy.titlePrefix} - ${data.program.name}`,
    subject: copy.subject,
    author: data.coachName || data.organization || 'AI Studio',
    keywords: copy.keywords,
    creator: data.organization || '',
  });

  return pdf.output('blob');
}

/**
 * Generate filename for program PDF
 */
export function generateProgramPDFFilename(programName: string, locale?: AppLocale): string {
  const copy = COPY[getExportLocale(locale)];
  const safeName = programName
    .replace(/[åä]/gi, 'a')
    .replace(/[ö]/gi, 'o')
    .replace(/[^a-zA-Z0-9\s-]/g, '')
    .replace(/\s+/g, '_')
    .substring(0, 50);

  const date = new Date().toISOString().split('T')[0];
  return `${copy.filenamePrefix}_${safeName}_${date}.pdf`;
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
  const filename = options?.filename || generateProgramPDFFilename(data.program.name, data.locale);
  downloadProgramPDF(pdfBlob, filename);
}
