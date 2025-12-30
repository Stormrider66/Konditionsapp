'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/components/ui/use-toast';
import {
  Activity,
  Users,
  ClipboardList,
  Sparkles,
  Video,
  Calendar,
  TrendingUp,
  ArrowRight,
  ArrowLeft,
  Check,
  Building2,
  Target,
  Rocket,
} from 'lucide-react';
import { useTranslations } from '@/i18n/client';
import Link from 'next/link';

interface CoachOnboardingClientProps {
  userId: string;
  userName: string;
  userEmail: string;
  hasClients: boolean;
  currentTier: string;
}

const STEPS = ['welcome', 'profile', 'goals', 'getStarted'] as const;
type Step = typeof STEPS[number];

export function CoachOnboardingClient({
  userId,
  userName,
  userEmail,
  hasClients,
  currentTier,
}: CoachOnboardingClientProps) {
  const t = useTranslations('onboarding');
  const tCommon = useTranslations('common');
  const router = useRouter();
  const { toast } = useToast();

  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState({
    name: userName,
    organization: '',
    primaryGoal: '',
  });
  const [isUpdating, setIsUpdating] = useState(false);

  const step = STEPS[currentStep];
  const progress = ((currentStep + 1) / STEPS.length) * 100;

  const handleNext = async () => {
    // Save profile on step 2
    if (step === 'profile' && formData.name !== userName) {
      setIsUpdating(true);
      try {
        await fetch('/api/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: formData.name }),
        });
      } catch (error) {
        console.error('Error updating profile:', error);
      } finally {
        setIsUpdating(false);
      }
    }

    if (currentStep < STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = () => {
    router.push('/coach/dashboard');
  };

  const features = [
    { icon: ClipboardList, title: t('feature1Title'), desc: t('feature1Desc') },
    { icon: Calendar, title: t('feature2Title'), desc: t('feature2Desc') },
    { icon: Sparkles, title: t('feature3Title'), desc: t('feature3Desc') },
    { icon: Video, title: t('feature4Title'), desc: t('feature4Desc') },
    { icon: TrendingUp, title: t('feature5Title'), desc: t('feature5Desc') },
    { icon: Users, title: t('feature6Title'), desc: t('feature6Desc') },
  ];

  const goals = [
    { id: 'testing', icon: ClipboardList, label: t('goalTesting') },
    { id: 'programs', icon: Calendar, label: t('goalPrograms') },
    { id: 'ai', icon: Sparkles, label: t('goalAI') },
    { id: 'monitoring', icon: TrendingUp, label: t('goalMonitoring') },
    { id: 'video', icon: Video, label: t('goalVideo') },
    { id: 'all', icon: Rocket, label: t('goalAll') },
  ];

  const quickActions = [
    { href: '/test', icon: ClipboardList, label: t('actionNewTest') },
    { href: '/clients/new', icon: Users, label: t('actionNewAthlete') },
    { href: '/coach/programs/new', icon: Calendar, label: t('actionNewProgram') },
    { href: '/coach/ai-studio', icon: Sparkles, label: t('actionAIStudio') },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white dark:from-slate-950 dark:to-background">
      <div className="container mx-auto py-8 px-4 max-w-3xl">
        {/* Progress */}
        <div className="mb-8">
          <div className="flex items-center justify-between text-sm text-muted-foreground mb-2">
            <span>{t('step')} {currentStep + 1} / {STEPS.length}</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {/* Step Content */}
        <Card className="mb-8">
          {/* Welcome Step */}
          {step === 'welcome' && (
            <>
              <CardHeader className="text-center pb-4">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Activity className="h-8 w-8 text-primary" />
                </div>
                <CardTitle className="text-2xl">{t('welcomeTitle')}</CardTitle>
                <CardDescription className="text-base">
                  {t('welcomeSubtitle')}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid sm:grid-cols-2 gap-4">
                  {features.map((feature, index) => (
                    <div
                      key={index}
                      className="flex items-start gap-3 p-3 rounded-lg bg-muted/30"
                    >
                      <div className="p-2 bg-primary/10 rounded-lg">
                        <feature.icon className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium text-sm">{feature.title}</p>
                        <p className="text-xs text-muted-foreground">{feature.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </>
          )}

          {/* Profile Step */}
          {step === 'profile' && (
            <>
              <CardHeader className="text-center pb-4">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Building2 className="h-8 w-8 text-blue-600" />
                </div>
                <CardTitle className="text-2xl">{t('profileTitle')}</CardTitle>
                <CardDescription className="text-base">
                  {t('profileSubtitle')}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="name">{t('yourName')}</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder={t('namePlaceholder')}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="organization">{t('organization')}</Label>
                  <Input
                    id="organization"
                    value={formData.organization}
                    onChange={(e) => setFormData({ ...formData, organization: e.target.value })}
                    placeholder={t('organizationPlaceholder')}
                  />
                  <p className="text-xs text-muted-foreground">{t('organizationHint')}</p>
                </div>
                <div className="p-3 bg-muted/30 rounded-lg">
                  <p className="text-sm text-muted-foreground">
                    <span className="font-medium text-foreground">{t('email')}:</span> {userEmail}
                  </p>
                </div>
              </CardContent>
            </>
          )}

          {/* Goals Step */}
          {step === 'goals' && (
            <>
              <CardHeader className="text-center pb-4">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Target className="h-8 w-8 text-green-600" />
                </div>
                <CardTitle className="text-2xl">{t('goalsTitle')}</CardTitle>
                <CardDescription className="text-base">
                  {t('goalsSubtitle')}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <RadioGroup
                  value={formData.primaryGoal}
                  onValueChange={(value) => setFormData({ ...formData, primaryGoal: value })}
                  className="grid sm:grid-cols-2 gap-3"
                >
                  {goals.map((goal) => (
                    <Label
                      key={goal.id}
                      htmlFor={goal.id}
                      className={`flex items-center gap-3 p-4 rounded-lg border-2 cursor-pointer transition-colors ${
                        formData.primaryGoal === goal.id
                          ? 'border-primary bg-primary/5'
                          : 'border-muted hover:border-muted-foreground/30'
                      }`}
                    >
                      <RadioGroupItem value={goal.id} id={goal.id} className="sr-only" />
                      <goal.icon className={`h-5 w-5 ${formData.primaryGoal === goal.id ? 'text-primary' : 'text-muted-foreground'}`} />
                      <span className="font-medium">{goal.label}</span>
                      {formData.primaryGoal === goal.id && (
                        <Check className="h-4 w-4 text-primary ml-auto" />
                      )}
                    </Label>
                  ))}
                </RadioGroup>
              </CardContent>
            </>
          )}

          {/* Get Started Step */}
          {step === 'getStarted' && (
            <>
              <CardHeader className="text-center pb-4">
                <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Rocket className="h-8 w-8 text-purple-600" />
                </div>
                <CardTitle className="text-2xl">{t('getStartedTitle')}</CardTitle>
                <CardDescription className="text-base">
                  {t('getStartedSubtitle')}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Quick Actions */}
                <div className="grid sm:grid-cols-2 gap-3">
                  {quickActions.map((action) => (
                    <Link key={action.href} href={action.href}>
                      <div className="flex items-center gap-3 p-4 rounded-lg border hover:bg-muted/50 transition-colors">
                        <div className="p-2 bg-primary/10 rounded-lg">
                          <action.icon className="h-4 w-4 text-primary" />
                        </div>
                        <span className="font-medium text-sm">{action.label}</span>
                        <ArrowRight className="h-4 w-4 text-muted-foreground ml-auto" />
                      </div>
                    </Link>
                  ))}
                </div>

                {/* Upgrade CTA */}
                {currentTier === 'FREE' && (
                  <div className="p-4 bg-gradient-to-r from-purple-500 to-blue-500 rounded-lg text-white">
                    <div className="flex items-center gap-3">
                      <Sparkles className="h-6 w-6" />
                      <div className="flex-1">
                        <p className="font-medium">{t('upgradeTitle')}</p>
                        <p className="text-sm text-white/80">{t('upgradeSubtitle')}</p>
                      </div>
                      <Link href="/coach/subscription">
                        <Button variant="secondary" size="sm">
                          {t('viewPlans')}
                        </Button>
                      </Link>
                    </div>
                  </div>
                )}
              </CardContent>
            </>
          )}
        </Card>

        {/* Navigation */}
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            onClick={handleBack}
            disabled={currentStep === 0}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            {tCommon('back')}
          </Button>

          {step === 'getStarted' ? (
            <Button onClick={handleComplete}>
              {t('goToDashboard')}
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          ) : (
            <Button onClick={handleNext} disabled={isUpdating}>
              {tCommon('next')}
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          )}
        </div>

        {/* Skip link */}
        <div className="text-center mt-4">
          <Link href="/coach/dashboard" className="text-sm text-muted-foreground hover:text-foreground">
            {t('skipOnboarding')}
          </Link>
        </div>
      </div>
    </div>
  );
}
