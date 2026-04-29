'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import {
  Gift,
  Users,
  Copy,
  CheckCircle2,
  Clock,
  XCircle,
  Share2,
  Sparkles,
  TrendingUp,
  Mail,
  ExternalLink,
} from 'lucide-react';
import { useTranslations, useLocale } from '@/i18n/client';
import { format } from 'date-fns';
import { sv, enUS } from 'date-fns/locale';

interface ReferralCodeData {
  id: string;
  code: string;
  isActive: boolean;
  totalUses: number;
  successfulReferrals: number;
  maxUses: number | null;
  expiresAt: Date | null;
  createdAt: Date;
}

interface ReferralData {
  id: string;
  status: string;
  referredEmail: string;
  referredUser: {
    id: string;
    name: string;
    email: string;
  } | null;
  rewards: {
    id: string;
    rewardType: string;
    value: number;
    applied: boolean;
  }[];
  createdAt: Date;
  completedAt: Date | null;
}

interface RewardData {
  id: string;
  rewardType: string;
  value: number;
  referral: {
    referredUser: { name: string } | null;
    referredEmail: string;
  };
}

interface ReferralDashboardClientProps {
  userId: string;
  userName: string;
  referralCode: ReferralCodeData | null;
  referrals: ReferralData[];
  availableRewards: RewardData[];
  stats: {
    totalReferrals: number;
    completedReferrals: number;
    pendingReferrals: number;
    availableRewards: number;
  };
}

export function ReferralDashboardClient({
  userId,
  userName,
  referralCode,
  referrals,
  availableRewards,
  stats,
}: ReferralDashboardClientProps) {
  const t = useTranslations('referrals');
  const locale = useLocale();
  const dateLocale = locale === 'sv' ? sv : enUS;
  const { toast } = useToast();
  const router = useRouter();
  const [isCreating, setIsCreating] = useState(false);
  const [isClaiming, setIsClaiming] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const shareUrl = referralCode
    ? `${typeof window !== 'undefined' ? window.location.origin : ''}/register?ref=${referralCode.code}`
    : '';

  const handleCreateCode = async () => {
    setIsCreating(true);
    try {
      const response = await fetch('/api/referrals/code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      const data = await response.json();

      if (data.success) {
        toast({
          title: t('codeCreated'),
          description: t('codeCreatedDescription'),
        });
        router.refresh();
      } else {
        toast({
          title: t('error'),
          description: data.error,
          variant: 'destructive',
        });
      }
    } catch {
      toast({
        title: t('error'),
        description: t('failedToCreateCode'),
        variant: 'destructive',
      });
    } finally {
      setIsCreating(false);
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast({
        title: t('linkCopied'),
        description: t('linkCopiedDescription'),
      });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({
        title: t('error'),
        description: t('failedToCopy'),
        variant: 'destructive',
      });
    }
  };

  const handleClaimReward = async (rewardId: string) => {
    setIsClaiming(rewardId);
    try {
      const response = await fetch('/api/referrals/rewards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rewardId }),
      });

      const data = await response.json();

      if (data.success) {
        toast({
          title: t('rewardClaimed'),
          description: t('rewardClaimedDescription'),
        });
        router.refresh();
      } else {
        toast({
          title: t('error'),
          description: data.error,
          variant: 'destructive',
        });
      }
    } catch {
      toast({
        title: t('error'),
        description: t('failedToClaimReward'),
        variant: 'destructive',
      });
    } finally {
      setIsClaiming(null);
    }
  };

  const handleShareEmail = () => {
    const subject = encodeURIComponent(t('emailSubject'));
    const body = encodeURIComponent(
      t('emailBody', { name: userName, link: shareUrl })
    );
    window.open(`mailto:?subject=${subject}&body=${body}`);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return <Badge className="bg-green-100 text-green-700"><CheckCircle2 className="w-3 h-3 mr-1" />{t('statusCompleted')}</Badge>;
      case 'PENDING':
        return <Badge className="bg-yellow-100 text-yellow-700"><Clock className="w-3 h-3 mr-1" />{t('statusPending')}</Badge>;
      case 'EXPIRED':
        return <Badge className="bg-gray-100 text-gray-700"><XCircle className="w-3 h-3 mr-1" />{t('statusExpired')}</Badge>;
      case 'REVOKED':
        return <Badge className="bg-red-100 text-red-700"><XCircle className="w-3 h-3 mr-1" />{t('statusRevoked')}</Badge>;
      default:
        return null;
    }
  };

  const getRewardLabel = (type: string, value: number) => {
    switch (type) {
      case 'FREE_MONTH':
        return t('rewardFreeMonth', { count: value });
      case 'EXTENDED_TRIAL':
        return t('rewardExtendedTrial', { days: value });
      case 'ATHLETE_SLOTS':
        return t('rewardAthleteSlots', { count: value });
      case 'DISCOUNT_PERCENT':
        return t('rewardDiscount', { percent: value });
      default:
        return type;
    }
  };

  return (
    <div className="container mx-auto py-6 px-4 max-w-5xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Gift className="h-6 w-6 text-primary" />
          {t('title')}
        </h1>
        <p className="text-muted-foreground mt-1">{t('subtitle')}</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{t('totalReferrals')}</p>
                <p className="text-2xl font-bold">{stats.totalReferrals}</p>
              </div>
              <Users className="h-8 w-8 text-blue-500 opacity-80" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{t('completedReferrals')}</p>
                <p className="text-2xl font-bold">{stats.completedReferrals}</p>
              </div>
              <CheckCircle2 className="h-8 w-8 text-green-500 opacity-80" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{t('pendingReferrals')}</p>
                <p className="text-2xl font-bold">{stats.pendingReferrals}</p>
              </div>
              <Clock className="h-8 w-8 text-yellow-500 opacity-80" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{t('rewardsAvailable')}</p>
                <p className="text-2xl font-bold">{stats.availableRewards}</p>
              </div>
              <Sparkles className="h-8 w-8 text-purple-500 opacity-80" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Referral Code Card */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Share2 className="h-5 w-5" />
            {t('yourReferralCode')}
          </CardTitle>
          <CardDescription>{t('shareCodeDescription')}</CardDescription>
        </CardHeader>
        <CardContent>
          {referralCode ? (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <Input
                    value={shareUrl}
                    readOnly
                    className="font-mono text-sm bg-muted"
                  />
                </div>
                <Button onClick={handleCopyLink} variant="outline" className="gap-2">
                  {copied ? <CheckCircle2 className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  {copied ? t('copied') : t('copy')}
                </Button>
              </div>

              <div className="flex items-center gap-2 text-sm">
                <span className="text-muted-foreground">{t('code')}:</span>
                <code className="px-2 py-1 bg-muted rounded font-bold text-lg">
                  {referralCode.code}
                </code>
              </div>

              <div className="flex gap-2 pt-2">
                <Button onClick={handleShareEmail} variant="outline" className="gap-2">
                  <Mail className="h-4 w-4" />
                  {t('shareViaEmail')}
                </Button>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <Gift className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground mb-4">{t('noCodeYet')}</p>
              <Button onClick={handleCreateCode} disabled={isCreating}>
                {isCreating ? t('creating') : t('createCode')}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Available Rewards */}
      {availableRewards.length > 0 && (
        <Card className="mb-8 border-purple-200 bg-purple-50/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-purple-700">
              <Sparkles className="h-5 w-5" />
              {t('availableRewards')}
            </CardTitle>
            <CardDescription>{t('claimRewardsDescription')}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {availableRewards.map((reward) => (
                <div
                  key={reward.id}
                  className="flex items-center justify-between p-4 bg-white rounded-lg border"
                >
                  <div>
                    <p className="font-medium">
                      {getRewardLabel(reward.rewardType, reward.value)}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {t('fromReferral', {
                        name: reward.referral.referredUser?.name || reward.referral.referredEmail,
                      })}
                    </p>
                  </div>
                  <Button
                    onClick={() => handleClaimReward(reward.id)}
                    disabled={isClaiming === reward.id}
                    size="sm"
                  >
                    {isClaiming === reward.id ? t('claiming') : t('claim')}
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Referrals List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            {t('referralHistory')}
          </CardTitle>
          <CardDescription>{t('referralHistoryDescription')}</CardDescription>
        </CardHeader>
        <CardContent>
          {referrals.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>{t('noReferralsYet')}</p>
              <p className="text-sm mt-2">{t('shareYourCode')}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {referrals.map((referral) => (
                <div
                  key={referral.id}
                  className="flex items-center justify-between p-4 bg-muted/30 rounded-lg"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium truncate">
                        {referral.referredUser?.name || referral.referredEmail}
                      </p>
                      {getStatusBadge(referral.status)}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(referral.createdAt), 'PPP', { locale: dateLocale })}
                      {referral.completedAt && (
                        <> • {t('completed')} {format(new Date(referral.completedAt), 'PPP', { locale: dateLocale })}</>
                      )}
                    </p>
                  </div>
                  {referral.rewards.length > 0 && (
                    <div className="text-right">
                      {referral.rewards.map((reward) => (
                        <Badge key={reward.id} variant="outline" className="ml-2">
                          {reward.applied ? '✓' : ''} {getRewardLabel(reward.rewardType, reward.value)}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* How it works */}
      <Card className="mt-8">
        <CardHeader>
          <CardTitle>{t('howItWorks')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <Share2 className="h-6 w-6 text-blue-600" />
              </div>
              <h3 className="font-medium mb-1">{t('step1Title')}</h3>
              <p className="text-sm text-muted-foreground">{t('step1Description')}</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <Users className="h-6 w-6 text-green-600" />
              </div>
              <h3 className="font-medium mb-1">{t('step2Title')}</h3>
              <p className="text-sm text-muted-foreground">{t('step2Description')}</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <Gift className="h-6 w-6 text-purple-600" />
              </div>
              <h3 className="font-medium mb-1">{t('step3Title')}</h3>
              <p className="text-sm text-muted-foreground">{t('step3Description')}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
