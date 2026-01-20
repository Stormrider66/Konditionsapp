'use client'

/**
 * LocationSettings
 *
 * Component for selecting preferred gym location in athlete settings.
 * Used for WOD generation to use equipment available at the athlete's gym.
 */

import { useState, useEffect } from 'react'
import { MapPin, Check, Loader2, Building2, Dumbbell } from 'lucide-react'
import { GlassCard, GlassCardContent } from '@/components/ui/GlassCard'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

interface Location {
  id: string
  name: string
  city: string | null
  address: string | null
  isPrimary: boolean
  equipmentCount: number
}

interface LocationSettingsProps {
  variant?: 'default' | 'glass'
}

export function LocationSettings({ variant = 'glass' }: LocationSettingsProps) {
  const [locations, setLocations] = useState<Location[]>([])
  const [selectedLocationId, setSelectedLocationId] = useState<string | null>(null)
  const [savedLocationId, setSavedLocationId] = useState<string | null>(null)
  const [businessName, setBusinessName] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Fetch available locations and saved preference
  useEffect(() => {
    async function fetchData() {
      try {
        const response = await fetch('/api/athlete/settings/preferred-location')
        const data = await response.json()

        if (data.success) {
          setLocations(data.availableLocations || [])
          setBusinessName(data.business?.name || null)

          if (data.preferredLocation) {
            setSelectedLocationId(data.preferredLocation.id)
            setSavedLocationId(data.preferredLocation.id)
          }
        }
      } catch (err) {
        console.error('Failed to fetch locations:', err)
        setError('Kunde inte hämta gym-platser')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  // Save location preference
  const handleSelectLocation = async (locationId: string | null) => {
    setSelectedLocationId(locationId)
    setSaving(true)
    setError(null)

    try {
      const response = await fetch('/api/athlete/settings/preferred-location', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ locationId }),
      })

      if (!response.ok) {
        throw new Error('Failed to save preference')
      }

      setSavedLocationId(locationId)
    } catch (err) {
      console.error('Failed to save location preference:', err)
      setError('Kunde inte spara inställningen')
      // Revert selection
      setSelectedLocationId(savedLocationId)
    } finally {
      setSaving(false)
    }
  }

  // Loading state
  if (loading) {
    return (
      <GlassCard>
        <GlassCardContent className="p-6 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
        </GlassCardContent>
      </GlassCard>
    )
  }

  // No locations available
  if (locations.length === 0) {
    return (
      <GlassCard>
        <GlassCardContent className="p-6 text-center">
          <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-3">
            <Building2 className="h-6 w-6 text-slate-400" />
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Ingen gym-anslutning hittades. Kontakta din coach om du tränar på ett gym.
          </p>
        </GlassCardContent>
      </GlassCard>
    )
  }

  return (
    <GlassCard>
      <GlassCardContent className="p-4">
        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-cyan-100 dark:bg-cyan-500/10 flex items-center justify-center border border-cyan-200 dark:border-cyan-500/20">
            <MapPin className="h-5 w-5 text-cyan-600 dark:text-cyan-400" />
          </div>
          <div>
            <p className="font-semibold text-slate-900 dark:text-white">Välj din gym-plats</p>
            {businessName && (
              <p className="text-xs text-slate-500 dark:text-slate-400">{businessName}</p>
            )}
          </div>
        </div>

        {/* Description */}
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
          Välj det gym du tränar på för att få WOD-pass anpassade efter tillgänglig utrustning.
        </p>

        {/* Error */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-xl">
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}

        {/* Location Options */}
        <div className="space-y-2">
          {/* Auto/Default option */}
          <button
            onClick={() => handleSelectLocation(null)}
            disabled={saving}
            className={cn(
              'w-full flex items-center gap-3 p-3 rounded-xl border transition-all',
              selectedLocationId === null
                ? 'bg-cyan-50 dark:bg-cyan-500/10 border-cyan-200 dark:border-cyan-500/30'
                : 'bg-white/50 dark:bg-white/5 border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-white/10',
              saving && 'opacity-50 cursor-not-allowed'
            )}
          >
            <div className={cn(
              'w-8 h-8 rounded-lg flex items-center justify-center',
              selectedLocationId === null
                ? 'bg-cyan-500 text-white'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
            )}>
              {selectedLocationId === null ? (
                saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />
              ) : (
                <Building2 className="h-4 w-4" />
              )}
            </div>
            <div className="flex-1 text-left">
              <p className={cn(
                'font-medium',
                selectedLocationId === null
                  ? 'text-cyan-700 dark:text-cyan-300'
                  : 'text-slate-700 dark:text-slate-300'
              )}>
                Automatiskt
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Använd primärt gym
              </p>
            </div>
          </button>

          {/* Location options */}
          {locations.map((location) => (
            <button
              key={location.id}
              onClick={() => handleSelectLocation(location.id)}
              disabled={saving}
              className={cn(
                'w-full flex items-center gap-3 p-3 rounded-xl border transition-all',
                selectedLocationId === location.id
                  ? 'bg-cyan-50 dark:bg-cyan-500/10 border-cyan-200 dark:border-cyan-500/30'
                  : 'bg-white/50 dark:bg-white/5 border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-white/10',
                saving && 'opacity-50 cursor-not-allowed'
              )}
            >
              <div className={cn(
                'w-8 h-8 rounded-lg flex items-center justify-center',
                selectedLocationId === location.id
                  ? 'bg-cyan-500 text-white'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
              )}>
                {selectedLocationId === location.id ? (
                  saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />
                ) : (
                  <MapPin className="h-4 w-4" />
                )}
              </div>
              <div className="flex-1 text-left">
                <div className="flex items-center gap-2">
                  <p className={cn(
                    'font-medium',
                    selectedLocationId === location.id
                      ? 'text-cyan-700 dark:text-cyan-300'
                      : 'text-slate-700 dark:text-slate-300'
                  )}>
                    {location.name}
                  </p>
                  {location.isPrimary && (
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                      Primär
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                  {location.city && <span>{location.city}</span>}
                  {location.city && location.equipmentCount > 0 && <span>•</span>}
                  {location.equipmentCount > 0 && (
                    <span className="flex items-center gap-1">
                      <Dumbbell className="h-3 w-3" />
                      {location.equipmentCount} utrustningar
                    </span>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>
      </GlassCardContent>
    </GlassCard>
  )
}
