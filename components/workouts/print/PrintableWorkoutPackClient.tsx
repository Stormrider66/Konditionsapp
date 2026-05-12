'use client'

import { Printer } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  PrintableWorkoutDocument,
} from '@/components/workouts/print/PrintableWorkoutSheet'
import type { PrintableWorkout } from '@/lib/workout-print/normalize'

interface PrintableWorkoutPackEntry {
  key: string
  workout: PrintableWorkout
}

interface PrintableWorkoutPackClientProps {
  entries: PrintableWorkoutPackEntry[]
  dateLabel: string
}

export function PrintableWorkoutPackClient({ entries, dateLabel }: PrintableWorkoutPackClientProps) {
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
          .print-pack-page {
            break-after: page;
          }
          .print-pack-page:last-child {
            break-after: auto;
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

      <div className="print-hidden mx-auto mb-4 flex max-w-4xl flex-wrap items-center justify-between gap-3 px-4">
        <div>
          <p className="text-sm font-medium text-slate-900">Dagens utskriftspaket</p>
          <p className="text-xs text-slate-500">
            {dateLabel} · {entries.length} utskrift{entries.length === 1 ? '' : 'er'}
          </p>
        </div>
        <Button type="button" onClick={() => window.print()} className="gap-2">
          <Printer className="h-4 w-4" />
          Skriv ut
        </Button>
      </div>

      <div className="space-y-6 print:space-y-0">
        {entries.map((entry) => (
          <div key={entry.key} className="print-pack-page">
            <PrintableWorkoutDocument workout={entry.workout} />
          </div>
        ))}
      </div>
    </div>
  )
}
