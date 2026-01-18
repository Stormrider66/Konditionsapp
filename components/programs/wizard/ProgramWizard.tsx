// components/programs/wizard/ProgramWizard.tsx
// ... imports
import { GlassCard, GlassCardContent } from '@/components/ui/GlassCard'
// ...

export function ProgramWizard({ clients }: ProgramWizardProps) {
  // ... existing logic ...

  return (
    <GlassCard className="w-full max-w-4xl mx-auto">
      <GlassCardContent className="p-6">
        {/* Cancel Button */}
        <div className="flex justify-end mb-4">
          <Button variant="ghost" size="sm" onClick={handleCancel}>
            <X className="h-4 w-4 mr-1" />
            Avbryt
          </Button>
        </div>
// ... rest of component

        {/* Progress Indicator */}
        <div className="mb-8">
          <WizardProgress currentStep={currentStep} />
        </div>

        {/* Step Content */}
        <div className="min-h-[400px]">
          {currentStep === 1 && (
            <SportSelector
              selectedSport={selectedSport}
              onSelect={handleSportSelect}
            />
          )}

          {currentStep === 2 && selectedSport && (
            <GoalSelector
              sport={selectedSport}
              selectedGoal={selectedGoal}
              onSelect={handleGoalSelect}
              onBack={handleBack}
            />
          )}

          {currentStep === 3 && selectedSport && (
            <DataSourceSelector
              sport={selectedSport}
              selectedSource={selectedDataSource}
              onSelect={handleDataSourceSelect}
              dataSources={getDataSources()}
            />
          )}

          {currentStep === 4 && selectedSport && selectedGoal && selectedDataSource && (
            <ConfigurationForm
              sport={selectedSport}
              goal={selectedGoal}
              dataSource={selectedDataSource}
              clients={formClients}
              selectedClientId={selectedClientId}
              onClientChange={setSelectedClientId}
              onSubmit={handleFormSubmit}
              isSubmitting={isSubmitting}
            />
          )}
        </div>

        {/* Navigation Buttons */}
        <div className="flex justify-between mt-8 pt-4 border-t">
          <Button
            variant="outline"
            onClick={handleBack}
            disabled={currentStep === 1}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Tillbaka
          </Button>

          <div className="flex items-center gap-3">
            {/* AI Assistant on configuration step */}
            {currentStep === 4 && selectedSport && selectedGoal && selectedClientId && (
              <AIContextButton
                athleteId={selectedClientId}
                athleteName={clients.find(c => c.id === selectedClientId)?.name}
                buttonText="AI-hjälp"
                quickActions={[
                  {
                    label: 'Granska programkonfiguration',
                    prompt: `Jag skapar ett ${selectedSport === 'RUNNING' ? 'löp' : selectedSport === 'CYCLING' ? 'cykel' : 'tränings'}program för ${clients.find(c => c.id === selectedClientId)?.name || 'en atlet'} med målet "${selectedGoal}". Granska mina val och ge förslag på förbättringar eller justeringar innan jag genererar programmet.`,
                  },
                  {
                    label: 'Föreslå träningsupplägg',
                    prompt: `Baserat på målet "${selectedGoal}" för ${selectedSport === 'RUNNING' ? 'löpning' : selectedSport === 'CYCLING' ? 'cykling' : 'träning'}, vilken periodisering och träningsupplägg rekommenderar du? Ge konkreta förslag på veckostruktur och intensitetsfördelning.`,
                  },
                  {
                    label: 'Tips för Stockholm Marathon',
                    prompt: `Ge mig specifika tips för att förbereda en atlet för Stockholm Marathon den 30 maj. Vilka nyckelfaser bör programmet innehålla och hur bör jag lägga upp de sista veckorna före loppet?`,
                  },
                  {
                    label: 'Anpassa för atletens nivå',
                    prompt: `Hur bör jag anpassa träningsprogrammet baserat på atletens nuvarande konditionsnivå och erfarenhet? Vilka tecken ska jag leta efter för att veta om belastningen är rätt?`,
                  },
                ]}
              />
            )}

            {currentStep < 4 && (
              <Button onClick={handleNext}>
                Nästa
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
