'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Plus,
  Flame,
  Target,
  TrendingUp,
  Calendar as CalendarIcon,
  LayoutGrid,
  AlertCircle
} from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { HabitCard } from './HabitCard'
import { HabitCalendar } from './HabitCalendar'
import { AddHabitModal } from './AddHabitModal'
import { HabitCategory, HabitFrequency } from '@prisma/client'

interface HabitLog {
  id: string
  date: string
  completed: boolean
  note?: string
}

interface Habit {
  id: string
  name: string
  category: HabitCategory
  frequency: HabitFrequency
  targetDays: number[]
  targetTime?: string
  trigger?: string
  routine?: string
  reward?: string
  currentStreak: number
  longestStreak: number
  totalCompletions: number
  isActive: boolean
  logs: HabitLog[]
}

interface HabitFormData {
  name: string
  category: HabitCategory
  frequency: HabitFrequency
  targetDays?: number[]
  targetTime?: string
  trigger?: string
  routine?: string
  reward?: string
}

export function HabitTracker() {
  const [habits, setHabits] = useState<Habit[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [view, setView] = useState<'list' | 'calendar'>('list')

  const today = new Date().toISOString().split('T')[0]

  const fetchHabits = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)
      const response = await fetch('/api/habits')
      const result = await response.json()

      if (result.success) {
        setHabits(result.data)
      } else {
        setError(result.error || 'Kunde inte hämta vanor')
      }
    } catch (err) {
      setError('Något gick fel')
      console.error('Error fetching habits:', err)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchHabits()
  }, [fetchHabits])

  const handleToggleHabit = async (habitId: string, completed: boolean) => {
    try {
      const response = await fetch(`/api/habits/${habitId}/log`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: today,
          completed,
        }),
      })

      const result = await response.json()

      if (result.success) {
        // Update local state
        setHabits(prev => prev.map(h => {
          if (h.id === habitId) {
            const updatedLogs = [...h.logs]
            const existingLogIndex = updatedLogs.findIndex(
              l => l.date.split('T')[0] === today
            )
            if (existingLogIndex >= 0) {
              updatedLogs[existingLogIndex] = {
                ...updatedLogs[existingLogIndex],
                completed,
              }
            } else {
              updatedLogs.push({
                id: result.data.log.id,
                date: today,
                completed,
              })
            }
            return {
              ...h,
              logs: updatedLogs,
              currentStreak: result.data.streaks?.currentStreak ?? h.currentStreak,
              longestStreak: result.data.streaks?.longestStreak ?? h.longestStreak,
              totalCompletions: result.data.streaks?.totalCompletions ?? h.totalCompletions,
            }
          }
          return h
        }))
      }
    } catch (err) {
      console.error('Error toggling habit:', err)
    }
  }

  const handleAddHabit = async (formData: HabitFormData) => {
    const response = await fetch('/api/habits', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData),
    })

    const result = await response.json()

    if (result.success) {
      setHabits(prev => [...prev, { ...result.data, logs: [] }])
    } else {
      throw new Error(result.error || 'Kunde inte skapa vana')
    }
  }

  const handleDeleteHabit = async (habitId: string) => {
    if (!confirm('Är du säker på att du vill ta bort denna vana?')) return

    try {
      const response = await fetch(`/api/habits/${habitId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        setHabits(prev => prev.filter(h => h.id !== habitId))
      }
    } catch (err) {
      console.error('Error deleting habit:', err)
    }
  }

  // Calculate stats
  const totalHabits = habits.length
  const completedToday = habits.filter(h => {
    const todayLog = h.logs.find(l => l.date.split('T')[0] === today)
    return todayLog?.completed
  }).length
  const longestStreak = Math.max(0, ...habits.map(h => h.currentStreak))
  const completionRate = totalHabits > 0
    ? Math.round((completedToday / totalHabits) * 100)
    : 0

  // Check if habit is completed today
  const isCompletedToday = (habit: Habit): boolean => {
    const todayLog = habit.logs.find(l => l.date.split('T')[0] === today)
    return todayLog?.completed ?? false
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-4 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-64" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Dagliga vanor</h2>
          <p className="text-muted-foreground">Bygg hälsosamma rutiner</p>
        </div>
        <Button onClick={() => setShowAddModal(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Lägg till vana
        </Button>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Target className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Idag</p>
                <p className="text-2xl font-bold">
                  {completedToday} / {totalHabits}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-500/10 rounded-lg">
                <Flame className="h-5 w-5 text-orange-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Längsta streak</p>
                <p className="text-2xl font-bold">{longestStreak} dagar</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-500/10 rounded-lg">
                <TrendingUp className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Färdigställt idag</p>
                <p className="text-2xl font-bold">{completionRate}%</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/10 rounded-lg">
                <CalendarIcon className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Totala vanor</p>
                <p className="text-2xl font-bold">{totalHabits}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* View Toggle */}
      <Tabs value={view} onValueChange={(v) => setView(v as 'list' | 'calendar')}>
        <TabsList>
          <TabsTrigger value="list">
            <LayoutGrid className="h-4 w-4 mr-2" />
            Lista
          </TabsTrigger>
          <TabsTrigger value="calendar">
            <CalendarIcon className="h-4 w-4 mr-2" />
            Kalender
          </TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="space-y-3 mt-4">
          {habits.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Target className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="font-semibold mb-2">Inga vanor än</h3>
                <p className="text-muted-foreground mb-4">
                  Börja bygga hälsosamma vanor genom att lägga till din första.
                </p>
                <Button onClick={() => setShowAddModal(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Lägg till din första vana
                </Button>
              </CardContent>
            </Card>
          ) : (
            habits.map((habit) => (
              <HabitCard
                key={habit.id}
                habit={habit}
                todayCompleted={isCompletedToday(habit)}
                onToggle={handleToggleHabit}
                onDelete={handleDeleteHabit}
              />
            ))
          )}
        </TabsContent>

        <TabsContent value="calendar" className="mt-4">
          <HabitCalendar
            habits={habits}
            currentMonth={currentMonth}
            onMonthChange={setCurrentMonth}
          />
        </TabsContent>
      </Tabs>

      {/* Add Habit Modal */}
      <AddHabitModal
        open={showAddModal}
        onClose={() => setShowAddModal(false)}
        onAdd={handleAddHabit}
      />
    </div>
  )
}
