'use client'

import { AIContextButton } from '@/components/ai-studio/AIContextButton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { getBusinessSlugFromPathname } from '@/lib/business-scope-client'

interface Client {
  id: string
  name: string
}

interface MonitoringHeaderProps {
  clients: Client[]
  selectedAthleteId: string | null
}

export function MonitoringHeader({ clients, selectedAthleteId }: MonitoringHeaderProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const pathname = usePathname()
  const pathBusinessSlug = getBusinessSlugFromPathname(pathname)
  const basePath = pathBusinessSlug ? `/${pathBusinessSlug}` : ''

  const selectedClient = clients.find((c) => c.id === selectedAthleteId)
  const tMonitoringHeader = useTranslations('components.monitoringHeader')

  function handleAthleteChange(athleteId: string) {
    const params = new URLSearchParams(searchParams.toString())
    params.set('athleteId', athleteId)
    router.push(`${basePath}/coach/monitoring?${params.toString()}`)
  }

  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
      <div>
        <h1 className="text-3xl font-bold">{tMonitoringHeader('title')}</h1>
        <p className="text-muted-foreground">
          {tMonitoringHeader('subtitle')}
        </p>
      </div>

      <div className="flex items-center gap-3">
        {selectedClient && (
          <AIContextButton
            athleteId={selectedAthleteId || undefined}
            athleteName={selectedClient.name}
            buttonText={tMonitoringHeader('quickActions.buttonText')}
            quickActions={[
              {
                label: tMonitoringHeader('quickActions.analyzeReadiness.label'),
                prompt: tMonitoringHeader('quickActions.analyzeReadiness.prompt', {
                  athleteName: selectedClient.name,
                }),
              },
              {
                label: tMonitoringHeader('quickActions.identifyPatterns.label'),
                prompt: tMonitoringHeader('quickActions.identifyPatterns.prompt', {
                  athleteName: selectedClient.name,
                }),
              },
              {
                label: tMonitoringHeader('quickActions.overloadRisk.label'),
                prompt: tMonitoringHeader('quickActions.overloadRisk.prompt', {
                  athleteName: selectedClient.name,
                }),
              },
              {
                label: tMonitoringHeader('quickActions.optimizeRecovery.label'),
                prompt: tMonitoringHeader('quickActions.optimizeRecovery.prompt', {
                  athleteName: selectedClient.name,
                }),
              },
            ]}
          />
        )}

        <Select value={selectedAthleteId || undefined} onValueChange={handleAthleteChange}>
          <SelectTrigger className="w-64">
            <SelectValue placeholder={tMonitoringHeader('selectAthletePlaceholder')} />
          </SelectTrigger>
          <SelectContent>
            {clients.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}
