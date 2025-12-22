'use client';

/**
 * Public Report View
 *
 * Wraps the ReportTemplate for public viewing and adds
 * signup CTAs and upgrade prompts.
 */

import { TestCalculations } from '@/types';
import { ReportTemplate } from './ReportTemplate';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Sparkles, Calendar, MessageCircle, Video, Activity } from 'lucide-react';
import Link from 'next/link';

// Use generic types to avoid Prisma null/undefined mismatches
interface PublicReportViewProps {
  client: any;
  test: any;
  calculations: TestCalculations;
  testLeader: string;
  location: string;
  organization: string;
}

export function PublicReportView({
  client,
  test,
  calculations,
  testLeader,
  location,
  organization,
}: PublicReportViewProps) {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white py-4 px-6">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">{organization}</h1>
            <p className="text-sm text-blue-100">Din personliga testrapport</p>
          </div>
          <Link href="/signup">
            <Button variant="secondary" size="sm">
              Skapa gratis konto
            </Button>
          </Link>
        </div>
      </div>

      {/* Report Content */}
      <div className="py-8 px-4">
        <ReportTemplate
          client={client}
          test={test}
          calculations={calculations}
          testLeader={testLeader}
          organization={organization}
        />
      </div>

      {/* Upgrade CTA Section */}
      <div className="bg-white border-t py-12 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Vill du få ut mer av dina resultat?
            </h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Skapa ett konto för att spara dina rapporter, få AI-drivna träningsrekommendationer
              och följa din utveckling över tid.
            </p>
          </div>

          {/* Tier Cards */}
          <div className="grid md:grid-cols-3 gap-6 mb-8">
            {/* Free Tier */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  Gratis
                  <Badge variant="secondary">Grundläggande</Badge>
                </CardTitle>
                <CardDescription>Perfekt för att komma igång</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold mb-4">
                  0 kr<span className="text-sm font-normal text-gray-500">/månad</span>
                </p>
                <ul className="space-y-2 mb-6">
                  <FeatureItem included>Spara alla dina rapporter</FeatureItem>
                  <FeatureItem included>Se din historik</FeatureItem>
                  <FeatureItem included>Grundläggande statistik</FeatureItem>
                  <FeatureItem>AI-coaching</FeatureItem>
                  <FeatureItem>Träningsloggning</FeatureItem>
                </ul>
                <Link href="/signup?tier=free" className="block">
                  <Button variant="outline" className="w-full">
                    Skapa gratis konto
                  </Button>
                </Link>
              </CardContent>
            </Card>

            {/* Standard Tier */}
            <Card className="border-blue-200 shadow-lg">
              <CardHeader className="bg-blue-50 rounded-t-lg">
                <CardTitle className="flex items-center justify-between">
                  Standard
                  <Badge className="bg-blue-600">Populärast</Badge>
                </CardTitle>
                <CardDescription>För den aktiva atleten</CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                <p className="text-3xl font-bold mb-4">
                  199 kr<span className="text-sm font-normal text-gray-500">/månad</span>
                </p>
                <ul className="space-y-2 mb-6">
                  <FeatureItem included>Allt i Gratis</FeatureItem>
                  <FeatureItem included>
                    <MessageCircle className="h-4 w-4 inline mr-1" />
                    AI-coaching (50 meddelanden/månad)
                  </FeatureItem>
                  <FeatureItem included>
                    <Activity className="h-4 w-4 inline mr-1" />
                    Daglig träningsloggning
                  </FeatureItem>
                  <FeatureItem included>
                    <Calendar className="h-4 w-4 inline mr-1" />
                    Daglig check-in
                  </FeatureItem>
                  <FeatureItem>Videoanalys</FeatureItem>
                </ul>
                <Link href="/signup?tier=standard" className="block">
                  <Button className="w-full">
                    Börja nu
                  </Button>
                </Link>
              </CardContent>
            </Card>

            {/* Pro Tier */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  Pro
                  <Badge variant="outline" className="border-purple-300 text-purple-700">
                    <Sparkles className="h-3 w-3 mr-1" />
                    Premium
                  </Badge>
                </CardTitle>
                <CardDescription>Maximera din potential</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold mb-4">
                  399 kr<span className="text-sm font-normal text-gray-500">/månad</span>
                </p>
                <ul className="space-y-2 mb-6">
                  <FeatureItem included>Allt i Standard</FeatureItem>
                  <FeatureItem included>
                    <MessageCircle className="h-4 w-4 inline mr-1" />
                    Obegränsad AI-coaching
                  </FeatureItem>
                  <FeatureItem included>
                    <Video className="h-4 w-4 inline mr-1" />
                    Videoanalys med AI
                  </FeatureItem>
                  <FeatureItem included>Strava & Garmin-synkning</FeatureItem>
                  <FeatureItem included>Avancerad träningsplanering</FeatureItem>
                </ul>
                <Link href="/signup?tier=pro" className="block">
                  <Button variant="outline" className="w-full border-purple-300 text-purple-700 hover:bg-purple-50">
                    Prova Pro
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>

          {/* Trust Indicators */}
          <div className="text-center text-sm text-gray-500">
            <p className="mb-2">14 dagars gratis provperiod på alla betalplaner</p>
            <p>Ingen bindningstid - avsluta när du vill</p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-8 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <p className="mb-2">© {new Date().getFullYear()} {organization}. Alla rättigheter förbehållna.</p>
          <p className="text-sm">
            <Link href="/privacy" className="hover:text-white">Integritetspolicy</Link>
            {' · '}
            <Link href="/terms" className="hover:text-white">Användarvillkor</Link>
          </p>
        </div>
      </footer>
    </div>
  );
}

function FeatureItem({
  children,
  included = false,
}: {
  children: React.ReactNode;
  included?: boolean;
}) {
  return (
    <li className={`flex items-center gap-2 text-sm ${included ? 'text-gray-700' : 'text-gray-400'}`}>
      {included ? (
        <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
      ) : (
        <div className="h-4 w-4 rounded-full border border-gray-300 flex-shrink-0" />
      )}
      {children}
    </li>
  );
}
