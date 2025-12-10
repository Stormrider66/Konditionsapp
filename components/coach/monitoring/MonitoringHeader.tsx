'use client'

import { AIContextButton } from '@/components/ai-studio/AIContextButton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useRouter, useSearchParams } from 'next/navigation'

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

  const selectedClient = clients.find((c) => c.id === selectedAthleteId)

  function handleAthleteChange(athleteId: string) {
    const params = new URLSearchParams(searchParams.toString())
    params.set('athleteId', athleteId)
    router.push(`/coach/monitoring?${params.toString()}`)
  }

  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
      <div>
        <h1 className="text-3xl font-bold">Atletmonitorering</h1>
        <p className="text-muted-foreground">
          Följ HRV, vilopuls, välmående och beredskap
        </p>
      </div>

      <div className="flex items-center gap-3">
        {selectedClient && (
          <AIContextButton
            athleteId={selectedAthleteId || undefined}
            athleteName={selectedClient.name}
            buttonText="AI-analys"
            quickActions={[
              {
                label: 'Analysera beredskap',
                prompt: `Analysera ${selectedClient.name}s beredskapstrender och ge rekommendationer`,
              },
              {
                label: 'Identifiera mönster',
                prompt: `Identifiera mönster i ${selectedClient.name}s HRV och vilopuls data`,
              },
              {
                label: 'Överträningsrisk',
                prompt: `Bedöm risken för överträning för ${selectedClient.name} baserat på monitoreringsdata`,
              },
              {
                label: 'Optimera återhämtning',
                prompt: `Ge förslag på hur ${selectedClient.name} kan optimera sin återhämtning`,
              },
            ]}
          />
        )}

        <Select value={selectedAthleteId || undefined} onValueChange={handleAthleteChange}>
          <SelectTrigger className="w-64">
            <SelectValue placeholder="Välj atlet" />
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
