'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Flame,
  Droplet,
  Moon,
  Footprints,
  Brain,
  Dumbbell,
  Heart,
  MoreVertical,
  Trash2,
  Edit
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { HabitCategory } from '@prisma/client'
import { cn } from '@/lib/utils'

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
  currentStreak: number
  longestStreak: number
  totalCompletions: number
  isActive: boolean
  logs: HabitLog[]
}

interface HabitCardProps {
  habit: Habit
  todayCompleted: boolean
  onToggle: (habitId: string, completed: boolean) => void
  onEdit?: (habit: Habit) => void
  onDelete?: (habitId: string) => void
}

const CATEGORY_CONFIG: Record<HabitCategory, { icon: typeof Flame; label: string; color: string }> = {
  NUTRITION: { icon: Droplet, label: 'Kost', color: 'bg-blue-500' },
  SLEEP: { icon: Moon, label: 'Somn', color: 'bg-purple-500' },
  MOVEMENT: { icon: Footprints, label: 'Rorelse', color: 'bg-green-500' },
  MINDFULNESS: { icon: Brain, label: 'Mental', color: 'bg-yellow-500' },
  TRAINING: { icon: Dumbbell, label: 'Traning', color: 'bg-orange-500' },
  RECOVERY: { icon: Heart, label: 'Aterhamt', color: 'bg-pink-500' },
}

function formatStreak(days: number): string {
  if (days === 0) return 'Ingen streak'
  if (days === 1) return '1 dag'
  return `${days} dagar`
}

export function HabitCard({
  habit,
  todayCompleted,
  onToggle,
  onEdit,
  onDelete
}: HabitCardProps) {
  const [isLoading, setIsLoading] = useState(false)
  const categoryConfig = CATEGORY_CONFIG[habit.category]
  const Icon = categoryConfig.icon

  const handleToggle = async () => {
    setIsLoading(true)
    try {
      await onToggle(habit.id, !todayCompleted)
    } finally {
      setIsLoading(false)
    }
  }

  // Calculate last 7 days completion for mini-streak display
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const date = new Date()
    date.setDate(date.getDate() - (6 - i))
    const dateStr = date.toISOString().split('T')[0]
    const log = habit.logs.find(l => l.date.split('T')[0] === dateStr)
    return log?.completed ?? false
  })

  return (
    <Card className={cn(
      "transition-all duration-200",
      todayCompleted && "border-green-500/50 bg-green-500/5"
    )}>
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          {/* Checkbox */}
          <div className="flex-shrink-0">
            <Checkbox
              checked={todayCompleted}
              onCheckedChange={handleToggle}
              disabled={isLoading}
              className="h-6 w-6"
            />
          </div>

          {/* Icon and Name */}
          <div className={cn(
            "flex-shrink-0 p-2 rounded-lg",
            categoryConfig.color,
            "text-white"
          )}>
            <Icon className="h-5 w-5" />
          </div>

          <div className="flex-1 min-w-0">
            <p className={cn(
              "font-medium truncate",
              todayCompleted && "line-through text-muted-foreground"
            )}>
              {habit.name}
            </p>
            <div className="flex items-center gap-2 mt-1">
              {/* Streak badge */}
              {habit.currentStreak > 0 && (
                <Badge variant="secondary" className="flex items-center gap-1 text-xs">
                  <Flame className="h-3 w-3 text-orange-500" />
                  {formatStreak(habit.currentStreak)}
                </Badge>
              )}
              {/* Category badge */}
              <Badge variant="outline" className="text-xs">
                {categoryConfig.label}
              </Badge>
            </div>
          </div>

          {/* Mini streak visualization */}
          <div className="flex-shrink-0 flex gap-0.5">
            {last7Days.map((completed, i) => (
              <div
                key={i}
                className={cn(
                  "w-2 h-6 rounded-sm",
                  completed ? "bg-green-500" : "bg-gray-200 dark:bg-gray-700"
                )}
              />
            ))}
          </div>

          {/* Actions menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {onEdit && (
                <DropdownMenuItem onClick={() => onEdit(habit)}>
                  <Edit className="h-4 w-4 mr-2" />
                  Redigera
                </DropdownMenuItem>
              )}
              {onDelete && (
                <DropdownMenuItem
                  onClick={() => onDelete(habit.id)}
                  className="text-destructive"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Ta bort
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardContent>
    </Card>
  )
}
