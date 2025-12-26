'use client'

import React from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Activity, Calendar, Library, Plus, Timer, TrendingUp, Sparkles, BookOpen } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { CardioSessionBuilder } from './CardioSessionBuilder'
import { CardioSessionLibrary } from './CardioSessionLibrary'
import { CardioTemplateLibrary } from './CardioTemplateLibrary'
import { AutoCardioDialog } from './AutoCardioDialog'
import type { CardioSessionData } from '@/types'

export function CardioDashboard() {
  const [activeTab, setActiveTab] = React.useState('builder')
  const [editSession, setEditSession] = React.useState<CardioSessionData | null>(null)
  const [showAutoGenerate, setShowAutoGenerate] = React.useState(false)

  return (
    <div className="container mx-auto py-6 space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Cardio Studio</h1>
          <p className="text-muted-foreground mt-2">
            Design running sessions, manage intervals, and track endurance progression.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowAutoGenerate(true)}>
            <Sparkles className="mr-2 h-4 w-4" />
            Auto-Generera
          </Button>
          <Button onClick={() => { setEditSession(null); setActiveTab('builder') }}>
            <Plus className="mr-2 h-4 w-4" />
            Nytt Pass
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Volume</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">42.5 km</div>
            <p className="text-xs text-muted-foreground">This week</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Programs</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">8</div>
            <p className="text-xs text-muted-foreground">Running programs</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Intensity</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Zone 2.4</div>
            <p className="text-xs text-muted-foreground">Mostly aerobic base</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Time on Feet</CardTitle>
            <Timer className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">4h 12m</div>
            <p className="text-xs text-muted-foreground">This week</p>
          </CardContent>
        </Card>
      </div>

      <Tabs id="cardio-studio-tabs" value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="builder" className="flex items-center gap-2">
            <Timer className="h-4 w-4" />
            Skapa Pass
          </TabsTrigger>
          <TabsTrigger value="library" className="flex items-center gap-2">
            <Library className="h-4 w-4" />
            Mina Pass
          </TabsTrigger>
          <TabsTrigger value="templates" className="flex items-center gap-2">
            <BookOpen className="h-4 w-4" />
            Mallar
          </TabsTrigger>
        </TabsList>

        <TabsContent value="builder">
          <CardioSessionBuilder
            initialData={editSession}
            onSaved={() => {
              setEditSession(null)
              setActiveTab('library')
            }}
            onCancel={editSession ? () => {
              setEditSession(null)
              setActiveTab('library')
            } : undefined}
          />
        </TabsContent>

        <TabsContent value="library" className="space-y-4">
          <CardioSessionLibrary
            onNewSession={() => {
              setEditSession(null)
              setActiveTab('builder')
            }}
            onEditSession={(session) => {
              setEditSession(session)
              setActiveTab('builder')
            }}
          />
        </TabsContent>

        <TabsContent value="templates" className="space-y-4">
          <CardioTemplateLibrary
            onTemplateSelect={(template) => {
              // Create a new session from template
              setEditSession({
                id: '',
                name: template.name,
                description: template.description,
                sport: template.sport,
                segments: template.segments,
                totalDuration: template.totalDuration,
                totalDistance: template.totalDistance,
                tags: template.tags,
              } as CardioSessionData)
              setActiveTab('builder')
            }}
          />
        </TabsContent>
      </Tabs>

      <AutoCardioDialog
        open={showAutoGenerate}
        onOpenChange={setShowAutoGenerate}
        onSessionGenerated={(session) => {
          setEditSession({
            id: '',
            name: session.name,
            description: session.description,
            sport: session.sport,
            segments: session.segments,
            totalDuration: session.totalDuration,
            totalDistance: session.totalDistance,
            tags: session.tags,
          } as CardioSessionData)
          setActiveTab('builder')
          setShowAutoGenerate(false)
        }}
      />
    </div>
  )
}

