'use client'

/**
 * Log Workout Page
 *
 * Main entry point for logging ad-hoc workouts.
 * Shows input method selection.
 */

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  Camera,
  Mic,
  FileText,
  Activity,
  Watch,
  ClipboardList,
  ChevronRight,
  ArrowLeft,
  Bluetooth,
  MapPin,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useBasePath } from '@/lib/contexts/BasePathContext'
import { useTranslations } from '@/i18n/client'

interface InputMethod {
  id: 'erg' | 'run' | 'photo' | 'voice' | 'text' | 'strava' | 'garmin' | 'manual'
  labelKey: string
  descriptionKey: string
  icon: React.ReactNode
  color: string
  path: string
}

const INPUT_METHODS: InputMethod[] = [
  {
    id: 'erg',
    labelKey: 'methods.erg.label',
    descriptionKey: 'methods.erg.description',
    icon: <Bluetooth className="h-6 w-6" />,
    color: 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20 hover:bg-indigo-500/20',
    path: '/athlete/log-workout/erg',
  },
  {
    id: 'run',
    labelKey: 'methods.run.label',
    descriptionKey: 'methods.run.description',
    icon: <MapPin className="h-6 w-6" />,
    color: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20 hover:bg-emerald-500/20',
    path: '/athlete/log-workout/run',
  },
  {
    id: 'text',
    labelKey: 'methods.text.label',
    descriptionKey: 'methods.text.description',
    icon: <FileText className="h-6 w-6" />,
    color: 'bg-green-500/10 text-green-500 border-green-500/20 hover:bg-green-500/20',
    path: '/athlete/log-workout/text',
  },
  {
    id: 'photo',
    labelKey: 'methods.photo.label',
    descriptionKey: 'methods.photo.description',
    icon: <Camera className="h-6 w-6" />,
    color: 'bg-blue-500/10 text-blue-500 border-blue-500/20 hover:bg-blue-500/20',
    path: '/athlete/log-workout/photo',
  },
  {
    id: 'voice',
    labelKey: 'methods.voice.label',
    descriptionKey: 'methods.voice.description',
    icon: <Mic className="h-6 w-6" />,
    color: 'bg-purple-500/10 text-purple-500 border-purple-500/20 hover:bg-purple-500/20',
    path: '/athlete/log-workout/voice',
  },
  {
    id: 'strava',
    labelKey: 'methods.strava.label',
    descriptionKey: 'methods.strava.description',
    icon: <Activity className="h-6 w-6" />,
    color: 'bg-orange-500/10 text-orange-500 border-orange-500/20 hover:bg-orange-500/20',
    path: '/athlete/log-workout/import/strava',
  },
  {
    id: 'garmin',
    labelKey: 'methods.garmin.label',
    descriptionKey: 'methods.garmin.description',
    icon: <Watch className="h-6 w-6" />,
    color: 'bg-cyan-500/10 text-cyan-500 border-cyan-500/20 hover:bg-cyan-500/20',
    path: '/athlete/log-workout/import/garmin',
  },
  {
    id: 'manual',
    labelKey: 'methods.manual.label',
    descriptionKey: 'methods.manual.description',
    icon: <ClipboardList className="h-6 w-6" />,
    color: 'bg-gray-500/10 text-gray-500 border-gray-500/20 hover:bg-gray-500/20',
    path: '/athlete/log-workout/manual',
  },
]

export default function LogWorkoutPage() {
  const t = useTranslations('pages.logWorkout')
  const basePath = useBasePath()
  return (
    <div className="container max-w-2xl py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href={`${basePath}/athlete/dashboard`}>
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div>
          <h1 className="font-display text-2xl font-bold">{t('title')}</h1>
          <p className="text-muted-foreground">
            {t('description')}
          </p>
        </div>
      </div>

      {/* Input methods grid */}
      <div className="grid gap-3">
        {INPUT_METHODS.map((method) => (
          <Link key={method.id} href={`${basePath}${method.path}`}>
            <Card className="hover:border-primary/50 transition-all cursor-pointer group">
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  <div
                    className={cn(
                      'flex h-12 w-12 items-center justify-center rounded-lg border transition-colors',
                      method.color
                    )}
                  >
                    {method.icon}
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold">{t(method.labelKey)}</div>
                    <div className="text-sm text-muted-foreground">{t(method.descriptionKey)}</div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-foreground transition-colors" />
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Info */}
      <div className="text-center text-sm text-muted-foreground pt-4">
        <p>{t('info')}</p>
      </div>
    </div>
  )
}
