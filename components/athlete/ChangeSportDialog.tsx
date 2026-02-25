'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useBasePath } from '@/lib/contexts/BasePathContext'
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { SportSelector, MultiSportSelector, SPORT_OPTIONS } from '@/components/onboarding/SportSelector'
import { SportType } from '@prisma/client'
import { Loader2, ArrowRight, AlertTriangle, Plus, X } from 'lucide-react'

interface ChangeSportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  clientId: string
  currentSport: SportType
  currentSecondarySports?: SportType[]
}

export function ChangeSportDialog({
  open,
  onOpenChange,
  clientId,
  currentSport,
  currentSecondarySports = [],
}: ChangeSportDialogProps) {
  const router = useRouter()
  const basePath = useBasePath()
  const { toast } = useToast()
  const [selectedPrimarySport, setSelectedPrimarySport] = useState<SportType>(currentSport)
  const [selectedSecondarySports, setSelectedSecondarySports] = useState<SportType[]>(currentSecondarySports)
  const [resetOnboarding, setResetOnboarding] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [activeTab, setActiveTab] = useState<'primary' | 'secondary'>('primary')
  const [step, setStep] = useState<'select' | 'confirm'>('select')

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      setSelectedPrimarySport(currentSport)
      setSelectedSecondarySports(currentSecondarySports)
      setStep('select')
      setActiveTab('primary')
      setResetOnboarding(true)
    }
  }, [open, currentSport, currentSecondarySports])

  const currentSportInfo = SPORT_OPTIONS.find(s => s.value === currentSport)
  const newSportInfo = SPORT_OPTIONS.find(s => s.value === selectedPrimarySport)

  const primaryChanged = selectedPrimarySport !== currentSport
  const secondaryChanged = JSON.stringify([...selectedSecondarySports].sort()) !== JSON.stringify([...currentSecondarySports].sort())
  const hasChanges = primaryChanged || secondaryChanged

  // Filter out primary sport from secondary options
  const filteredSecondarySports = selectedSecondarySports.filter(s => s !== selectedPrimarySport)

  const handleContinue = () => {
    if (!hasChanges) {
      onOpenChange(false)
      return
    }
    setStep('confirm')
  }

  const handleBack = () => {
    setStep('select')
  }

  const handleConfirm = async () => {
    if (!hasChanges) {
      onOpenChange(false)
      return
    }

    setIsSaving(true)
    try {
      const requestBody: Record<string, unknown> = {
        primarySport: selectedPrimarySport,
        secondarySports: filteredSecondarySports,
      }

      // If resetting onboarding (only when primary sport changed)
      if (resetOnboarding && primaryChanged) {
        requestBody.onboardingCompleted = false
        requestBody.onboardingStep = 1
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

      // Build success message
      let message = ''
      if (primaryChanged && secondaryChanged) {
        message = `Huvudsport ändrad till ${newSportInfo?.labelSv} och sekundära sporter uppdaterade.`
      } else if (primaryChanged) {
        message = resetOnboarding
          ? `Du har nu bytt till ${newSportInfo?.labelSv}. Slutför onboarding för att konfigurera dina nya inställningar.`
          : `Du har nu bytt till ${newSportInfo?.labelSv}.`
      } else {
        message = 'Dina sekundära sporter har uppdaterats.'
      }

      toast({
        title: 'Sporter uppdaterade!',
        description: message,
      })

      onOpenChange(false)

      // Navigate to onboarding if reset and primary changed, otherwise refresh
      if (resetOnboarding && primaryChanged) {
        router.push(`${basePath}/athlete/onboarding`)
      } else {
        router.refresh()
      }
    } catch (error) {
      console.error('Error changing sport:', error)
      toast({
        title: 'Fel',
        description: error instanceof Error ? error.message : 'Kunde inte uppdatera sporter. Försök igen.',
        variant: 'destructive',
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleClose = () => {
    setStep('select')
    setSelectedPrimarySport(currentSport)
    setSelectedSecondarySports(currentSecondarySports)
    setResetOnboarding(true)
    onOpenChange(false)
  }

  const handleSecondaryChange = (sports: SportType[]) => {
    // Filter out primary sport if accidentally selected
    setSelectedSecondarySports(sports.filter(s => s !== selectedPrimarySport))
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        {step === 'select' ? (
          <>
            <DialogHeader>
              <DialogTitle>Hantera sporter</DialogTitle>
              <DialogDescription>
                Ändra din huvudsport eller lägg till sekundära sporter för att kunna växla mellan olika träningsvyer.
              </DialogDescription>
            </DialogHeader>

            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'primary' | 'secondary')} className="mt-4">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="primary" className="gap-2">
                  Huvudsport
                  {primaryChanged && <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-[10px]">Ändrad</Badge>}
                </TabsTrigger>
                <TabsTrigger value="secondary" className="gap-2">
                  Sekundära sporter
                  {secondaryChanged && <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-[10px]">Ändrad</Badge>}
                </TabsTrigger>
              </TabsList>

              <TabsContent value="primary" className="mt-4">
                <div className="mb-4 p-3 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground">
                    Din huvudsport avgör vilken dashboard och träningsvy du ser som standard.
                  </p>
                </div>
                <SportSelector
                  value={selectedPrimarySport}
                  onChange={setSelectedPrimarySport}
                  locale="sv"
                  showFeatures={false}
                />
              </TabsContent>

              <TabsContent value="secondary" className="mt-4">
                <div className="mb-4 p-3 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground">
                    Sekundära sporter låter dig snabbt växla mellan olika träningsvyer utan att byta huvudsport.
                    Du kan välja upp till 2 sekundära sporter.
                  </p>
                </div>

                {/* Current selections */}
                {filteredSecondarySports.length > 0 && (
                  <div className="mb-4">
                    <Label className="text-sm text-muted-foreground mb-2 block">Valda sekundära sporter:</Label>
                    <div className="flex flex-wrap gap-2">
                      {filteredSecondarySports.map(sport => {
                        const info = SPORT_OPTIONS.find(s => s.value === sport)
                        return (
                          <Badge key={sport} variant="secondary" className="gap-1 pr-1">
                            <span>{info?.icon}</span>
                            <span>{info?.labelSv}</span>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-4 w-4 p-0 ml-1 hover:bg-destructive/20"
                              onClick={() => setSelectedSecondarySports(prev => prev.filter(s => s !== sport))}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </Badge>
                        )
                      })}
                    </div>
                  </div>
                )}

                <MultiSportSelector
                  value={filteredSecondarySports}
                  onChange={handleSecondaryChange}
                  locale="sv"
                  maxSelections={2}
                  excludeSports={[selectedPrimarySport]}
                />
              </TabsContent>
            </Tabs>

            <DialogFooter className="mt-6">
              <Button variant="outline" onClick={handleClose}>
                Avbryt
              </Button>
              <Button onClick={handleContinue} disabled={!hasChanges}>
                {hasChanges ? (
                  <>
                    Fortsätt
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                ) : (
                  'Inga ändringar'
                )}
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Bekräfta ändringar</DialogTitle>
              <DialogDescription>
                Granska dina ändringar innan du sparar.
              </DialogDescription>
            </DialogHeader>

            <div className="py-6 space-y-6">
              {/* Primary sport change */}
              {primaryChanged && (
                <div className="space-y-3">
                  <Label className="text-sm font-medium">Huvudsport</Label>
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
                </div>
              )}

              {/* Secondary sports change */}
              {secondaryChanged && (
                <div className="space-y-3">
                  <Label className="text-sm font-medium">Sekundära sporter</Label>
                  <div className="p-4 bg-muted rounded-lg">
                    {filteredSecondarySports.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center">Inga sekundära sporter valda</p>
                    ) : (
                      <div className="flex flex-wrap justify-center gap-3">
                        {filteredSecondarySports.map(sport => {
                          const info = SPORT_OPTIONS.find(s => s.value === sport)
                          return (
                            <div key={sport} className="text-center">
                              <span className="text-3xl block mb-1">{info?.icon}</span>
                              <span className="text-xs text-muted-foreground">{info?.labelSv}</span>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Warning for primary sport change */}
              {primaryChanged && (
                <div className="flex gap-3 p-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg">
                  <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-medium text-amber-800 dark:text-amber-200">Vad händer när du byter huvudsport?</p>
                    <ul className="mt-2 space-y-1 text-amber-700 dark:text-amber-300">
                      <li>• Din dashboard och träningsvyer anpassas till den nya sporten</li>
                      <li>• Dina tidigare sportinställningar sparas om du vill byta tillbaka</li>
                      <li>• Aktiva träningsprogram kan behöva uppdateras</li>
                    </ul>
                  </div>
                </div>
              )}

              {/* Re-onboarding option (only for primary sport change) */}
              {primaryChanged && (
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
              )}
            </div>

            <DialogFooter className="flex-col sm:flex-row gap-2">
              <Button variant="outline" onClick={handleBack} disabled={isSaving}>
                Tillbaka
              </Button>
              <Button onClick={handleConfirm} disabled={isSaving}>
                {isSaving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sparar...
                  </>
                ) : (
                  'Spara ändringar'
                )}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
