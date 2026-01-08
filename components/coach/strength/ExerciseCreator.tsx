'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { toast } from '@/hooks/use-toast'
import { Loader2, Plus, X } from 'lucide-react'

// Pillars from schema
const BIOMECHANICAL_PILLARS = [
  { value: 'POSTERIOR_CHAIN', label: 'Posterior Chain (Glute/Ham)' },
  { value: 'KNEE_DOMINANCE', label: 'Knee Dominance (Quad)' },
  { value: 'UNILATERAL', label: 'Unilateral (Single Leg)' },
  { value: 'FOOT_ANKLE', label: 'Foot & Ankle' },
  { value: 'ANTI_ROTATION_CORE', label: 'Anti-Rotation Core' },
  { value: 'UPPER_BODY', label: 'Upper Body' },
]

const EQUIPMENT_OPTIONS = [
  'Bodyweight', 'Barbell', 'Dumbbell', 'Kettlebell', 'Resistance Band', 
  'Cable Machine', 'Box', 'Bench', 'Medicine Ball', 'TRX'
]

export function ExerciseCreator({ onClose }: { onClose?: () => void }) {
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    nameSv: '', // Swedish name
    category: 'STRENGTH',
    pillar: '',
    difficulty: 'Intermediate',
    equipment: [] as string[],
    muscleGroup: '',
    description: '',
    instructions: '',
    videoUrl: '',
    progressionLevel: 'LEVEL_2'
  })

  const handleEquipmentToggle = (item: string) => {
    setFormData(prev => ({
      ...prev,
      equipment: prev.equipment.includes(item)
        ? prev.equipment.filter(e => e !== item)
        : [...prev.equipment, item]
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1500))

    console.log('Submitting exercise:', formData)
    
    toast({
      title: 'Exercise Created',
      description: `${formData.name} has been added to the library.`,
    })

    setIsLoading(false)
    if (onClose) onClose()
  }

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Create Custom Exercise</CardTitle>
        <CardDescription>Add a new exercise to your personal library.</CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-6">
          {/* Basic Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Exercise Name (English)</Label>
              <Input 
                id="name" 
                placeholder="e.g., Barbell Squat" 
                value={formData.name}
                onChange={e => setFormData({...formData, name: e.target.value})}
                required 
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="nameSv">Exercise Name (Swedish)</Label>
              <Input 
                id="nameSv" 
                placeholder="t.ex., Knäböj med stång" 
                value={formData.nameSv}
                onChange={e => setFormData({...formData, nameSv: e.target.value})}
              />
            </div>
          </div>

          {/* Category & Classification */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Category</Label>
              <Select 
                value={formData.category} 
                onValueChange={(val) => setFormData({...formData, category: val})}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="STRENGTH">Strength</SelectItem>
                  <SelectItem value="PLYOMETRIC">Plyometric</SelectItem>
                  <SelectItem value="CORE">Core Stability</SelectItem>
                  <SelectItem value="RECOVERY">Mobility/Recovery</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>Biomechanical Pillar</Label>
              <Select 
                value={formData.pillar} 
                onValueChange={(val) => setFormData({...formData, pillar: val})}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Primary movement pattern" />
                </SelectTrigger>
                <SelectContent>
                  {BIOMECHANICAL_PILLARS.map(p => (
                    <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Progression Level */}
          <div className="space-y-2">
            <Label>Progression Level</Label>
            <RadioGroup 
              value={formData.progressionLevel} 
              onValueChange={(val) => setFormData({...formData, progressionLevel: val})}
              className="flex flex-col space-y-1"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="LEVEL_1" id="l1" />
                <Label htmlFor="l1" className="font-normal">
                  <span className="font-semibold">Level 1 (Foundation):</span> Static, stability-focused, low complexity
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="LEVEL_2" id="l2" />
                <Label htmlFor="l2" className="font-normal">
                  <span className="font-semibold">Level 2 (Strength):</span> Dynamic, loading-focused, moderate complexity
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="LEVEL_3" id="l3" />
                <Label htmlFor="l3" className="font-normal">
                  <span className="font-semibold">Level 3 (Power):</span> Ballistic, velocity-focused, high complexity
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Equipment */}
          <div className="space-y-2">
            <Label>Equipment Required</Label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {EQUIPMENT_OPTIONS.map(item => (
                <div key={item} className="flex items-center space-x-2">
                  <Checkbox 
                    id={`eq-${item}`} 
                    checked={formData.equipment.includes(item)}
                    onCheckedChange={() => handleEquipmentToggle(item)}
                  />
                  <Label htmlFor={`eq-${item}`} className="text-sm font-normal cursor-pointer">
                    {item}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          {/* Details */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="muscleGroup">Target Muscles</Label>
              <Input 
                id="muscleGroup" 
                placeholder="e.g., Quadriceps, Glutes" 
                value={formData.muscleGroup}
                onChange={e => setFormData({...formData, muscleGroup: e.target.value})}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Short Description</Label>
              <Textarea 
                id="description" 
                placeholder="Brief overview of the exercise..." 
                value={formData.description}
                onChange={e => setFormData({...formData, description: e.target.value})}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="videoUrl">Video URL (optional)</Label>
              <Input 
                id="videoUrl" 
                placeholder="https://..." 
                value={formData.videoUrl}
                onChange={e => setFormData({...formData, videoUrl: e.target.value})}
              />
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Exercise
          </Button>
        </CardFooter>
      </form>
    </Card>
  )
}

