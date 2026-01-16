'use client'

/**
 * Log Workout Page
 *
 * Main entry point for logging ad-hoc workouts.
 * Shows input method selection.
 */

import { useState } from 'react'
import { useRouter } from 'next/navigation'
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
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface InputMethod {
  id: 'photo' | 'voice' | 'text' | 'strava' | 'garmin' | 'manual'
  label: string
  description: string
  icon: React.ReactNode
  color: string
  href: string
}

const INPUT_METHODS: InputMethod[] = [
  {
    id: 'text',
    label: 'Skriv',
    description: 'Skriv en beskrivning av passet',
    icon: <FileText className="h-6 w-6" />,
    color: 'bg-green-500/10 text-green-500 border-green-500/20 hover:bg-green-500/20',
    href: '/athlete/log-workout/text',
  },
  {
    id: 'photo',
    label: 'Foto',
    description: 'Ta en bild av whiteboard eller papper',
    icon: <Camera className="h-6 w-6" />,
    color: 'bg-blue-500/10 text-blue-500 border-blue-500/20 hover:bg-blue-500/20',
    href: '/athlete/log-workout/photo',
  },
  {
    id: 'voice',
    label: 'Röst',
    description: 'Beskriv passet med ett röstmeddelande',
    icon: <Mic className="h-6 w-6" />,
    color: 'bg-purple-500/10 text-purple-500 border-purple-500/20 hover:bg-purple-500/20',
    href: '/athlete/log-workout/voice',
  },
  {
    id: 'strava',
    label: 'Strava',
    description: 'Importera från din Strava-aktivitet',
    icon: <Activity className="h-6 w-6" />,
    color: 'bg-orange-500/10 text-orange-500 border-orange-500/20 hover:bg-orange-500/20',
    href: '/athlete/log-workout/import/strava',
  },
  {
    id: 'garmin',
    label: 'Garmin',
    description: 'Importera från din Garmin-aktivitet',
    icon: <Watch className="h-6 w-6" />,
    color: 'bg-cyan-500/10 text-cyan-500 border-cyan-500/20 hover:bg-cyan-500/20',
    href: '/athlete/log-workout/import/garmin',
  },
  {
    id: 'manual',
    label: 'Formulär',
    description: 'Fyll i ett strukturerat formulär',
    icon: <ClipboardList className="h-6 w-6" />,
    color: 'bg-gray-500/10 text-gray-500 border-gray-500/20 hover:bg-gray-500/20',
    href: '/athlete/log-workout/manual',
  },
]

export default function LogWorkoutPage() {
  return (
    <div className="container max-w-2xl py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/athlete">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Logga ett pass</h1>
          <p className="text-muted-foreground">
            Välj hur du vill registrera ditt träningspass
          </p>
        </div>
      </div>

      {/* Input methods grid */}
      <div className="grid gap-3">
        {INPUT_METHODS.map((method) => (
          <Link key={method.id} href={method.href}>
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
                    <div className="font-semibold">{method.label}</div>
                    <div className="text-sm text-muted-foreground">{method.description}</div>
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
        <p>Passet kommer att analyseras med AI och läggas till i din träningshistorik</p>
      </div>
    </div>
  )
}
