'use client'

import Image from 'next/image'
import { Printer } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useBusinessBrandingOptional } from '@/lib/contexts/BusinessBrandingContext'
import type { PrintableWorkout } from '@/lib/workout-print/normalize'

interface PrintableWorkoutSheetProps {
  workout: PrintableWorkout
}

function getWorkoutTotals(workout: PrintableWorkout) {
  const sectionCount = workout.sections.length
  const exerciseCount = workout.sections.reduce((total, section) => total + section.items.length, 0)
  return { sectionCount, exerciseCount }
}

export function PrintableWorkoutSheet({ workout }: PrintableWorkoutSheetProps) {
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
        }
      `}</style>

      <div className="print-hidden mx-auto mb-4 flex max-w-4xl items-center justify-between px-4">
        <div>
          <p className="text-sm font-medium text-slate-900">Förhandsgranskning</p>
          <p className="text-xs text-slate-500">Stäng av sidhuvud och sidfot i utskriftsdialogen för ren PDF.</p>
        </div>
        <Button onClick={() => window.print()} className="gap-2">
          <Printer className="h-4 w-4" />
          Skriv ut
        </Button>
      </div>

      <main className="print-sheet mx-auto max-w-4xl rounded-lg border bg-white p-8 shadow-sm">
        <header className="print-avoid-break border-b border-slate-300 pb-5 print:pb-3">
          <div className="flex items-start justify-between gap-6">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-3">
                {branding?.logoUrl ? (
                  <Image
                    src={branding.logoUrl}
                    alt={`${businessName} logo`}
                    width={40}
                    height={40}
                    unoptimized
                    className="h-10 w-10 shrink-0 rounded-md object-contain print:h-8 print:w-8"
                  />
                ) : (
                  <div
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md text-sm font-bold text-white print:h-8 print:w-8"
                    style={{ backgroundColor: brandColor }}
                  >
                    {brandInitial}
                  </div>
                )}
                <div className="min-w-0">
                  <h1 className="text-3xl font-bold leading-tight text-slate-950 print:text-[20pt]">
                    {workout.title}
                  </h1>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2 text-sm text-slate-700 sm:grid-cols-4 print:mt-3 print:grid-cols-4">
                <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 print:px-2 print:py-1">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 print-small">Typ</p>
                  <p className="font-semibold text-slate-950">{workout.kindLabel}</p>
                </div>
                {workout.durationLabel && (
                  <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 print:px-2 print:py-1">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 print-small">Tid</p>
                    <p className="font-semibold text-slate-950">{workout.durationLabel}</p>
                  </div>
                )}
                <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 print:px-2 print:py-1">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 print-small">Innehåll</p>
                  <p className="font-semibold text-slate-950">{exerciseCount} moment</p>
                </div>
                <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 print:px-2 print:py-1">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 print-small">Sektioner</p>
                  <p className="font-semibold text-slate-950">{sectionCount}</p>
                </div>
              </div>
            </div>
            <div className="shrink-0 border-l border-slate-200 pl-5 text-right text-xs text-slate-500 print:pl-3">
              <p className="font-semibold uppercase tracking-wide">Utskriven</p>
              <p className="mt-1 text-slate-900">{printedDate}</p>
              {workout.dateLabel && (
                <>
                  <p className="mt-3 font-semibold uppercase tracking-wide">Planerat</p>
                  <p className="mt-1 max-w-32 text-slate-900">{workout.dateLabel}</p>
                </>
              )}
              {workout.athleteName && (
                <>
                  <p className="mt-3 font-semibold uppercase tracking-wide">Aktiv</p>
                  <p className="mt-1 max-w-32 text-slate-900">{workout.athleteName}</p>
                </>
              )}
            </div>
          </div>

          {workout.description && (
            <p className="mt-4 max-w-4xl whitespace-pre-wrap border-l-2 border-slate-300 pl-3 text-sm leading-5 text-slate-700 print:mt-3 print-small">
              {workout.description}
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
            workout.sections.map((section) => (
              <section key={section.title} className="print-section print-avoid-break">
                <div className="flex flex-wrap items-center justify-between gap-2 rounded-md bg-slate-950 px-3 py-2 text-white print:px-2 print:py-1.5">
                  <h2 className="text-sm font-bold uppercase tracking-wide">{section.title}</h2>
                  {section.subtitle && <p className="text-xs text-slate-200 print-small">{section.subtitle}</p>}
                </div>
                {section.notes && (
                  <p className="whitespace-pre-wrap border-x border-b border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 print:px-2 print:py-1 print-small">
                    {section.notes}
                  </p>
                )}
                <div className="divide-y divide-slate-200 border-x border-b border-slate-200">
                  <div className="hidden grid-cols-[32px_minmax(0,1.2fr)_minmax(150px,0.95fr)_minmax(0,1fr)] gap-3 bg-slate-50 px-3 py-2 text-[10px] font-bold uppercase tracking-wide text-slate-500 sm:grid print:grid print:px-2 print:py-1 print-small">
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
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-900 text-xs font-bold text-white print:h-5 print:w-5 print:text-[7pt]">
                        {index + 1}
                      </div>
                      <h3 className="print-row-title min-w-0 font-semibold leading-snug text-slate-950">
                        {item.title}
                      </h3>
                      <p className="min-w-0 text-sm leading-5 text-slate-700 print-small">
                        {item.details.length > 0 ? item.details.join(' · ') : '-'}
                      </p>
                      <p className="min-w-0 whitespace-pre-wrap text-sm leading-5 text-slate-600 print-small">
                        {item.notes || ' '}
                      </p>
                    </div>
                  ))}
                </div>
              </section>
            ))
          )}
        </div>

        <footer className="print-avoid-break mt-6 border-t border-slate-300 pt-4 text-sm print:mt-3 print:pt-2">
          <p className="font-semibold text-slate-900 print-small">Coachanteckningar</p>
          <div className="mt-2 h-20 rounded-md border border-dashed border-slate-300 print:h-14" />
        </footer>
      </main>
    </div>
  )
}
