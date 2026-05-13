'use client'

import { useRef, useState, type ReactNode, type Ref } from 'react'
import Image from 'next/image'
import {
  Activity,
  Clock,
  Download,
  Dumbbell,
  Flame,
  Layers,
  ListChecks,
  Loader2,
  Printer,
  Target,
  Wind,
  Zap,
  type LucideIcon,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useBusinessBrandingOptional } from '@/lib/contexts/BusinessBrandingContext'
import type { PrintableWorkout } from '@/lib/workout-print/normalize'

interface PrintableWorkoutSheetProps {
  workout: PrintableWorkout
}

type PdfOrientation = 'portrait' | 'landscape'

function getWorkoutTotals(workout: PrintableWorkout) {
  const sectionCount = workout.sections.length
  const exerciseCount = workout.sections.reduce((total, section) => total + section.items.length, 0)
  return { sectionCount, exerciseCount }
}

function getSectionIcon(title: string): LucideIcon {
  const t = title.toLowerCase()
  if (t.includes('uppvärm') || t.includes('warmup') || t.includes('warm up')) return Flame
  if (t.includes('nedvarv') || t.includes('cooldown') || t.includes('cool down')) return Wind
  if (t.includes('core')) return Target
  if (t.includes('metcon')) return Zap
  if (t.includes('styrka') || t.includes('huvudpass') || t.includes('main') || t.includes('strength')) return Dumbbell
  if (t.includes('intervall') || t.includes('interval') || t.includes('passupp')) return Activity
  return ListChecks
}

interface StatCardProps {
  icon: LucideIcon
  label: string
  value: string
  brandColor: string
}

function StatCard({ icon: Icon, label, value, brandColor }: StatCardProps) {
  return (
    <div className="flex items-center gap-2.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-left print:px-2 print:py-1.5">
      <div
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md print:h-6 print:w-6"
        style={{ backgroundColor: `${brandColor}1a`, color: brandColor }}
      >
        <Icon className="h-3.5 w-3.5 print:h-3 print:w-3" strokeWidth={2.25} />
      </div>
      <div className="min-w-0">
        <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-slate-500 print-small">{label}</p>
        <p className="truncate text-sm font-bold leading-tight text-slate-950 print-small">{value}</p>
      </div>
    </div>
  )
}


function buildPdfFilename(title: string, orientation: PdfOrientation) {
  const safeTitle = title
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '_')
    .slice(0, 60) || 'workout'
  return orientation === 'landscape' ? `${safeTitle}_liggande.pdf` : `${safeTitle}.pdf`
}

interface PrintableWorkoutDocumentProps {
  workout: PrintableWorkout
  sheetRef?: Ref<HTMLElement>
  footer?: ReactNode
}

export function PrintableWorkoutDocument({ workout, sheetRef, footer }: PrintableWorkoutDocumentProps) {
  const branding = useBusinessBrandingOptional()
  const printedDate = new Date().toLocaleDateString('sv-SE', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
  const { sectionCount, exerciseCount } = getWorkoutTotals(workout)
  const businessName = branding?.businessName || 'Trainomics'
  const brandInitial = businessName.trim().charAt(0).toUpperCase() || 'T'
  const brandColor = branding?.primaryColor || '#0f172a'

  return (
    <main
      ref={sheetRef}
      data-workout-pdf-sheet
      className="print-sheet mx-auto max-w-4xl rounded-lg border bg-white p-8 shadow-sm"
    >
      <header className="print-avoid-break border-b border-slate-300 pb-5 print:pb-3">
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-6 print:gap-4">
          {branding?.logoUrl ? (
            <Image
              src={branding.logoUrl}
              alt={`${businessName} logo`}
              width={44}
              height={44}
              unoptimized
              className="h-11 w-11 shrink-0 justify-self-start rounded-lg object-contain shadow-sm ring-1 ring-slate-200 print:h-9 print:w-9"
            />
          ) : (
            <div
              className="flex h-11 w-11 shrink-0 items-center justify-center justify-self-start rounded-lg text-base font-bold text-white shadow-sm ring-1 ring-black/5 print:h-9 print:w-9 print:text-sm"
              style={{ backgroundColor: brandColor }}
            >
              {brandInitial}
            </div>
          )}
          <div className="min-w-0 text-center">
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500 print-small">
              Träningspass · {workout.kindLabel}
            </p>
            <h1 className="mt-1 text-3xl font-bold leading-tight text-slate-950 print:text-[20pt]">
              {workout.title}
            </h1>
            <div
              className="mx-auto mt-2 h-[3px] w-12 rounded-full print:mt-1.5 print:h-[2px] print:w-10"
              style={{ backgroundColor: brandColor }}
            />
          </div>
          <div className="shrink-0 justify-self-end text-right text-xs text-slate-500">
            <p className="font-semibold uppercase tracking-wide">Utskriven</p>
            <p className="mt-1 text-slate-900">{printedDate}</p>
            {workout.dateLabel && (
              <>
                <p className="mt-2 font-semibold uppercase tracking-wide">Planerat</p>
                <p className="mt-1 max-w-32 text-slate-900">{workout.dateLabel}</p>
              </>
            )}
            {workout.scheduleLabel && (
              <>
                <p className="mt-2 font-semibold uppercase tracking-wide">Tid/plats</p>
                <p className="mt-1 max-w-32 text-slate-900">{workout.scheduleLabel}</p>
              </>
            )}
            {workout.organizationName && (
              <>
                <p className="mt-2 font-semibold uppercase tracking-wide">Organisation</p>
                <p className="mt-1 max-w-32 text-slate-900">{workout.organizationName}</p>
              </>
            )}
            {workout.teamName && (
              <>
                <p className="mt-2 font-semibold uppercase tracking-wide">Lag</p>
                <p className="mt-1 max-w-32 text-slate-900">{workout.teamName}</p>
              </>
            )}
            {workout.athleteName && (
              <>
                <p className="mt-2 font-semibold uppercase tracking-wide">Aktiv</p>
                <p className="mt-1 max-w-32 text-slate-900">{workout.athleteName}</p>
              </>
            )}
          </div>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4 print:mt-3 print:grid-cols-4">
          <StatCard icon={Dumbbell} label="Typ" value={workout.kindLabel} brandColor={brandColor} />
          <StatCard
            icon={Clock}
            label="Tid"
            value={workout.durationLabel || '—'}
            brandColor={brandColor}
          />
          <StatCard
            icon={ListChecks}
            label="Moment"
            value={String(exerciseCount)}
            brandColor={brandColor}
          />
          <StatCard
            icon={Layers}
            label="Sektioner"
            value={String(sectionCount)}
            brandColor={brandColor}
          />
        </div>

        {workout.description && (
          <p className="mt-4 max-w-4xl whitespace-pre-wrap border-l-2 border-slate-300 pl-3 text-sm leading-5 text-slate-700 print:mt-3 print-small">
            {workout.description}
          </p>
        )}

        {workout.assignmentNotes && (
          <p className="mt-3 max-w-4xl whitespace-pre-wrap rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm leading-5 text-slate-700 print-small">
            {workout.assignmentNotes}
          </p>
        )}

        {workout.tags && workout.tags.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {workout.tags.map((tag) => (
              <span key={tag} className="rounded border border-slate-200 px-2 py-0.5 text-xs font-medium text-slate-600 print-small">
                {tag}
              </span>
            ))}
          </div>
        )}
      </header>

      <div className="print-page-tight mt-6 space-y-6 print:mt-3">
        {workout.sections.length === 0 ? (
          <p className="text-sm text-slate-500">Det finns inget detaljerat passinnehåll att skriva ut ännu.</p>
        ) : (
          workout.sections.map((section) => {
            const SectionIcon = getSectionIcon(section.title)
            return (
              <section key={section.title} className="print-section print-avoid-break">
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-t-md bg-slate-950 px-3 py-2 text-white print:px-2 print:py-1.5">
                  <div className="flex min-w-0 items-center gap-2.5">
                    <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-white/10 ring-1 ring-white/15 print:h-5 print:w-5">
                      <SectionIcon className="h-3.5 w-3.5 print:h-3 print:w-3" strokeWidth={2.25} />
                    </span>
                    <h2 className="text-sm font-bold uppercase tracking-[0.18em]">{section.title}</h2>
                    {section.subtitle && (
                      <p className="truncate text-xs text-slate-300 print-small">· {section.subtitle}</p>
                    )}
                  </div>
                  <span className="shrink-0 rounded-full bg-white/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white print-small">
                    {section.items.length} moment
                  </span>
                </div>
                {section.notes && (
                  <p className="whitespace-pre-wrap border-x border-b border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 print:px-2 print:py-1 print-small">
                    {section.notes}
                  </p>
                )}
                <div className="divide-y divide-slate-200 rounded-b-md border-x border-b border-slate-200">
                  <div className="hidden grid-cols-[32px_minmax(0,1.2fr)_minmax(150px,0.95fr)_minmax(0,1fr)] gap-3 bg-slate-50 px-3 py-2 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500 sm:grid print:grid print:px-2 print:py-1 print-small">
                    <span>#</span>
                    <span>Moment</span>
                    <span>Dosering</span>
                    <span>Instruktion</span>
                  </div>
                  {section.items.map((item, index) => (
                    <div
                      key={`${item.title}-${index}`}
                      className="print-row print-avoid-break grid gap-2 px-3 py-3 text-sm sm:grid-cols-[32px_minmax(0,1.2fr)_minmax(150px,0.95fr)_minmax(0,1fr)] sm:gap-3 print:px-2"
                    >
                      <div
                        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white shadow-sm print:h-5 print:w-5 print:text-[7pt] print:shadow-none"
                        style={{ backgroundColor: brandColor }}
                      >
                        {index + 1}
                      </div>
                      <h3 className="print-row-title min-w-0 font-semibold leading-snug text-slate-950">
                        {item.title}
                      </h3>
                      <div className="flex min-w-0 flex-wrap items-start gap-1">
                        {item.details.length > 0 ? (
                          item.details.map((detail, detailIndex) => (
                            <span
                              key={detailIndex}
                              className="inline-flex items-center rounded-md border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-xs font-medium text-slate-700 print-small"
                            >
                              {detail}
                            </span>
                          ))
                        ) : (
                          <span className="text-sm text-slate-400">—</span>
                        )}
                      </div>
                      <p className="min-w-0 whitespace-pre-wrap text-sm leading-5 text-slate-600 print-small">
                        {item.notes || ' '}
                      </p>
                    </div>
                  ))}
                </div>
              </section>
            )
          })
        )}
      </div>

      {footer}
    </main>
  )
}

export function PrintableWorkoutSheet({ workout }: PrintableWorkoutSheetProps) {
  const sheetRef = useRef<HTMLElement | null>(null)
  const [isExportingPdf, setIsExportingPdf] = useState(false)
  const [pdfOrientation, setPdfOrientation] = useState<PdfOrientation>('portrait')
  const businessName = useBusinessBrandingOptional()?.businessName || 'Trainomics'

  const handleDownloadPdf = async () => {
    if (!sheetRef.current) return

    setIsExportingPdf(true)
    try {
      const [{ jsPDF }, { default: html2canvas }] = await Promise.all([
        import('jspdf'),
        import('html2canvas-pro'),
      ])
      const isLandscape = pdfOrientation === 'landscape'
      const captureWidth = isLandscape ? 1200 : 900
      const canvas = await html2canvas(sheetRef.current, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        windowWidth: captureWidth,
        onclone: (clonedDoc) => {
          const clonedSheet = clonedDoc.querySelector('[data-workout-pdf-sheet]')
          if (clonedSheet instanceof HTMLElement) {
            clonedSheet.style.boxShadow = 'none'
            clonedSheet.style.border = '0'
            clonedSheet.style.maxWidth = 'none'
            clonedSheet.style.width = `${captureWidth}px`
          }
        },
      })

      const pdf = new jsPDF({
        orientation: pdfOrientation,
        unit: 'mm',
        format: 'a4',
        compress: true,
      })
      const pageWidth = isLandscape ? 297 : 210
      const pageHeight = isLandscape ? 210 : 297
      const margin = 6
      const maxImgWidth = pageWidth - margin * 2
      const maxImgHeight = pageHeight - margin * 2
      const imgWidth = maxImgWidth
      const imgHeight = (canvas.height * imgWidth) / canvas.width
      const imgData = canvas.toDataURL('image/jpeg', 0.96)
      const onePageScale = Math.min(1, maxImgHeight / imgHeight)

      if (onePageScale >= 0.68) {
        const fittedWidth = imgWidth * onePageScale
        const fittedHeight = imgHeight * onePageScale
        const x = (pageWidth - fittedWidth) / 2
        const y = margin

        pdf.addImage(imgData, 'JPEG', x, y, fittedWidth, fittedHeight, '', 'FAST')
      } else {
        let heightLeft = imgHeight
        let position = margin
        pdf.addImage(imgData, 'JPEG', margin, position, imgWidth, imgHeight, '', 'FAST')
        heightLeft -= maxImgHeight

        while (heightLeft > 0) {
          position = heightLeft - imgHeight + margin
          pdf.addPage()
          pdf.addImage(imgData, 'JPEG', margin, position, imgWidth, imgHeight, '', 'FAST')
          heightLeft -= maxImgHeight
        }
      }

      pdf.setProperties({
        title: workout.title,
        subject: 'Workout sheet',
        author: businessName,
        creator: businessName,
      })
      pdf.save(buildPdfFilename(workout.title, pdfOrientation))
    } finally {
      setIsExportingPdf(false)
    }
  }

  return (
    <div className="workout-print-root min-h-screen bg-slate-100 py-6 print:min-h-0 print:bg-white print:py-0">
      <style jsx global>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 6mm;
          }
          html,
          body {
            background: white !important;
            color: #0f172a !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          body * {
            visibility: hidden !important;
          }
          .workout-print-root,
          .workout-print-root * {
            visibility: visible !important;
          }
          .workout-print-root {
            left: 0 !important;
            margin: 0 !important;
            position: absolute !important;
            top: 0 !important;
            width: 100% !important;
          }
          .print-hidden {
            display: none !important;
            visibility: hidden !important;
          }
          .print-sheet {
            box-shadow: none !important;
            border: 0 !important;
            padding: 0 !important;
            max-width: none !important;
            border-radius: 0 !important;
            font-size: 9.5pt !important;
          }
          .print-avoid-break {
            break-inside: avoid;
          }
          .print-page-tight {
            gap: 8px !important;
          }
          .print-section {
            margin-top: 8px !important;
          }
          .print-row {
            grid-template-columns: 22px minmax(0, 1.2fr) minmax(130px, 0.95fr) minmax(0, 1fr) !important;
            min-height: 24px !important;
            padding: 5px 0 !important;
          }
          .print-row-title {
            font-size: 9.6pt !important;
            line-height: 1.2 !important;
          }
          .print-small {
            font-size: 8pt !important;
            line-height: 1.25 !important;
          }
          .print-page-break {
            break-after: page;
          }
        }
      `}</style>

      <div className="print-hidden mx-auto mb-4 flex max-w-4xl flex-wrap items-center justify-between gap-3 px-4">
        <div>
          <p className="text-sm font-medium text-slate-900">Förhandsgranskning</p>
          <p className="text-xs text-slate-500">Använd ren PDF om webbläsaren lägger till adress, datum eller sidnummer.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center rounded-md border border-slate-200 bg-white p-1 text-sm shadow-sm" aria-label="PDF-layout">
            <Button
              type="button"
              variant={pdfOrientation === 'portrait' ? 'secondary' : 'ghost'}
              size="sm"
              className="h-8 px-3"
              aria-pressed={pdfOrientation === 'portrait'}
              onClick={() => setPdfOrientation('portrait')}
            >
              Stående
            </Button>
            <Button
              type="button"
              variant={pdfOrientation === 'landscape' ? 'secondary' : 'ghost'}
              size="sm"
              className="h-8 px-3"
              aria-pressed={pdfOrientation === 'landscape'}
              onClick={() => setPdfOrientation('landscape')}
            >
              Liggande
            </Button>
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={handleDownloadPdf}
            disabled={isExportingPdf}
            className="gap-2"
          >
            {isExportingPdf ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            Ren PDF
          </Button>
          <Button onClick={() => window.print()} className="gap-2">
            <Printer className="h-4 w-4" />
            Skriv ut
          </Button>
        </div>
      </div>

      <PrintableWorkoutDocument workout={workout} sheetRef={sheetRef} />
    </div>
  )
}
