'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Search, Filter, Dumbbell, PlayCircle, Info } from 'lucide-react'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

// Mock data until API is ready
const MOCK_EXERCISES = [
  {
    id: '1',
    name: 'Barbell Back Squat',
    category: 'STRENGTH',
    pillar: 'KNEE_DOMINANCE',
    difficulty: 'Intermediate',
    muscleGroup: 'Legs',
    equipment: 'Barbell, Rack',
    description: 'The king of leg exercises. Focuses on quadriceps, glutes, and core stability.',
    videoUrl: 'https://youtube.com/...'
  },
  {
    id: '2',
    name: 'Romanian Deadlift',
    category: 'STRENGTH',
    pillar: 'POSTERIOR_CHAIN',
    difficulty: 'Intermediate',
    muscleGroup: 'Hamstrings, Glutes',
    equipment: 'Barbell',
    description: 'Hip-hinge movement targeting the posterior chain.',
    videoUrl: 'https://youtube.com/...'
  },
  {
    id: '3',
    name: 'Box Jump',
    category: 'PLYOMETRIC',
    pillar: 'KNEE_DOMINANCE',
    difficulty: 'Intermediate',
    muscleGroup: 'Legs',
    equipment: 'Box',
    description: 'Explosive power development.',
    videoUrl: 'https://youtube.com/...'
  },
  {
    id: '4',
    name: 'Pallof Press',
    category: 'CORE',
    pillar: 'ANTI_ROTATION_CORE',
    difficulty: 'Beginner',
    muscleGroup: 'Core',
    equipment: 'Cable or Band',
    description: 'Anti-rotation core stability exercise.',
    videoUrl: 'https://youtube.com/...'
  },
    {
    id: '5',
    name: 'Bulgarian Split Squat',
    category: 'STRENGTH',
    pillar: 'UNILATERAL',
    difficulty: 'Advanced',
    muscleGroup: 'Legs',
    equipment: 'Dumbbells, Bench',
    description: 'Unilateral leg strength and balance.',
    videoUrl: 'https://youtube.com/...'
  },
]

export function ExerciseLibrary() {
  const [searchTerm, setSearchTerm] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('ALL')
  const [pillarFilter, setPillarFilter] = useState('ALL')

  const filteredExercises = MOCK_EXERCISES.filter(ex => {
    const matchesSearch = ex.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          ex.muscleGroup.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = categoryFilter === 'ALL' || ex.category === categoryFilter
    const matchesPillar = pillarFilter === 'ALL' || ex.pillar === pillarFilter
    return matchesSearch && matchesCategory && matchesPillar
  })

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search exercises (name, muscle)..." 
            className="pl-8" 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Categories</SelectItem>
            <SelectItem value="STRENGTH">Strength</SelectItem>
            <SelectItem value="PLYOMETRIC">Plyometric</SelectItem>
            <SelectItem value="CORE">Core</SelectItem>
            <SelectItem value="RECOVERY">Recovery</SelectItem>
          </SelectContent>
        </Select>
        <Select value={pillarFilter} onValueChange={setPillarFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Biomechanical Pillar" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Pillars</SelectItem>
            <SelectItem value="KNEE_DOMINANCE">Knee Dominance</SelectItem>
            <SelectItem value="POSTERIOR_CHAIN">Posterior Chain</SelectItem>
            <SelectItem value="UNILATERAL">Unilateral</SelectItem>
            <SelectItem value="ANTI_ROTATION_CORE">Anti-Rotation</SelectItem>
            <SelectItem value="FOOT_ANKLE">Foot & Ankle</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredExercises.map((exercise) => (
          <ExerciseCard key={exercise.id} exercise={exercise} />
        ))}
      </div>
    </div>
  )
}

function ExerciseCard({ exercise }: { exercise: any }) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Card className="cursor-pointer hover:shadow-md transition-shadow">
          <CardHeader className="pb-2">
            <div className="flex justify-between items-start">
              <Badge variant={exercise.category === 'STRENGTH' ? 'default' : 'secondary'} className="mb-2">
                {exercise.category}
              </Badge>
              {exercise.videoUrl && <PlayCircle className="h-4 w-4 text-muted-foreground" />}
            </div>
            <CardTitle className="text-lg">{exercise.name}</CardTitle>
            <CardDescription>{exercise.muscleGroup}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
              <Badge variant="outline" className="font-normal">{exercise.difficulty}</Badge>
              <Badge variant="outline" className="font-normal">{exercise.pillar.replace('_', ' ')}</Badge>
            </div>
          </CardContent>
        </Card>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{exercise.name}</DialogTitle>
          <DialogDescription>
            {exercise.category} • {exercise.difficulty}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="aspect-video bg-muted rounded-md flex items-center justify-center">
            <PlayCircle className="h-12 w-12 text-muted-foreground/50" />
            <span className="sr-only">Video placeholder</span>
          </div>
          <div>
            <h4 className="font-medium mb-1">Description</h4>
            <p className="text-sm text-muted-foreground">{exercise.description}</p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <h4 className="font-medium mb-1">Muscle Groups</h4>
              <p className="text-sm text-muted-foreground">{exercise.muscleGroup}</p>
            </div>
            <div>
              <h4 className="font-medium mb-1">Equipment</h4>
              <p className="text-sm text-muted-foreground">{exercise.equipment}</p>
            </div>
          </div>
          <div>
            <h4 className="font-medium mb-1">Biomechanical Pillar</h4>
            <Badge variant="secondary">{exercise.pillar.replace('_', ' ')}</Badge>
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline">Close</Button>
          <Button>Add to Session</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

