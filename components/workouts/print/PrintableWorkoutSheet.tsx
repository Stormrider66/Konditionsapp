'use client'

import { Printer } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { PrintableWorkout } from '@/lib/workout-print/normalize'

interface PrintableWorkoutSheetProps {
  workout: PrintableWorkout
}

export function PrintableWorkoutSheet({ workout }: PrintableWorkoutSheetProps) {
  return (
    <div className="min-h-screen bg-slate-100 py-6 print:bg-white print:py-0">
      <style jsx global>{`
        @media print {
          @page {
            size: A4;
            margin: 14mm;
          }
          body {
            background: white !important;
          }
          .print-hidden {
            display: none !important;
          }
          .print-sheet {
            box-shadow: none !important;
            border: 0 !important;
            padding: 0 !important;
            max-width: none !important;
          }
          .print-avoid-break {
            break-inside: avoid;
          }
        }
      `}</style>

      <div className="print-hidden mx-auto mb-4 flex max-w-4xl items-center justify-between px-4">
        <div>
          <p className="text-sm font-medium text-slate-900">Förhandsgranskning</p>
          <p className="text-xs text-slate-500">Skriv ut eller spara som PDF från utskriftsdialogen.</p>
        </div>
        <Button onClick={() => window.print()} className="gap-2">
          <Printer className="h-4 w-4" />
          Skriv ut
        </Button>
      </div>

      <main className="print-sheet mx-auto max-w-4xl rounded-lg border bg-white p-8 shadow-sm">
        <header className="border-b pb-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Trainomics</p>
              <h1 className="mt-2 text-3xl font-bold text-slate-950">{workout.title}</h1>
              <div className="mt-3 flex flex-wrap gap-2 text-sm text-slate-600">
                <span className="rounded-full bg-slate-100 px-3 py-1 font-medium text-slate-800">{workout.kindLabel}</span>
                {workout.durationLabel && <span className="rounded-full bg-slate-100 px-3 py-1">{workout.durationLabel}</span>}
                {workout.dateLabel && <span className="rounded-full bg-slate-100 px-3 py-1">{workout.dateLabel}</span>}
                {workout.athleteName && <span className="rounded-full bg-slate-100 px-3 py-1">{workout.athleteName}</span>}
              </div>
            </div>
            <div className="text-right text-xs text-slate-500">
              <p>Utskriven</p>
              <p>{new Date().toLocaleDateString('sv-SE', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
            </div>
          </div>

          {workout.description && (
            <p className="mt-5 max-w-3xl whitespace-pre-wrap text-sm leading-6 text-slate-700">{workout.description}</p>
          )}

          {workout.tags && workout.tags.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-1.5">
              {workout.tags.map((tag) => (
                <span key={tag} className="rounded border border-slate-200 px-2 py-0.5 text-xs text-slate-600">
                  {tag}
                </span>
              ))}
            </div>
          )}
        </header>

        <div className="mt-6 space-y-6">
          {workout.sections.length === 0 ? (
            <p className="text-sm text-slate-500">Det finns inget detaljerat passinnehåll att skriva ut ännu.</p>
          ) : (
            workout.sections.map((section) => (
              <section key={section.title} className="print-avoid-break">
                <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2 border-b border-slate-200 pb-2">
                  <h2 className="text-lg font-semibold text-slate-950">{section.title}</h2>
                  {section.subtitle && <p className="text-sm text-slate-500">{section.subtitle}</p>}
                </div>
                {section.notes && (
                  <p className="mb-3 whitespace-pre-wrap rounded-md bg-slate-50 p-3 text-sm text-slate-700">{section.notes}</p>
                )}
                <div className="space-y-3">
                  {section.items.map((item, index) => (
                    <div key={`${item.title}-${index}`} className="print-avoid-break rounded-md border border-slate-200 p-3">
                      <div className="flex gap-3">
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-900 text-xs font-semibold text-white">
                          {index + 1}
                        </div>
                        <div className="min-w-0 flex-1">
                          <h3 className="font-medium text-slate-950">{item.title}</h3>
                          {item.details.length > 0 && (
                            <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-sm text-slate-600">
                              {item.details.map((detail) => (
                                <span key={detail}>{detail}</span>
                              ))}
                            </div>
                          )}
                          {item.notes && (
                            <p className="mt-2 whitespace-pre-wrap text-sm leading-5 text-slate-600">{item.notes}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            ))
          )}
        </div>

        <footer className="mt-8 grid grid-cols-1 gap-4 border-t pt-5 text-sm sm:grid-cols-2">
          <div>
            <p className="font-medium text-slate-900">Coachanteckningar</p>
            <div className="mt-2 h-20 rounded-md border border-dashed border-slate-300" />
          </div>
          <div>
            <p className="font-medium text-slate-900">Resultat / feedback</p>
            <div className="mt-2 h-20 rounded-md border border-dashed border-slate-300" />
          </div>
        </footer>
      </main>
    </div>
  )
}

