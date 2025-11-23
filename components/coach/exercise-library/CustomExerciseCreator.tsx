// components/coach/exercise-library/CustomExerciseCreator.tsx
/**
 * Custom Exercise Creator Component
 *
 * Allows coaches to create custom exercises when public library doesn't have what they need.
 *
 * Features:
 * - Complete exercise metadata (names in Swedish and English)
 * - Biomechanical pillar classification
 * - Progression level assignment
 * - Equipment requirements
 * - Difficulty rating
 * - Detailed instructions
 * - Video URL linking
 * - Plyometric contact calculation
 * - Form validation
 * - Preview before save
 * - Duplicate detection
 *
 * Validation:
 * - Required: name, category, biomechanical pillar
 * - Automatic Swedish/English name generation if not provided
 * - Equipment suggestions based on pillar
 * - Contact per rep validation for plyometrics
 */

'use client'

import { useState } from 'react'
import { BiomechanicalPillar, ProgressionLevel, PlyometricIntensity } from '@prisma/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Save, X, AlertCircle, CheckCircle2 } from 'lucide-react'
import { useToast } from '@/components/ui/use-toast'

interface CustomExerciseCreatorProps {
  open: boolean
  onClose: () => void
  onSuccess: (exerciseId: string) => void
  userId: string
}

interface ExerciseFormData {
  name: string
  nameSv: string
  nameEn: string
  category: string
  muscleGroup: string
  biomechanicalPillar: BiomechanicalPillar | ''
  progressionLevel: ProgressionLevel | ''
  description: string
  instructions: string
  equipment: string
  difficulty: string
  videoUrl: string
  imageUrl: string
  plyometricIntensity: PlyometricIntensity | ''
  contactsPerRep: number | null
}

export function CustomExerciseCreator({
  open,
  onClose,
  onSuccess,
  userId,
}: CustomExerciseCreatorProps) {
  const { toast } = useToast()
  const [isSaving, setIsSaving] = useState(false)
  const [showPreview, setShowPreview] = useState(false)

  // Form data
  const [formData, setFormData] = useState<ExerciseFormData>({
    name: '',
    nameSv: '',
    nameEn: '',
    category: '',
    muscleGroup: '',
    biomechanicalPillar: '',
    progressionLevel: '',
    description: '',
    instructions: '',
    equipment: '',
    difficulty: '',
    videoUrl: '',
    imageUrl: '',
    plyometricIntensity: '',
    contactsPerRep: null,
  })

  // Validation errors
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Handle input change
  const handleChange = (field: keyof ExerciseFormData, value: any) => {
    setFormData({ ...formData, [field]: value })
    // Clear error for this field
    if (errors[field]) {
      const newErrors = { ...errors }
      delete newErrors[field]
      setErrors(newErrors)
    }
  }

  // Validate form
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!formData.name.trim()) {
      newErrors.name = 'Exercise name is required'
    }

    if (!formData.category) {
      newErrors.category = 'Category is required'
    }

    if (!formData.biomechanicalPillar) {
      newErrors.biomechanicalPillar = 'Biomechanical pillar is required'
    }

    if (formData.category === 'PLYOMETRIC') {
      if (!formData.plyometricIntensity) {
        newErrors.plyometricIntensity = 'Plyometric intensity is required for plyometric exercises'
      }
      if (!formData.contactsPerRep || formData.contactsPerRep < 1) {
        newErrors.contactsPerRep = 'Contacts per rep is required for plyometric exercises'
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  // Handle save
  const handleSave = async () => {
    if (!validateForm()) {
      toast({
        title: 'Validation Error',
        description: 'Please fill in all required fields',
        variant: 'destructive',
      })
      return
    }

    setIsSaving(true)

    try {
      // Auto-generate Swedish/English names if not provided
      const nameSv = formData.nameSv || formData.name
      const nameEn = formData.nameEn || formData.name

      const response = await fetch('/api/exercises', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          nameSv,
          nameEn,
          category: formData.category,
          muscleGroup: formData.muscleGroup || null,
          biomechanicalPillar: formData.biomechanicalPillar,
          progressionLevel: formData.progressionLevel || null,
          description: formData.description || null,
          instructions: formData.instructions || null,
          equipment: formData.equipment || null,
          difficulty: formData.difficulty || 'Intermediate',
          videoUrl: formData.videoUrl || null,
          imageUrl: formData.imageUrl || null,
          plyometricIntensity: formData.plyometricIntensity || null,
          contactsPerRep: formData.contactsPerRep || null,
          userId,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to create exercise')
      }

      const exercise = await response.json()

      toast({
        title: 'Exercise created',
        description: `${exercise.name} has been added to your custom library`,
      })

      onSuccess(exercise.id)
      handleReset()
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create exercise',
        variant: 'destructive',
      })
    } finally {
      setIsSaving(false)
    }
  }

  // Reset form
  const handleReset = () => {
    setFormData({
      name: '',
      nameSv: '',
      nameEn: '',
      category: '',
      muscleGroup: '',
      biomechanicalPillar: '',
      progressionLevel: '',
      description: '',
      instructions: '',
      equipment: '',
      difficulty: '',
      videoUrl: '',
      imageUrl: '',
      plyometricIntensity: '',
      contactsPerRep: null,
    })
    setErrors({})
    setShowPreview(false)
  }

  // Get equipment suggestions based on pillar
  const getEquipmentSuggestions = (pillar: BiomechanicalPillar | '') => {
    const suggestions: Record<string, string[]> = {
      POSTERIOR_CHAIN: ['Barbell', 'Dumbbells', 'Kettlebell', 'Resistance Band', 'None'],
      KNEE_DOMINANCE: ['Barbell', 'Dumbbells', 'Smith Machine', 'Leg Press', 'None'],
      UNILATERAL: ['Dumbbells', 'Kettlebell', 'TRX', 'None'],
      FOOT_ANKLE: ['None', 'Resistance Band', 'Balance Board'],
      ANTI_ROTATION_CORE: ['Cable Machine', 'Resistance Band', 'Medicine Ball', 'None'],
      UPPER_BODY: ['Barbell', 'Dumbbells', 'Pull-up Bar', 'Resistance Band'],
    }
    return pillar ? suggestions[pillar] || [] : []
  }

  // Render preview
  const renderPreview = () => {
    return (
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Exercise Preview</DialogTitle>
            <DialogDescription>Review your custom exercise before saving</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Name */}
            <div>
              <h3 className="text-lg font-semibold">{formData.name}</h3>
              <p className="text-sm text-gray-500">
                SV: {formData.nameSv || formData.name} | EN: {formData.nameEn || formData.name}
              </p>
            </div>

            {/* Badges */}
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary">{formData.category}</Badge>
              {formData.biomechanicalPillar && (
                <Badge variant="secondary">{formData.biomechanicalPillar}</Badge>
              )}
              {formData.progressionLevel && (
                <Badge variant="outline">{formData.progressionLevel}</Badge>
              )}
              {formData.difficulty && <Badge variant="outline">{formData.difficulty}</Badge>}
              {formData.equipment && <Badge variant="outline">{formData.equipment}</Badge>}
            </div>

            {/* Muscle Group */}
            {formData.muscleGroup && (
              <div>
                <Label className="text-xs">Muscle Group</Label>
                <p className="text-sm">{formData.muscleGroup}</p>
              </div>
            )}

            {/* Description */}
            {formData.description && (
              <div>
                <Label className="text-xs">Description</Label>
                <p className="text-sm text-gray-700">{formData.description}</p>
              </div>
            )}

            {/* Instructions */}
            {formData.instructions && (
              <div>
                <Label className="text-xs">Instructions</Label>
                <p className="text-sm text-gray-700 whitespace-pre-line">
                  {formData.instructions}
                </p>
              </div>
            )}

            {/* Plyometric Details */}
            {formData.category === 'PLYOMETRIC' && (
              <div className="bg-orange-50 p-3 rounded">
                <Label className="text-xs">Plyometric Details</Label>
                <div className="flex gap-4 mt-1">
                  <div>
                    <span className="text-xs text-gray-600">Intensity:</span>
                    <span className="text-sm font-medium ml-2">
                      {formData.plyometricIntensity}
                    </span>
                  </div>
                  <div>
                    <span className="text-xs text-gray-600">Contacts per rep:</span>
                    <span className="text-sm font-medium ml-2">{formData.contactsPerRep}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Video */}
            {formData.videoUrl && (
              <div>
                <Label className="text-xs">Video URL</Label>
                <a
                  href={formData.videoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-blue-600 hover:underline"
                >
                  {formData.videoUrl}
                </a>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPreview(false)}>
              Edit
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              <Save className="h-4 w-4 mr-2" />
              {isSaving ? 'Saving...' : 'Save Exercise'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Custom Exercise</DialogTitle>
            <DialogDescription>
              Add a new exercise to your personal library
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Basic Information */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Basic Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Name */}
                <div>
                  <Label>
                    Exercise Name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => handleChange('name', e.target.value)}
                    placeholder="e.g., Single Leg Romanian Deadlift"
                  />
                  {errors.name && (
                    <p className="text-xs text-red-500 mt-1">{errors.name}</p>
                  )}
                </div>

                {/* Swedish and English Names */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Swedish Name (Optional)</Label>
                    <Input
                      value={formData.nameSv}
                      onChange={(e) => handleChange('nameSv', e.target.value)}
                      placeholder="e.g., Enbensmarclyft"
                    />
                  </div>
                  <div>
                    <Label>English Name (Optional)</Label>
                    <Input
                      value={formData.nameEn}
                      onChange={(e) => handleChange('nameEn', e.target.value)}
                      placeholder="e.g., Single Leg RDL"
                    />
                  </div>
                </div>

                {/* Muscle Group */}
                <div>
                  <Label>Muscle Group</Label>
                  <Input
                    value={formData.muscleGroup}
                    onChange={(e) => handleChange('muscleGroup', e.target.value)}
                    placeholder="e.g., Gluteus, Hamstrings, Core"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Classification */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Classification</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Category */}
                <div>
                  <Label>
                    Category <span className="text-red-500">*</span>
                  </Label>
                  <Select
                    value={formData.category}
                    onValueChange={(value) => handleChange('category', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="STRENGTH">Strength</SelectItem>
                      <SelectItem value="PLYOMETRIC">Plyometric</SelectItem>
                      <SelectItem value="CORE">Core</SelectItem>
                      <SelectItem value="MOBILITY">Mobility</SelectItem>
                      <SelectItem value="CONDITIONING">Conditioning</SelectItem>
                    </SelectContent>
                  </Select>
                  {errors.category && (
                    <p className="text-xs text-red-500 mt-1">{errors.category}</p>
                  )}
                </div>

                {/* Biomechanical Pillar */}
                <div>
                  <Label>
                    Biomechanical Pillar <span className="text-red-500">*</span>
                  </Label>
                  <Select
                    value={formData.biomechanicalPillar}
                    onValueChange={(value) =>
                      handleChange('biomechanicalPillar', value as BiomechanicalPillar)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select pillar" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="POSTERIOR_CHAIN">Posterior Chain</SelectItem>
                      <SelectItem value="KNEE_DOMINANCE">Knee Dominance</SelectItem>
                      <SelectItem value="UNILATERAL">Unilateral</SelectItem>
                      <SelectItem value="FOOT_ANKLE">Foot & Ankle</SelectItem>
                      <SelectItem value="ANTI_ROTATION_CORE">Core (Anti-Rotation)</SelectItem>
                      <SelectItem value="UPPER_BODY">Upper Body</SelectItem>
                    </SelectContent>
                  </Select>
                  {errors.biomechanicalPillar && (
                    <p className="text-xs text-red-500 mt-1">{errors.biomechanicalPillar}</p>
                  )}
                </div>

                {/* Progression Level */}
                <div>
                  <Label>Progression Level</Label>
                  <Select
                    value={formData.progressionLevel}
                    onValueChange={(value) =>
                      handleChange('progressionLevel', value as ProgressionLevel)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select level" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="LEVEL_1">Level 1 (Static/Stability)</SelectItem>
                      <SelectItem value="LEVEL_2">Level 2 (Strength/Loading)</SelectItem>
                      <SelectItem value="LEVEL_3">Level 3 (Dynamic/Ballistic)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Equipment */}
                <div>
                  <Label>Equipment</Label>
                  <Select
                    value={formData.equipment}
                    onValueChange={(value) => handleChange('equipment', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select equipment" />
                    </SelectTrigger>
                    <SelectContent>
                      {getEquipmentSuggestions(formData.biomechanicalPillar).map((eq) => (
                        <SelectItem key={eq} value={eq}>
                          {eq}
                        </SelectItem>
                      ))}
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Difficulty */}
                <div>
                  <Label>Difficulty</Label>
                  <Select
                    value={formData.difficulty}
                    onValueChange={(value) => handleChange('difficulty', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select difficulty" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Beginner">Beginner</SelectItem>
                      <SelectItem value="Intermediate">Intermediate</SelectItem>
                      <SelectItem value="Advanced">Advanced</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Plyometric Details (only if category is PLYOMETRIC) */}
            {formData.category === 'PLYOMETRIC' && (
              <Card className="border-orange-200 bg-orange-50/50">
                <CardHeader>
                  <CardTitle className="text-sm">Plyometric Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Intensity */}
                  <div>
                    <Label>
                      Plyometric Intensity <span className="text-red-500">*</span>
                    </Label>
                    <Select
                      value={formData.plyometricIntensity}
                      onValueChange={(value) =>
                        handleChange('plyometricIntensity', value as PlyometricIntensity)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select intensity" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="LOW">Low (&gt;250ms ground contact)</SelectItem>
                        <SelectItem value="MODERATE">Moderate (150-250ms)</SelectItem>
                        <SelectItem value="HIGH">High (&lt;150ms, depth jumps)</SelectItem>
                      </SelectContent>
                    </Select>
                    {errors.plyometricIntensity && (
                      <p className="text-xs text-red-500 mt-1">{errors.plyometricIntensity}</p>
                    )}
                  </div>

                  {/* Contacts Per Rep */}
                  <div>
                    <Label>
                      Contacts Per Rep <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      type="number"
                      min="1"
                      value={formData.contactsPerRep || ''}
                      onChange={(e) =>
                        handleChange('contactsPerRep', parseInt(e.target.value) || null)
                      }
                      placeholder="e.g., 1 for box jump, 10 for jump rope"
                    />
                    {errors.contactsPerRep && (
                      <p className="text-xs text-red-500 mt-1">{errors.contactsPerRep}</p>
                    )}
                  </div>

                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription className="text-xs">
                      Contacts per rep is used to calculate total plyometric volume and ensure
                      safe training loads. For bilateral jumps: 1 contact per rep. For unilateral:
                      1 contact per leg.
                    </AlertDescription>
                  </Alert>
                </CardContent>
              </Card>
            )}

            {/* Instructions */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Instructions & Media</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Description */}
                <div>
                  <Label>Description (Short)</Label>
                  <Textarea
                    value={formData.description}
                    onChange={(e) => handleChange('description', e.target.value)}
                    rows={2}
                    placeholder="Brief description of the exercise (1-2 sentences)"
                  />
                </div>

                {/* Instructions */}
                <div>
                  <Label>Instructions (Detailed)</Label>
                  <Textarea
                    value={formData.instructions}
                    onChange={(e) => handleChange('instructions', e.target.value)}
                    rows={6}
                    placeholder="Step-by-step instructions:&#10;1. Starting position...&#10;2. Movement execution...&#10;3. Key coaching cues..."
                  />
                </div>

                {/* Video URL */}
                <div>
                  <Label>Video URL (Optional)</Label>
                  <Input
                    value={formData.videoUrl}
                    onChange={(e) => handleChange('videoUrl', e.target.value)}
                    placeholder="https://youtube.com/watch?v=..."
                  />
                </div>
              </CardContent>
            </Card>

            {/* Validation Summary */}
            {Object.keys(errors).length > 0 && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Please fix the following errors:
                  <ul className="list-disc list-inside mt-2">
                    {Object.values(errors).map((error, idx) => (
                      <li key={idx} className="text-xs">
                        {error}
                      </li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                handleReset()
                onClose()
              }}
            >
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                if (validateForm()) {
                  setShowPreview(true)
                }
              }}
            >
              Preview
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              <Save className="h-4 w-4 mr-2" />
              {isSaving ? 'Saving...' : 'Save Exercise'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview Modal */}
      {renderPreview()}
    </>
  )
}
