'use client'

import { format } from 'date-fns'
import { sv } from 'date-fns/locale'
import { Heart, AlertTriangle, CheckCircle, Activity, Clock, Bike } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { AthleteProfileData } from '@/lib/athlete-profile/data-fetcher'

interface InjuryHealthTabProps {
  data: AthleteProfileData
  viewMode: 'coach' | 'athlete'
}

export function InjuryHealthTab({ data, viewMode }: InjuryHealthTabProps) {
  const { injuryAssessments, crossTrainingSessions } = data.health

  // Separate active vs resolved injuries
  const activeInjuries = injuryAssessments.filter((i) => !i.resolved)
  const resolvedInjuries = injuryAssessments.filter((i) => i.resolved)

  const hasData = injuryAssessments.length > 0 || crossTrainingSessions.length > 0

  if (!hasData) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Heart className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Ingen hälsodata</h3>
          <p className="text-gray-500">
            Inga skadebedömningar eller korsträningspass registrerade.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Active Injuries Alert */}
      {activeInjuries.length > 0 && (
        <Card className="border-red-200 bg-red-50">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-red-800">
              <AlertTriangle className="h-5 w-5" />
              Aktiva skador ({activeInjuries.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {activeInjuries.map((injury) => (
              <InjuryCard key={injury.id} injury={injury} isActive />
            ))}
          </CardContent>
        </Card>
      )}

      {/* Injury Timeline */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Skadehistorik
          </CardTitle>
          <CardDescription>
            {injuryAssessments.length} bedömningar registrerade
          </CardDescription>
        </CardHeader>
        <CardContent>
          {injuryAssessments.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <CheckCircle className="h-12 w-12 text-green-300 mx-auto mb-3" />
              <p>Ingen skadehistorik - fortsätt så!</p>
            </div>
          ) : (
            <div className="relative">
              {/* Timeline line */}
              <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200" />

              <div className="space-y-4">
                {injuryAssessments.slice(0, 10).map((injury) => (
                  <div key={injury.id} className="relative pl-10">
                    {/* Timeline dot */}
                    <div
                      className={`absolute left-2.5 w-3 h-3 rounded-full border-2 border-white ${
                        injury.resolved
                          ? 'bg-green-500'
                          : injury.status === 'ACTIVE'
                          ? 'bg-red-500'
                          : 'bg-yellow-500'
                      }`}
                    />

                    <InjuryCard injury={injury} isActive={!injury.resolved} />
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Cross Training Sessions */}
      {crossTrainingSessions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bike className="h-5 w-5" />
              Korsträning
            </CardTitle>
            <CardDescription>
              Alternativ träning under skador eller för variation
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {crossTrainingSessions.slice(0, 10).map((session) => (
                <div
                  key={session.id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <Activity className="h-4 w-4 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-medium">{getModalityLabel(session.modality)}</p>
                      <p className="text-sm text-gray-500">
                        {format(new Date(session.date), 'd MMM yyyy', { locale: sv })}
                        {session.reason && ` • ${getReasonLabel(session.reason)}`}
                      </p>
                    </div>
                  </div>
                  <div className="text-right text-sm">
                    <p className="font-medium">{session.duration} min</p>
                    {session.distance && (
                      <p className="text-gray-500">{(session.distance / 1000).toFixed(1)} km</p>
                    )}
                    {session.tssEquivalent && (
                      <Badge variant="outline" className="text-xs mt-1">
                        ~{Math.round(session.tssEquivalent)} TSS
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Resolved Injuries */}
      {resolvedInjuries.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-700">
              <CheckCircle className="h-5 w-5" />
              Tidigare skador ({resolvedInjuries.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {resolvedInjuries.slice(0, 5).map((injury) => (
                <div
                  key={injury.id}
                  className="flex items-center justify-between p-3 border rounded-lg bg-green-50"
                >
                  <div>
                    <p className="font-medium">{getInjuryTypeLabel(injury.injuryType || 'OTHER')}</p>
                    <p className="text-sm text-gray-500">
                      {format(new Date(injury.date), 'd MMM yyyy', { locale: sv })}
                      {injury.resolvedDate && (
                        <> → {format(new Date(injury.resolvedDate), 'd MMM yyyy', { locale: sv })}</>
                      )}
                    </p>
                  </div>
                  <Badge variant="outline" className="text-green-700 border-green-300">
                    Läkt
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

// Helper component
function InjuryCard({
  injury,
  isActive,
}: {
  injury: AthleteProfileData['health']['injuryAssessments'][0]
  isActive: boolean
}) {
  return (
    <div
      className={`p-4 rounded-lg border ${
        isActive ? 'bg-white border-red-200' : 'bg-white'
      }`}
    >
      <div className="flex items-start justify-between mb-2">
        <div>
          <p className="font-medium">{getInjuryTypeLabel(injury.injuryType || 'OTHER')}</p>
          {injury.painLocation && (
            <p className="text-sm text-gray-500">{injury.painLocation}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={getStatusVariant(injury.status)}>
            {getStatusLabel(injury.status)}
          </Badge>
          {injury.phase && (
            <Badge variant="outline">{getPhaseLabel(injury.phase)}</Badge>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm mt-3">
        <div>
          <p className="text-gray-500">Smärtnivå</p>
          <p className="font-medium flex items-center gap-1">
            <PainIndicator level={injury.painLevel} />
            {injury.painLevel}/10
          </p>
        </div>
        <div>
          <p className="text-gray-500">Datum</p>
          <p className="font-medium">
            {format(new Date(injury.date), 'd MMM yyyy', { locale: sv })}
          </p>
        </div>
        {injury.estimatedTimeOff && (
          <div>
            <p className="text-gray-500">Uppskattad vila</p>
            <p className="font-medium">{injury.estimatedTimeOff}</p>
          </div>
        )}
        {injury.gaitAffected && (
          <div>
            <p className="text-gray-500">Gång påverkad</p>
            <p className="font-medium text-red-600">Ja</p>
          </div>
        )}
      </div>

      {injury.notes && (
        <p className="text-sm text-gray-600 mt-3 border-t pt-3">{injury.notes}</p>
      )}
    </div>
  )
}

function PainIndicator({ level }: { level: number }) {
  const color =
    level <= 3 ? 'bg-green-500' : level <= 5 ? 'bg-yellow-500' : level <= 7 ? 'bg-orange-500' : 'bg-red-500'

  return <div className={`w-2 h-2 rounded-full ${color}`} />
}

// Helper functions
function getInjuryTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    MUSCLE_STRAIN: 'Muskelsträckning',
    TENDINOPATHY: 'Senbesvär',
    JOINT_PAIN: 'Ledvärk',
    STRESS_FRACTURE: 'Stressfraktur',
    SHIN_SPLINTS: 'Benhinnebesvär',
    PLANTAR_FASCIITIS: 'Hälsporre',
    IT_BAND: 'IT-band syndrom',
    ACHILLES: 'Akilles',
    OTHER: 'Övrigt',
  }
  return labels[type] || type
}

function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    ACTIVE: 'Aktiv',
    MONITORING: 'Under bevakning',
    RESOLVED: 'Läkt',
  }
  return labels[status] || status
}

function getStatusVariant(status: string): 'default' | 'secondary' | 'outline' | 'destructive' {
  switch (status) {
    case 'ACTIVE':
      return 'destructive'
    case 'MONITORING':
      return 'secondary'
    case 'RESOLVED':
      return 'default'
    default:
      return 'outline'
  }
}

function getPhaseLabel(phase: string): string {
  const labels: Record<string, string> = {
    ACUTE: 'Akut',
    SUBACUTE: 'Subakut',
    CHRONIC: 'Kronisk',
    RECOVERY: 'Återhämtning',
  }
  return labels[phase] || phase
}

function getModalityLabel(modality: string): string {
  const labels: Record<string, string> = {
    DEEP_WATER_RUNNING: 'Vattenjogging',
    CYCLING: 'Cykling',
    SWIMMING: 'Simning',
    ELLIPTICAL: 'Crosstrainer',
    ROWING: 'Rodd',
    STRENGTH: 'Styrketräning',
  }
  return labels[modality] || modality
}

function getReasonLabel(reason: string): string {
  const labels: Record<string, string> = {
    INJURY: 'Skada',
    VARIETY: 'Variation',
    WEATHER: 'Väder',
    PREFERENCE: 'Preferens',
  }
  return labels[reason] || reason
}
