'use client'

/**
 * Program Selector
 *
 * A dropdown component that fetches and displays the client's training programs.
 * Used in QuickWorkoutDialog to select which program to add a workout to.
 */

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { format } from 'date-fns'
import { sv } from 'date-fns/locale'
import { Loader2, AlertCircle, Plus } from 'lucide-react'
import Link from 'next/link'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'

interface Program {
  id: string
  name: string
  startDate: string
  endDate: string
  isActive: boolean
  goalType?: string
}

interface ProgramSelectorProps {
  /** Client ID to fetch programs for */
  clientId: string
  /** Currently selected program ID */
  value: string
  /** Called when selection changes */
  onValueChange: (programId: string) => void
  /** Optional placeholder text */
  placeholder?: string
}

export function ProgramSelector({
  clientId,
  value,
  onValueChange,
  placeholder = 'Välj program...',
}: ProgramSelectorProps) {
  const [programs, setPrograms] = useState<Program[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const pathname = usePathname()
  // Extract business slug basePath (e.g. /star-by-thomson/coach/... → /star-by-thomson)
  const slugMatch = pathname.match(/^\/([^/]+)\/coach/)
  const basePath = slugMatch ? `/${slugMatch[1]}` : ''

  useEffect(() => {
    const fetchPrograms = async () => {
      setIsLoading(true)
      setError(null)

      try {
        const response = await fetch(`/api/programs?clientId=${clientId}`)
        const result = await response.json()

        if (!response.ok) {
          throw new Error(result.error || 'Kunde inte hämta program')
        }

        const programList = result.data || result.programs || []
        setPrograms(programList)

        // Auto-select if only one active program
        const activePrograms = programList.filter((p: Program) => p.isActive)
        if (activePrograms.length === 1 && !value) {
          onValueChange(activePrograms[0].id)
        }
      } catch (err) {
        console.error('Error fetching programs:', err)
        setError(err instanceof Error ? err.message : 'Kunde inte hämta program')
      } finally {
        setIsLoading(false)
      }
    }

    fetchPrograms()
  }, [clientId, value, onValueChange])

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 h-10 px-3 border rounded-md bg-muted/50">
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        <span className="text-sm text-muted-foreground">Laddar program...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center gap-2 h-10 px-3 border border-red-200 rounded-md bg-red-50">
        <AlertCircle className="h-4 w-4 text-red-500" />
        <span className="text-sm text-red-600">{error}</span>
      </div>
    )
  }

  if (programs.length === 0) {
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2 h-10 px-3 border border-amber-200 rounded-md bg-amber-50">
          <AlertCircle className="h-4 w-4 text-amber-500" />
          <span className="text-sm text-amber-700">Inga program hittades</span>
        </div>
        <Link href={`${basePath}/coach/programs/new`}>
          <Button variant="outline" size="sm" className="w-full">
            <Plus className="h-4 w-4 mr-2" />
            Skapa nytt program
          </Button>
        </Link>
      </div>
    )
  }

  // Sort: active programs first, then by start date descending
  const sortedPrograms = [...programs].sort((a, b) => {
    if (a.isActive && !b.isActive) return -1
    if (!a.isActive && b.isActive) return 1
    return new Date(b.startDate).getTime() - new Date(a.startDate).getTime()
  })

  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {sortedPrograms.map((program) => (
          <SelectItem key={program.id} value={program.id}>
            <div className="flex items-center gap-2">
              {program.isActive && (
                <span className="w-2 h-2 rounded-full bg-green-500" title="Aktivt" />
              )}
              <div className="flex flex-col">
                <span className="font-medium">{program.name}</span>
                <span className="text-xs text-muted-foreground">
                  {format(new Date(program.startDate), 'd MMM', { locale: sv })} -{' '}
                  {format(new Date(program.endDate), 'd MMM yyyy', { locale: sv })}
                </span>
              </div>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
