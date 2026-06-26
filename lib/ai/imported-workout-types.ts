export type ImportedWorkoutType = 'STRENGTH' | 'CARDIO' | 'HYBRID'

export type ImportedWorkoutInputKind = 'text' | 'excel' | 'csv' | 'pdf' | 'image'

export interface ImportedWorkoutSourcePreview {
  kind: ImportedWorkoutInputKind
  filename?: string | null
}

export interface ImportedWorkoutPreviewSection {
  label: string
  items: string[]
}

export interface ImportedWorkoutParsedPreview {
  source: ImportedWorkoutSourcePreview
  workoutType: ImportedWorkoutType
  name: string
  assignedDate: string
  summary: string
  notes?: string | null
  warnings: string[]
  sections: ImportedWorkoutPreviewSection[]
}

export interface ImportedWorkoutEditableFields {
  assignedDate?: string
  name?: string
  workoutType?: ImportedWorkoutType
  notes?: string
}
