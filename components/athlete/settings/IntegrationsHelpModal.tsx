'use client'

/**
 * Integrations Help Modal
 *
 * Comprehensive help guide for all integrations (Strava, Garmin, Concept2).
 * Explains data flow, requirements, and troubleshooting.
 */

import { useState } from 'react'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import {
  HelpCircle,
  Activity,
  Watch,
  Waves,
  Smartphone,
  Cloud,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Info,
  Zap,
} from 'lucide-react'

export function IntegrationsHelpModal() {
  const [open, setOpen] = useState(false)

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <HelpCircle className="h-4 w-4" />
          <span className="sr-only">Hjälp om integrationer</span>
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <HelpCircle className="h-5 w-5" />
            Hur integrationer fungerar
          </SheetTitle>
          <SheetDescription>
            Lär dig hur du ansluter och synkroniserar data från dina träningsappar
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Overview Section */}
          <div className="rounded-lg bg-blue-50 p-4">
            <div className="flex items-start gap-3">
              <Info className="h-5 w-5 text-blue-600 mt-0.5" />
              <div>
                <h3 className="font-medium text-blue-900">Översikt</h3>
                <p className="text-sm text-blue-800 mt-1">
                  Integrationer låter dig automatiskt synkronisera träningsdata från externa
                  tjänster. Data hämtas via säkra API-anslutningar med OAuth-autentisering.
                </p>
              </div>
            </div>
          </div>

          {/* Data Flow Diagram */}
          <div className="rounded-lg border p-4">
            <h3 className="font-medium mb-3">Så flödar din data</h3>
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground flex-wrap">
              <div className="flex items-center gap-1 bg-gray-100 rounded px-2 py-1">
                <Smartphone className="h-4 w-4" />
                <span>Din enhet</span>
              </div>
              <ArrowRight className="h-4 w-4" />
              <div className="flex items-center gap-1 bg-gray-100 rounded px-2 py-1">
                <Cloud className="h-4 w-4" />
                <span>Molntjänst</span>
              </div>
              <ArrowRight className="h-4 w-4" />
              <div className="flex items-center gap-1 bg-primary/10 rounded px-2 py-1 text-primary">
                <Zap className="h-4 w-4" />
                <span>Denna app</span>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-3 text-center">
              Data synkroniseras via tjänsternas officiella API:er
            </p>
          </div>

          {/* Integration Accordion */}
          <Accordion type="single" collapsible className="w-full">
            {/* Strava */}
            <AccordionItem value="strava">
              <AccordionTrigger className="hover:no-underline">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
                    <Activity className="h-4 w-4 text-orange-600" />
                  </div>
                  <span>Strava</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="space-y-4 pt-2">
                <div>
                  <h4 className="font-medium text-sm mb-2">Vad synkroniseras</h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-3 w-3 text-green-500" />
                      Löpning, cykling, simning och andra aktiviteter
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-3 w-3 text-green-500" />
                      Distans, tid, tempo och höjdmeter
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-3 w-3 text-green-500" />
                      Pulsdata (om tillgänglig)
                    </li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-medium text-sm mb-2">Krav</h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• Strava-konto (gratis eller premium)</li>
                    <li>• Strava-appen på din telefon eller klocka</li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-medium text-sm mb-2">Så här fungerar det</h4>
                  <ol className="text-sm text-muted-foreground space-y-2">
                    <li className="flex gap-2">
                      <span className="font-medium text-foreground">1.</span>
                      Spela in aktivitet med Strava-appen eller synka från din klocka
                    </li>
                    <li className="flex gap-2">
                      <span className="font-medium text-foreground">2.</span>
                      Aktiviteten laddas upp till Strava automatiskt
                    </li>
                    <li className="flex gap-2">
                      <span className="font-medium text-foreground">3.</span>
                      Klicka &quot;Synka nu&quot; för att hämta nya aktiviteter hit
                    </li>
                  </ol>
                </div>

                <div className="rounded-lg bg-yellow-50 p-3">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 text-yellow-600 mt-0.5" />
                    <div className="text-sm text-yellow-800">
                      <p className="font-medium">Tips</p>
                      <p>Strava kan ta några minuter att bearbeta din aktivitet efter uppladdning.</p>
                    </div>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Garmin */}
            <AccordionItem value="garmin">
              <AccordionTrigger className="hover:no-underline">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Watch className="h-4 w-4 text-blue-600" />
                  </div>
                  <span>Garmin Connect</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="space-y-4 pt-2">
                <div>
                  <h4 className="font-medium text-sm mb-2">Vad synkroniseras</h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-3 w-3 text-green-500" />
                      HRV (pulsvariabilitet)
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-3 w-3 text-green-500" />
                      Sömndata och sömnkvalitet
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-3 w-3 text-green-500" />
                      Stressnivå och Body Battery
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-3 w-3 text-green-500" />
                      Vilopuls
                    </li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-medium text-sm mb-2">Krav</h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• Garmin-konto</li>
                    <li>• Garmin-klocka eller enhet med HRV-stöd</li>
                    <li>• Garmin Connect-appen</li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-medium text-sm mb-2">Så här fungerar det</h4>
                  <ol className="text-sm text-muted-foreground space-y-2">
                    <li className="flex gap-2">
                      <span className="font-medium text-foreground">1.</span>
                      Bär din Garmin-klocka dygnet runt för sömnspårning
                    </li>
                    <li className="flex gap-2">
                      <span className="font-medium text-foreground">2.</span>
                      Synka klockan med Garmin Connect-appen
                    </li>
                    <li className="flex gap-2">
                      <span className="font-medium text-foreground">3.</span>
                      Data hämtas automatiskt till denna app
                    </li>
                  </ol>
                </div>

                <div className="rounded-lg bg-blue-50 p-3">
                  <div className="flex items-start gap-2">
                    <Info className="h-4 w-4 text-blue-600 mt-0.5" />
                    <div className="text-sm text-blue-800">
                      <p className="font-medium">HRV-mätning</p>
                      <p>För bästa HRV-data, bär klockan under sömn. Morgon-HRV mäts automatiskt.</p>
                    </div>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Concept2 */}
            <AccordionItem value="concept2">
              <AccordionTrigger className="hover:no-underline">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-cyan-100 rounded-lg flex items-center justify-center">
                    <Waves className="h-4 w-4 text-cyan-600" />
                  </div>
                  <span>Concept2 Logbook</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="space-y-4 pt-2">
                <div>
                  <h4 className="font-medium text-sm mb-2">Vad synkroniseras</h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-3 w-3 text-green-500" />
                      RowErg (roddmaskin) pass
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-3 w-3 text-green-500" />
                      SkiErg pass
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-3 w-3 text-green-500" />
                      BikeErg pass
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-3 w-3 text-green-500" />
                      Distans, tid, tempo, watt, drag factor
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-3 w-3 text-green-500" />
                      Intervaller och splits
                    </li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-medium text-sm mb-2">Krav</h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• Concept2-konto på log.concept2.com</li>
                    <li>• Concept2-maskin med PM5-display</li>
                    <li>• <strong>ErgData-appen</strong> (rekommenderas starkt)</li>
                  </ul>
                </div>

                <div className="rounded-lg bg-cyan-50 p-3">
                  <div className="flex items-start gap-2">
                    <Smartphone className="h-4 w-4 text-cyan-600 mt-0.5" />
                    <div className="text-sm text-cyan-800">
                      <p className="font-medium">ErgData-appen är nyckeln!</p>
                      <p className="mt-1">
                        Anslut din telefon via Bluetooth till PM5-displayen under passet.
                        ErgData laddar automatiskt upp ditt pass till Concept2 Logbook när du är klar.
                      </p>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium text-sm mb-2">Så här fungerar det</h4>
                  <ol className="text-sm text-muted-foreground space-y-2">
                    <li className="flex gap-2">
                      <span className="font-medium text-foreground">1.</span>
                      Öppna ErgData-appen och anslut till din Concept2-maskin via Bluetooth
                    </li>
                    <li className="flex gap-2">
                      <span className="font-medium text-foreground">2.</span>
                      Genomför ditt pass - ErgData spelar in automatiskt
                    </li>
                    <li className="flex gap-2">
                      <span className="font-medium text-foreground">3.</span>
                      När passet är klart laddas det upp till Concept2 Logbook
                    </li>
                    <li className="flex gap-2">
                      <span className="font-medium text-foreground">4.</span>
                      Klicka &quot;Synka nu&quot; här för att hämta passet
                    </li>
                  </ol>
                </div>

                <div>
                  <h4 className="font-medium text-sm mb-2">Alternativa metoder</h4>
                  <p className="text-sm text-muted-foreground mb-2">
                    Om du inte använder ErgData kan du också:
                  </p>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• Spara till USB-minne och ladda upp på log.concept2.com</li>
                    <li>• Manuellt logga ditt pass på log.concept2.com</li>
                  </ul>
                </div>

                <div className="rounded-lg bg-yellow-50 p-3">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 text-yellow-600 mt-0.5" />
                    <div className="text-sm text-yellow-800">
                      <p className="font-medium">Viktigt</p>
                      <p>
                        Data hämtas från Concept2 Logbook, inte direkt från maskinen.
                        Se till att dina pass laddas upp dit först.
                      </p>
                    </div>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>

          {/* Troubleshooting Section */}
          <div className="rounded-lg border p-4">
            <h3 className="font-medium mb-3 flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              Vanliga problem
            </h3>
            <div className="space-y-3 text-sm">
              <div>
                <p className="font-medium">Data synkroniseras inte?</p>
                <p className="text-muted-foreground">
                  Kontrollera att du är inloggad i respektive app och att data har laddats upp
                  till molntjänsten först.
                </p>
              </div>
              <div>
                <p className="font-medium">Anslutningen fungerar inte?</p>
                <p className="text-muted-foreground">
                  Prova att koppla bort och ansluta igen. Du kan behöva godkänna åtkomst på nytt.
                </p>
              </div>
              <div>
                <p className="font-medium">Saknas aktiviteter?</p>
                <p className="text-muted-foreground">
                  Endast aktiviteter från de senaste 30-90 dagarna hämtas. Äldre data kan
                  importeras manuellt vid behov.
                </p>
              </div>
            </div>
          </div>

          {/* Privacy Note */}
          <div className="rounded-lg bg-gray-50 p-4 text-sm text-muted-foreground">
            <p className="font-medium text-foreground mb-1">Om din data</p>
            <p>
              Vi använder endast officiella API:er med OAuth-autentisering. Din data lagras
              säkert och delas aldrig med tredje part. Du kan när som helst koppla bort en
              integration för att stoppa synkroniseringen.
            </p>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
