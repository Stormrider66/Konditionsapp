'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import { SportSelector, SPORT_OPTIONS } from '@/components/onboarding/SportSelector'
import { SportType } from '@prisma/client'
import { Loader2, ArrowRight, AlertTriangle } from 'lucide-react'

interface ChangeSportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  clientId: string
  currentSport: SportType
}

export function ChangeSportDialog({
  open,
  onOpenChange,
  clientId,
  currentSport,
}: ChangeSportDialogProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [selectedSport, setSelectedSport] = useState<SportType>(currentSport)
  const [resetOnboarding, setResetOnboarding] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [step, setStep] = useState<'select' | 'confirm'>('select')

  const currentSportInfo = SPORT_OPTIONS.find(s => s.value === currentSport)
  const newSportInfo = SPORT_OPTIONS.find(s => s.value === selectedSport)
  const hasChanged = selectedSport !== currentSport

  const handleContinue = () => {
    if (!hasChanged) {
      onOpenChange(false)
      return
    }
    setStep('confirm')
  }

  const handleBack = () => {
    setStep('select')
  }

  const handleConfirm = async () => {
    if (!hasChanged) {
      onOpenChange(false)
      return
    }

    setIsSaving(true)
    try {
      const requestBody: Record<string, unknown> = {
        primarySport: selectedSport,
      }

      // If resetting onboarding, also reset the onboarding status
      if (resetOnboarding) {
        requestBody.onboardingCompleted = false
        requestBody.onboardingStep = 1 // Skip sport selection step (already done)
      }

      const response = await fetch(`/api/sport-profile/${clientId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to update sport')
      }

      toast({
        title: 'Sport bytt!',
        description: resetOnboarding
          ? `Du har nu bytt till ${newSportInfo?.labelSv}. Slutför onboarding för att konfigurera dina nya inställningar.`
          : `Du har nu bytt till ${newSportInfo?.labelSv}.`,
      })

      onOpenChange(false)

      // Navigate to onboarding if reset, otherwise refresh
      if (resetOnboarding) {
        router.push('/athlete/onboarding')
      } else {
        router.refresh()
      }
    } catch (error) {
      console.error('Error changing sport:', error)
      toast({
        title: 'Fel',
        description: error instanceof Error ? error.message : 'Kunde inte byta sport. Försök igen.',
        variant: 'destructive',
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleClose = () => {
    setStep('select')
    setSelectedSport(currentSport)
    setResetOnboarding(true)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        {step === 'select' ? (
          <>
            <DialogHeader>
              <DialogTitle>Byt huvudsport</DialogTitle>
              <DialogDescription>
                Din nuvarande sport är <strong>{currentSportInfo?.labelSv}</strong>.
                Välj en ny sport nedan för att byta din träningsinriktning.
              </DialogDescription>
            </DialogHeader>

            <div className="py-4">
              <SportSelector
                value={selectedSport}
                onChange={setSelectedSport}
                locale="sv"
                showFeatures={true}
              />
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={handleClose}>
                Avbryt
              </Button>
              <Button onClick={handleContinue} disabled={!hasChanged}>
                Fortsätt
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Bekräfta sportbyte</DialogTitle>
              <DialogDescription>
                Du är på väg att byta från {currentSportInfo?.labelSv} till {newSportInfo?.labelSv}.
              </DialogDescription>
            </DialogHeader>

            <div className="py-6 space-y-6">
              {/* Visual sport change */}
              <div className="flex items-center justify-center gap-4 p-4 bg-muted rounded-lg">
                <div className="text-center">
                  <span className="text-4xl block mb-2">{currentSportInfo?.icon}</span>
                  <span className="text-sm text-muted-foreground">{currentSportInfo?.labelSv}</span>
                </div>
                <ArrowRight className="h-8 w-8 text-muted-foreground" />
                <div className="text-center">
                  <span className="text-4xl block mb-2">{newSportInfo?.icon}</span>
                  <span className="text-sm font-medium">{newSportInfo?.labelSv}</span>
                </div>
              </div>

              {/* Warning */}
              <div className="flex gap-3 p-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg">
                <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-amber-800 dark:text-amber-200">Vad händer när du byter sport?</p>
                  <ul className="mt-2 space-y-1 text-amber-700 dark:text-amber-300">
                    <li>• Din dashboard och träningsvyer anpassas till den nya sporten</li>
                    <li>• Dina tidigare sportinställningar sparas om du vill byta tillbaka</li>
                    <li>• Aktiva träningsprogram kan behöva uppdateras</li>
                  </ul>
                </div>
              </div>

              {/* Re-onboarding option */}
              <div className="flex items-start space-x-3 p-4 border rounded-lg">
                <Checkbox
                  id="reset-onboarding"
                  checked={resetOnboarding}
                  onCheckedChange={(checked) => setResetOnboarding(checked as boolean)}
                />
                <div className="space-y-1">
                  <Label htmlFor="reset-onboarding" className="font-medium cursor-pointer">
                    Kör onboarding för nya sporten (rekommenderas)
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Konfigurera sportspecifika inställningar som tröskelvärden, mål och utrustning för {newSportInfo?.labelSv}.
                  </p>
                </div>
              </div>
            </div>

            <DialogFooter className="flex-col sm:flex-row gap-2">
              <Button variant="outline" onClick={handleBack} disabled={isSaving}>
                Tillbaka
              </Button>
              <Button onClick={handleConfirm} disabled={isSaving}>
                {isSaving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Byter sport...
                  </>
                ) : (
                  <>
                    Bekräfta byte till {newSportInfo?.labelSv}
                  </>
                )}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
