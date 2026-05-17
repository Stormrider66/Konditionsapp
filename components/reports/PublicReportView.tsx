'use client';

/**
 * Public Report View
 *
 * Wraps the ReportTemplate for public viewing and adds
 * signup CTAs and upgrade prompts.
 */

import { Client, Test, TestCalculations } from '@/types';
import { ReportTemplate } from './ReportTemplate';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Sparkles, Calendar, MessageCircle, Video, Activity } from 'lucide-react';
import Link from 'next/link';
import { useTranslations } from '@/i18n/client';

// Use generic types to avoid Prisma null/undefined mismatches
interface PublicReportViewProps {
  client: unknown;
  test: unknown;
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
  location: _location,
  organization,
}: PublicReportViewProps) {
  const t = useTranslations('components.publicReportView');

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white py-4 px-6">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">{organization}</h1>
            <p className="text-sm text-blue-100">{t('banner.subtitle')}</p>
          </div>
          <Link href="/signup">
            <Button variant="secondary" size="sm">
              {t('actions.createFreeAccount')}
            </Button>
          </Link>
        </div>
      </div>

      {/* Report Content */}
      <div className="py-8 px-4">
        <ReportTemplate
          client={client as Client}
          test={test as Test}
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
              {t('cta.title')}
            </h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              {t('cta.description')}
            </p>
          </div>

          {/* Tier Cards */}
          <div className="grid md:grid-cols-3 gap-6 mb-8">
            {/* Free Tier */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  {t('tiers.free.name')}
                  <Badge variant="secondary">{t('tiers.free.badge')}</Badge>
                </CardTitle>
                <CardDescription>{t('tiers.free.description')}</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold mb-4">
                  {t('tiers.free.price')}<span className="text-sm font-normal text-gray-500">{t('tiers.perMonth')}</span>
                </p>
                <ul className="space-y-2 mb-6">
                  <FeatureItem included>{t('features.saveReports')}</FeatureItem>
                  <FeatureItem included>{t('features.viewHistory')}</FeatureItem>
                  <FeatureItem included>{t('features.basicStats')}</FeatureItem>
                  <FeatureItem>{t('features.aiCoaching')}</FeatureItem>
                  <FeatureItem>{t('features.trainingLogging')}</FeatureItem>
                </ul>
                <Link href="/signup?tier=free" className="block">
                  <Button variant="outline" className="w-full">
                    {t('actions.createFreeAccount')}
                  </Button>
                </Link>
              </CardContent>
            </Card>

            {/* Standard Tier */}
            <Card className="border-blue-200 shadow-lg">
              <CardHeader className="bg-blue-50 rounded-t-lg">
                <CardTitle className="flex items-center justify-between">
                  {t('tiers.standard.name')}
                  <Badge className="bg-blue-600">{t('tiers.standard.badge')}</Badge>
                </CardTitle>
                <CardDescription>{t('tiers.standard.description')}</CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                <p className="text-3xl font-bold mb-4">
                  {t('tiers.standard.price')}<span className="text-sm font-normal text-gray-500">{t('tiers.perMonth')}</span>
                </p>
                <ul className="space-y-2 mb-6">
                  <FeatureItem included>{t('features.everythingFree')}</FeatureItem>
                  <FeatureItem included>
                    <MessageCircle className="h-4 w-4 inline mr-1" />
                    {t('features.aiCoachingQuota')}
                  </FeatureItem>
                  <FeatureItem included>
                    <Activity className="h-4 w-4 inline mr-1" />
                    {t('features.dailyTrainingLogging')}
                  </FeatureItem>
                  <FeatureItem included>
                    <Calendar className="h-4 w-4 inline mr-1" />
                    {t('features.dailyCheckIn')}
                  </FeatureItem>
                  <FeatureItem>{t('features.videoAnalysis')}</FeatureItem>
                </ul>
                <Link href="/signup?tier=standard" className="block">
                  <Button className="w-full">
                    {t('actions.startNow')}
                  </Button>
                </Link>
              </CardContent>
            </Card>

            {/* Pro Tier */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  {t('tiers.pro.name')}
                  <Badge variant="outline" className="border-purple-300 text-purple-700">
                    <Sparkles className="h-3 w-3 mr-1" />
                    {t('tiers.pro.badge')}
                  </Badge>
                </CardTitle>
                <CardDescription>{t('tiers.pro.description')}</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold mb-4">
                  {t('tiers.pro.price')}<span className="text-sm font-normal text-gray-500">{t('tiers.perMonth')}</span>
                </p>
                <ul className="space-y-2 mb-6">
                  <FeatureItem included>{t('features.everythingStandard')}</FeatureItem>
                  <FeatureItem included>
                    <MessageCircle className="h-4 w-4 inline mr-1" />
                    {t('features.largerAiCredits')}
                  </FeatureItem>
                  <FeatureItem included>
                    <Video className="h-4 w-4 inline mr-1" />
                    {t('features.aiVideoAnalysis')}
                  </FeatureItem>
                  <FeatureItem included>{t('features.stravaGarminSync')}</FeatureItem>
                  <FeatureItem included>{t('features.advancedPlanning')}</FeatureItem>
                </ul>
                <Link href="/signup?tier=pro" className="block">
                  <Button variant="outline" className="w-full border-purple-300 text-purple-700 hover:bg-purple-50">
                    {t('actions.tryPro')}
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>

          {/* Trust Indicators */}
          <div className="text-center text-sm text-gray-500">
            <p className="mb-2">{t('trust.freeTrial')}</p>
            <p>{t('trust.noCommitment')}</p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-8 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <p className="mb-2">{t('footer.copyright', { year: new Date().getFullYear(), organization })}</p>
          <p className="text-sm">
            <Link href="/privacy" className="hover:text-white">{t('footer.privacy')}</Link>
            {' · '}
            <Link href="/terms" className="hover:text-white">{t('footer.terms')}</Link>
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
