'use client'

import React from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dumbbell, Activity, Calendar, Library, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ExerciseLibrary } from './ExerciseLibrary'
import { ExerciseCreator } from './ExerciseCreator'
import { SessionBuilder } from './SessionBuilder'

export function StrengthDashboard() {
  const [showCreator, setShowCreator] = React.useState(false)

  if (showCreator) {
    return (
      <div className="container mx-auto py-6">
        <Button 
          variant="ghost" 
          onClick={() => setShowCreator(false)}
          className="mb-4"
        >
          ← Back to Dashboard
        </Button>
        <ExerciseCreator onClose={() => setShowCreator(false)} />
      </div>
    )
  }

  return (
    <div className="container mx-auto py-6 space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Strength Studio</h1>
          <p className="text-muted-foreground mt-2">
            Manage exercises, build sophisticated strength programs, and track athlete progression.
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setShowCreator(true)}>
            <Plus className="mr-2 h-4 w-4" />
            New Exercise
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Exercises</CardTitle>
            <Dumbbell className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">24</div>
            <p className="text-xs text-muted-foreground">+2 added this week</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Programs</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">12</div>
            <p className="text-xs text-muted-foreground">Across 8 athletes</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Compliance Rate</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">85%</div>
            <p className="text-xs text-muted-foreground">+2.5% from last month</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">PRs set this week</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">7</div>
            <p className="text-xs text-muted-foreground">3 Squat, 4 Deadlift</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="library" className="space-y-4">
        <TabsList>
          <TabsTrigger value="library" className="flex items-center gap-2">
            <Library className="h-4 w-4" />
            Exercise Library
          </TabsTrigger>
          <TabsTrigger value="builder" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Session Builder
          </TabsTrigger>
          <TabsTrigger value="progression" className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Progression Tracking
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="library" className="space-y-4">
          <ExerciseLibrary />
        </TabsContent>
        
        <TabsContent value="builder">
          <SessionBuilder />
        </TabsContent>
        
        <TabsContent value="progression">
           <Card>
            <CardHeader>
              <CardTitle>Progression Tracking</CardTitle>
              <CardDescription>View athlete 1RM trends and volume loads.</CardDescription>
            </CardHeader>
            <CardContent className="h-[400px] flex items-center justify-center border-dashed border-2 rounded-lg m-4">
              <p className="text-muted-foreground">Progression Charts Coming Soon</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

