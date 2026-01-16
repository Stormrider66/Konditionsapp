'use client'

/**
 * Text Input Component
 *
 * Free-form text input for describing a workout.
 * Includes helpful examples and character count.
 */

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { format } from 'date-fns'
import { sv } from 'date-fns/locale'
import { CalendarIcon, Loader2, Lightbulb } from 'lucide-react'
import { cn } from '@/lib/utils'

const EXAMPLES = [
  'Sprang 5 km på 28 minuter, lätt tempo',
  '3x10 knäböj med 80 kg, 3x8 bänkpress 60 kg, 3x12 rodd',
  'AMRAP 20 min: 5 pull-ups, 10 push-ups, 15 air squats. 8 rundor + 5 reps',
  'Cyklade 45 minuter intervaller, 4x4 min i zon 4',
  'Passade på gymmet, gjorde överkropp - axelpress, lateral raises, triceps',
]

interface TextInputProps {
  onSubmit: (data: { text: string; workoutDate: Date }) => Promise<void>
  isProcessing?: boolean
}

export function TextInput({ onSubmit, isProcessing }: TextInputProps) {
  const [text, setText] = useState('')
  const [workoutDate, setWorkoutDate] = useState<Date>(new Date())
  const [showExamples, setShowExamples] = useState(false)

  const handleSubmit = async () => {
    if (!text.trim()) return
    await onSubmit({ text: text.trim(), workoutDate })
  }

  const handleExampleClick = (example: string) => {
    setText(example)
    setShowExamples(false)
  }

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Beskriv ditt pass
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Date picker */}
        <div className="space-y-2">
          <label className="text-sm font-medium">När genomfördes passet?</label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  'w-full justify-start text-left font-normal',
                  !workoutDate && 'text-muted-foreground'
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {workoutDate ? (
                  format(workoutDate, 'PPP', { locale: sv })
                ) : (
                  <span>Välj datum</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={workoutDate}
                onSelect={(date) => date && setWorkoutDate(date)}
                disabled={(date) => date > new Date()}
                initialFocus
                locale={sv}
              />
            </PopoverContent>
          </Popover>
        </div>

        {/* Text input */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium">Beskrivning</label>
            <Button
              variant="ghost"
              size="sm"
              className="h-auto p-1 text-xs"
              onClick={() => setShowExamples(!showExamples)}
            >
              <Lightbulb className="h-3 w-3 mr-1" />
              Visa exempel
            </Button>
          </div>

          <Textarea
            placeholder="Beskriv vad du gjorde, t.ex. 'Körde 5 km löpning i 25 min' eller '3x10 knäböj, 3x8 bänkpress'"
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="min-h-[150px] resize-none"
            disabled={isProcessing}
          />

          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{text.length} tecken</span>
            <span>Min 10 tecken rekommenderas</span>
          </div>
        </div>

        {/* Examples */}
        {showExamples && (
          <div className="rounded-lg border bg-muted/30 p-4 space-y-2">
            <p className="text-sm font-medium">Klicka på ett exempel:</p>
            <div className="space-y-2">
              {EXAMPLES.map((example, i) => (
                <button
                  key={i}
                  className="block w-full text-left text-sm p-2 rounded hover:bg-accent transition-colors"
                  onClick={() => handleExampleClick(example)}
                >
                  &ldquo;{example}&rdquo;
                </button>
              ))}
            </div>
          </div>
        )}
      </CardContent>

      <CardFooter>
        <Button
          className="w-full"
          onClick={handleSubmit}
          disabled={text.trim().length < 10 || isProcessing}
        >
          {isProcessing ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Analyserar...
            </>
          ) : (
            'Fortsätt'
          )}
        </Button>
      </CardFooter>
    </Card>
  )
}
