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
import { useTranslations } from '@/i18n/client'

export function IntegrationsHelpModal() {
  const [open, setOpen] = useState(false)
  const t = useTranslations('components.integrationsHelpModal')

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <HelpCircle className="h-4 w-4" />
          <span className="sr-only">{t('triggerLabel')}</span>
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <HelpCircle className="h-5 w-5" />
            {t('title')}
          </SheetTitle>
          <SheetDescription>
            {t('description')}
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Overview Section */}
          <div className="rounded-lg bg-blue-50 p-4">
            <div className="flex items-start gap-3">
              <Info className="h-5 w-5 text-blue-600 mt-0.5" />
              <div>
                <h3 className="font-medium text-blue-900">{t('overview.title')}</h3>
                <p className="text-sm text-blue-800 mt-1">
                  {t('overview.description')}
                </p>
              </div>
            </div>
          </div>

          {/* Data Flow Diagram */}
          <div className="rounded-lg border p-4">
            <h3 className="font-medium mb-3">{t('dataFlow.title')}</h3>
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground flex-wrap">
              <div className="flex items-center gap-1 bg-gray-100 rounded px-2 py-1">
                <Smartphone className="h-4 w-4" />
                <span>{t('dataFlow.device')}</span>
              </div>
              <ArrowRight className="h-4 w-4" />
              <div className="flex items-center gap-1 bg-gray-100 rounded px-2 py-1">
                <Cloud className="h-4 w-4" />
                <span>{t('dataFlow.cloud')}</span>
              </div>
              <ArrowRight className="h-4 w-4" />
              <div className="flex items-center gap-1 bg-primary/10 rounded px-2 py-1 text-primary">
                <Zap className="h-4 w-4" />
                <span>{t('dataFlow.app')}</span>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-3 text-center">
              {t('dataFlow.footer')}
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
                  <h4 className="font-medium text-sm mb-2">{t('sections.synced')}</h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-3 w-3 text-green-500" />
                      {t('strava.synced.activities')}
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-3 w-3 text-green-500" />
                      {t('strava.synced.metrics')}
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-3 w-3 text-green-500" />
                      {t('strava.synced.heartRate')}
                    </li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-medium text-sm mb-2">{t('sections.requirements')}</h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• {t('strava.requirements.account')}</li>
                    <li>• {t('strava.requirements.app')}</li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-medium text-sm mb-2">{t('sections.howItWorks')}</h4>
                  <ol className="text-sm text-muted-foreground space-y-2">
                    <li className="flex gap-2">
                      <span className="font-medium text-foreground">1.</span>
                      {t('strava.steps.record')}
                    </li>
                    <li className="flex gap-2">
                      <span className="font-medium text-foreground">2.</span>
                      {t('strava.steps.upload')}
                    </li>
                    <li className="flex gap-2">
                      <span className="font-medium text-foreground">3.</span>
                      {t('strava.steps.sync')}
                    </li>
                  </ol>
                </div>

                <div className="rounded-lg bg-yellow-50 p-3">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 text-yellow-600 mt-0.5" />
                    <div className="text-sm text-yellow-800">
                      <p className="font-medium">{t('commonTips.title')}</p>
                      <p>{t('strava.tip')}</p>
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
                  <h4 className="font-medium text-sm mb-2">{t('sections.synced')}</h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-3 w-3 text-green-500" />
                      HRV (pulsvariabilitet)
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-3 w-3 text-green-500" />
                      {t('garmin.synced.sleep')}
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-3 w-3 text-green-500" />
                      {t('garmin.synced.stress')}
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-3 w-3 text-green-500" />
                      {t('garmin.synced.restingHr')}
                    </li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-medium text-sm mb-2">{t('sections.requirements')}</h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• {t('garmin.requirements.account')}</li>
                    <li>• {t('garmin.requirements.device')}</li>
                    <li>• {t('garmin.requirements.app')}</li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-medium text-sm mb-2">{t('sections.howItWorks')}</h4>
                  <ol className="text-sm text-muted-foreground space-y-2">
                    <li className="flex gap-2">
                      <span className="font-medium text-foreground">1.</span>
                      {t('garmin.steps.wear')}
                    </li>
                    <li className="flex gap-2">
                      <span className="font-medium text-foreground">2.</span>
                      {t('garmin.steps.syncWatch')}
                    </li>
                    <li className="flex gap-2">
                      <span className="font-medium text-foreground">3.</span>
                      {t('garmin.steps.fetch')}
                    </li>
                  </ol>
                </div>

                <div className="rounded-lg bg-blue-50 p-3">
                  <div className="flex items-start gap-2">
                    <Info className="h-4 w-4 text-blue-600 mt-0.5" />
                    <div className="text-sm text-blue-800">
                      <p className="font-medium">{t('garmin.hrv.title')}</p>
                      <p>{t('garmin.hrv.description')}</p>
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
                  <h4 className="font-medium text-sm mb-2">{t('sections.synced')}</h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-3 w-3 text-green-500" />
                      {t('concept2.synced.rowErg')}
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-3 w-3 text-green-500" />
                      {t('concept2.synced.skiErg')}
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-3 w-3 text-green-500" />
                      {t('concept2.synced.bikeErg')}
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-3 w-3 text-green-500" />
                      {t('concept2.synced.metrics')}
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-3 w-3 text-green-500" />
                      {t('concept2.synced.intervals')}
                    </li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-medium text-sm mb-2">{t('sections.requirements')}</h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• {t('concept2.requirements.account')}</li>
                    <li>• {t('concept2.requirements.machine')}</li>
                    <li>• <strong>{t('concept2.requirements.ergDataStrong')}</strong> {t('concept2.requirements.recommended')}</li>
                  </ul>
                </div>

                <div className="rounded-lg bg-cyan-50 p-3">
                  <div className="flex items-start gap-2">
                    <Smartphone className="h-4 w-4 text-cyan-600 mt-0.5" />
                    <div className="text-sm text-cyan-800">
                      <p className="font-medium">{t('concept2.ergData.title')}</p>
                      <p className="mt-1">
                        {t('concept2.ergData.description')}
                      </p>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium text-sm mb-2">{t('sections.howItWorks')}</h4>
                  <ol className="text-sm text-muted-foreground space-y-2">
                    <li className="flex gap-2">
                      <span className="font-medium text-foreground">1.</span>
                      {t('concept2.steps.open')}
                    </li>
                    <li className="flex gap-2">
                      <span className="font-medium text-foreground">2.</span>
                      {t('concept2.steps.workout')}
                    </li>
                    <li className="flex gap-2">
                      <span className="font-medium text-foreground">3.</span>
                      {t('concept2.steps.upload')}
                    </li>
                    <li className="flex gap-2">
                      <span className="font-medium text-foreground">4.</span>
                      {t('concept2.steps.sync')}
                    </li>
                  </ol>
                </div>

                <div>
                  <h4 className="font-medium text-sm mb-2">{t('concept2.alternatives.title')}</h4>
                  <p className="text-sm text-muted-foreground mb-2">
                    {t('concept2.alternatives.intro')}
                  </p>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• {t('concept2.alternatives.usb')}</li>
                    <li>• {t('concept2.alternatives.manual')}</li>
                  </ul>
                </div>

                <div className="rounded-lg bg-yellow-50 p-3">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 text-yellow-600 mt-0.5" />
                    <div className="text-sm text-yellow-800">
                      <p className="font-medium">{t('concept2.important.title')}</p>
                      <p>
                        {t('concept2.important.description')}
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
              {t('troubleshooting.title')}
            </h3>
            <div className="space-y-3 text-sm">
              <div>
                <p className="font-medium">{t('troubleshooting.notSyncing.title')}</p>
                <p className="text-muted-foreground">
                  {t('troubleshooting.notSyncing.description')}
                </p>
              </div>
              <div>
                <p className="font-medium">{t('troubleshooting.connection.title')}</p>
                <p className="text-muted-foreground">
                  {t('troubleshooting.connection.description')}
                </p>
              </div>
              <div>
                <p className="font-medium">{t('troubleshooting.missing.title')}</p>
                <p className="text-muted-foreground">
                  {t('troubleshooting.missing.description')}
                </p>
              </div>
            </div>
          </div>

          {/* Privacy Note */}
          <div className="rounded-lg bg-gray-50 p-4 text-sm text-muted-foreground">
            <p className="font-medium text-foreground mb-1">{t('privacy.title')}</p>
            <p>
              {t('privacy.description')}
            </p>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
