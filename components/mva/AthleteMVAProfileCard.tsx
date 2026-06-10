'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { FileDown, AlertTriangle, Activity } from 'lucide-react'
import { useLocale } from '@/i18n/client'
import { ARCHETYPE_LABELS, ARCHETYPE_DESCRIPTIONS, classifyArchetype } from '@/lib/mva/archetypes'
import { buildAthleteMVANarrative } from '@/lib/mva/mva-narrative'
import { downloadMVATeamReportPDF, type MVAReportAthlete } from '@/lib/exports/mva-team-report-export'

export interface AthleteMVAScore {
  clientName: string
  scores: number[]
  hotellingT2: number
  dmodx: number
  isOutlierT2: boolean
  isOutlierDModX: boolean
  topContributors: { variableId: string; variableName: string; contribution: number; direction: string }[] | null
}

interface AthleteMVAProfileCardProps {
  teamName: string
  modelDate: string
  myScore: AthleteMVAScore
}

const TONE_STYLES: Record<'priority' | 'watch' | 'positive' | 'info', string> = {
  priority: 'border-l-red-500',
  watch: 'border-l-amber-500',
  positive: 'border-l-emerald-500',
  info: 'border-l-blue-500',
}

export function AthleteMVAProfileCard({ teamName, modelDate, myScore }: AthleteMVAProfileCardProps) {
  const locale = useLocale() === 'sv' ? 'sv' : 'en'
  const t = (sv: string, en: string) => (locale === 'sv' ? sv : en)
  const dateLocale = locale === 'sv' ? 'sv-SE' : 'en-US'

  const archetype = classifyArchetype(myScore.topContributors, myScore.scores)
  const narrative = buildAthleteMVANarrative(myScore, locale)
  const drivers = (myScore.topContributors ?? []).slice(0, 6)

  const downloadPdf = () => {
    downloadMVATeamReportPDF({
      teamName,
      locale,
      generatedAt: new Date().toISOString(),
      nObservations: 0,
      nVariables: 0,
      nComponents: 0,
      explainedVariance: [],
      warnings: [],
      athletes: [
        {
          clientName: myScore.clientName,
          scores: myScore.scores,
          hotellingT2: myScore.hotellingT2,
          dmodx: myScore.dmodx,
          isOutlierT2: myScore.isOutlierT2,
          isOutlierDModX: myScore.isOutlierDModX,
          topContributors: myScore.topContributors,
        } satisfies MVAReportAthlete,
      ],
      pls: null,
      focusAthleteName: myScore.clientName,
    })
  }

  return (
    <div className="container mx-auto max-w-3xl space-y-6 px-4 py-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold dark:text-white">{t('Min lagprofil', 'My team profile')}</h1>
          <p className="text-sm text-muted-foreground">
            {teamName} · {t('senaste analys', 'latest analysis')} {new Date(modelDate).toLocaleDateString(dateLocale)}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={downloadPdf}>
          <FileDown className="mr-2 h-4 w-4" />
          {t('Ladda ner PDF', 'Download PDF')}
        </Button>
      </div>

      <Card className="dark:bg-slate-900/50 dark:border-white/10">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg dark:text-white">
            <Activity className="h-5 w-5 text-cyan-500" />
            {ARCHETYPE_LABELS[locale][archetype]}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">{ARCHETYPE_DESCRIPTIONS[locale][archetype]}</p>

          {(myScore.isOutlierT2 || myScore.isOutlierDModX) && (
            <div className="flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm dark:border-amber-500/30 dark:bg-amber-500/10">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
              <span className="text-amber-700 dark:text-amber-300">
                {t(
                  'Din profil sticker ut från lagets. Det kan vara verkliga styrkor/svagheter eller ett datafel — stäm av med din coach.',
                  'Your profile stands out from the team. This can be genuine strengths/gaps or a data issue — check with your coach.'
                )}
              </span>
            </div>
          )}

          {drivers.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-medium text-muted-foreground">
                {t('Vad som formar din profil', 'What shapes your profile')}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {drivers.map((d) => (
                  <Badge key={d.variableId} variant="outline" className="text-[11px]">
                    {d.variableName}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="space-y-3">
        {narrative.map((item) => (
          <Card key={item.id} className={`border-l-4 ${TONE_STYLES[item.tone]} dark:bg-slate-900/50 dark:border-white/10`}>
            <CardContent className="py-3">
              <p className="text-sm font-medium dark:text-white">{item.title}</p>
              <p className="mt-1 text-sm text-muted-foreground">{item.body}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <p className="text-xs text-muted-foreground">
        {t(
          'Den här profilen bygger på en multivariat analys (MVA) av lagets tester. Den ersätter inte enskilda testresultat utan visar hur du placerar dig i lagets helhetsbild.',
          'This profile is built from a multivariate analysis (MVA) of your team’s tests. It does not replace individual test results — it shows where you sit in the team’s overall picture.'
        )}
      </p>
    </div>
  )
}
