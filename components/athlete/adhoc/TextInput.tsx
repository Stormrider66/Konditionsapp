'use client'

/**
 * Text Input Component
 *
 * Free-form text input for describing a workout.
 * Includes helpful examples and character count.
 */

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { format } from 'date-fns'
import { enUS } from 'date-fns/locale'
import { sv } from 'date-fns/locale'
import { CalendarIcon, Loader2, Lightbulb } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useLocale, useTranslations } from '@/i18n/client'

const EXAMPLE_KEYS = ['run5k', 'strengthSets', 'amrap', 'cyclingIntervals', 'gymUpperBody']

interface TextInputProps {
  onSubmit: (data: { text: string; workoutDate: Date }) => Promise<void>
  isProcessing?: boolean
}

export function TextInput({ onSubmit, isProcessing }: TextInputProps) {
  const t = useTranslations('components.adHocTextInput')
  const locale = useLocale()
  const [text, setText] = useState('')
  const [workoutDate, setWorkoutDate] = useState<Date>(new Date())
  const [showExamples, setShowExamples] = useState(false)
  const dateLocale = locale === 'en' ? enUS : sv

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
          {t('title')}
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Date picker */}
        <div className="space-y-2">
          <label className="text-sm font-medium">{t('date.label')}</label>
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
                  format(workoutDate, 'PPP', { locale: dateLocale })
                ) : (
                  <span>{t('date.placeholder')}</span>
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
                locale={dateLocale}
              />
            </PopoverContent>
          </Popover>
        </div>

        {/* Text input */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium">{t('description.label')}</label>
            <Button
              variant="ghost"
              size="sm"
              className="h-auto p-1 text-xs"
              onClick={() => setShowExamples(!showExamples)}
            >
              <Lightbulb className="h-3 w-3 mr-1" />
              {t('examples.show')}
            </Button>
          </div>

          <Textarea
            placeholder={t('description.placeholder')}
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="min-h-[150px] resize-none"
            disabled={isProcessing}
          />

          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{t('description.characterCount', { count: text.length })}</span>
            <span>{t('description.minRecommended')}</span>
          </div>
        </div>

        {/* Examples */}
        {showExamples && (
          <div className="rounded-lg border bg-muted/30 p-4 space-y-2">
            <p className="text-sm font-medium">{t('examples.title')}</p>
            <div className="space-y-2">
              {EXAMPLE_KEYS.map((exampleKey) => {
                const example = t(`examples.items.${exampleKey}`)
                return (
                  <button
                    key={exampleKey}
                    className="block w-full text-left text-sm p-2 rounded hover:bg-accent transition-colors"
                    onClick={() => handleExampleClick(example)}
                  >
                    &ldquo;{example}&rdquo;
                  </button>
                )
              })}
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
              {t('actions.analyzing')}
            </>
          ) : (
            t('actions.continue')
          )}
        </Button>
      </CardFooter>
    </Card>
  )
}
