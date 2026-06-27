'use client'

import { AIContextButton } from '@/components/ai-studio/AIContextButton'
import { RolePageHeader } from '@/components/layouts/role-shell/RolePage'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useTranslations } from '@/i18n/client'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { getBusinessSlugFromPathname } from '@/lib/business-scope-client'
import { Activity } from 'lucide-react'

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
    <RolePageHeader
      eyebrow="Coach"
      title={
        <span className="flex items-center gap-2">
          <Activity className="h-6 w-6 text-blue-600 dark:text-blue-300" />
          {tMonitoringHeader('title')}
        </span>
      }
      description={tMonitoringHeader('subtitle')}
      actions={
        <>
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
            <SelectTrigger className="w-full border-zinc-200 bg-white text-zinc-950 dark:border-white/10 dark:bg-zinc-950/60 dark:text-zinc-50 sm:w-64">
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
        </>
      }
    />
  )
}
