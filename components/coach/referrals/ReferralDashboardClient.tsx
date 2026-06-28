'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  RolePageFrame,
  RolePageHeader,
  RolePanel,
  RoleStatCard,
  roleListItemClass,
  roleMutedBlockClass,
} from '@/components/layouts/role-shell/RolePage';
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
        return <Badge className="gap-1 border border-emerald-100 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-300"><CheckCircle2 className="h-3 w-3" />{t('statusCompleted')}</Badge>;
      case 'PENDING':
        return <Badge className="gap-1 border border-amber-100 bg-amber-50 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-300"><Clock className="h-3 w-3" />{t('statusPending')}</Badge>;
      case 'EXPIRED':
        return <Badge className="gap-1 border border-zinc-200 bg-zinc-50 text-zinc-700 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300"><XCircle className="h-3 w-3" />{t('statusExpired')}</Badge>;
      case 'REVOKED':
        return <Badge className="gap-1 border border-red-100 bg-red-50 text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300"><XCircle className="h-3 w-3" />{t('statusRevoked')}</Badge>;
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
    <RolePageFrame contentClassName="max-w-5xl">
      <RolePageHeader
        eyebrow="Coach"
        title={
          <span className="flex items-center gap-2">
            <Gift className="h-6 w-6 text-blue-600 dark:text-blue-300" />
            {t('title')}
          </span>
        }
        description={t('subtitle')}
      />

      {/* Stats Cards */}
      <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <RoleStatCard label={t('totalReferrals')} value={stats.totalReferrals} icon={Users} tone="blue" />
        <RoleStatCard label={t('completedReferrals')} value={stats.completedReferrals} icon={CheckCircle2} tone="emerald" />
        <RoleStatCard label={t('pendingReferrals')} value={stats.pendingReferrals} icon={Clock} tone="amber" />
        <RoleStatCard label={t('rewardsAvailable')} value={stats.availableRewards} icon={Sparkles} tone="violet" />
      </div>

      {/* Referral Code Card */}
      <RolePanel className="mb-8">
        <div className="border-b border-zinc-200 px-5 py-4 dark:border-white/10">
          <h2 className="flex items-center gap-2 text-base font-semibold text-zinc-950 dark:text-zinc-50">
            <Share2 className="h-5 w-5 text-blue-600 dark:text-blue-300" />
            {t('yourReferralCode')}
          </h2>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{t('shareCodeDescription')}</p>
        </div>
        <div className="p-5">
          {referralCode ? (
            <div className="space-y-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <div className="flex-1">
                  <Input
                    value={shareUrl}
                    readOnly
                    className="border-zinc-200 bg-zinc-50 font-mono text-sm dark:border-white/10 dark:bg-zinc-900/60"
                  />
                </div>
                <Button onClick={handleCopyLink} variant="outline" className="gap-2">
                  {copied ? <CheckCircle2 className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  {copied ? t('copied') : t('copy')}
                </Button>
              </div>

              <div className="flex items-center gap-2 text-sm">
                <span className="text-zinc-500 dark:text-zinc-400">{t('code')}:</span>
                <code className="rounded-md border border-zinc-200 bg-zinc-50 px-2 py-1 text-lg font-semibold text-zinc-950 dark:border-white/10 dark:bg-zinc-900 dark:text-zinc-50">
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
            <div className="py-8 text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-md border border-blue-100 bg-blue-50 text-blue-600 dark:border-blue-900/60 dark:bg-blue-950/30 dark:text-blue-300">
                <Gift className="h-6 w-6" />
              </div>
              <p className="mb-4 text-sm text-zinc-500 dark:text-zinc-400">{t('noCodeYet')}</p>
              <Button onClick={handleCreateCode} disabled={isCreating}>
                {isCreating ? t('creating') : t('createCode')}
              </Button>
            </div>
          )}
        </div>
      </RolePanel>

      {/* Available Rewards */}
      {availableRewards.length > 0 && (
        <RolePanel className="mb-8 border-violet-200 bg-violet-50/50 dark:border-violet-900/50 dark:bg-violet-950/20">
          <div className="border-b border-violet-100 px-5 py-4 dark:border-violet-900/50">
            <h2 className="flex items-center gap-2 text-base font-semibold text-violet-700 dark:text-violet-300">
              <Sparkles className="h-5 w-5" />
              {t('availableRewards')}
            </h2>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">{t('claimRewardsDescription')}</p>
          </div>
          <div className="p-5">
            <div className="space-y-3">
              {availableRewards.map((reward) => (
                <div
                  key={reward.id}
                  className={roleListItemClass('violet', 'flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between')}
                >
                  <div>
                    <p className="font-medium text-zinc-950 dark:text-zinc-50">
                      {getRewardLabel(reward.rewardType, reward.value)}
                    </p>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400">
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
          </div>
        </RolePanel>
      )}

      {/* Referrals List */}
      <RolePanel>
        <div className="border-b border-zinc-200 px-5 py-4 dark:border-white/10">
          <h2 className="flex items-center gap-2 text-base font-semibold text-zinc-950 dark:text-zinc-50">
            <TrendingUp className="h-5 w-5 text-emerald-600 dark:text-emerald-300" />
            {t('referralHistory')}
          </h2>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{t('referralHistoryDescription')}</p>
        </div>
        <div className="p-5">
          {referrals.length === 0 ? (
            <div className="py-8 text-center">
              <Users className="mx-auto mb-4 h-12 w-12 text-zinc-300 dark:text-zinc-700" />
              <p className="font-medium text-zinc-950 dark:text-zinc-50">{t('noReferralsYet')}</p>
              <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">{t('shareYourCode')}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {referrals.map((referral) => (
                <div
                  key={referral.id}
                  className={roleMutedBlockClass('flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between')}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate font-medium text-zinc-950 dark:text-zinc-50">
                        {referral.referredUser?.name || referral.referredEmail}
                      </p>
                      {getStatusBadge(referral.status)}
                    </div>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400">
                      {format(new Date(referral.createdAt), 'PPP', { locale: dateLocale })}
                      {referral.completedAt && (
                        <> • {t('completed')} {format(new Date(referral.completedAt), 'PPP', { locale: dateLocale })}</>
                      )}
                    </p>
                  </div>
                  {referral.rewards.length > 0 && (
                    <div className="flex flex-wrap justify-end gap-2">
                      {referral.rewards.map((reward) => (
                        <Badge key={reward.id} variant="outline">
                          {reward.applied ? '✓' : ''} {getRewardLabel(reward.rewardType, reward.value)}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </RolePanel>

      {/* How it works */}
      <RolePanel className="mt-8">
        <div className="border-b border-zinc-200 px-5 py-4 dark:border-white/10">
          <h2 className="text-base font-semibold text-zinc-950 dark:text-zinc-50">{t('howItWorks')}</h2>
        </div>
        <div className="p-5">
          <div className="grid gap-6 md:grid-cols-3">
            <div className="text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-md border border-blue-100 bg-blue-50 dark:border-blue-900/60 dark:bg-blue-950/30">
                <Share2 className="h-6 w-6 text-blue-600" />
              </div>
              <h3 className="mb-1 font-medium text-zinc-950 dark:text-zinc-50">{t('step1Title')}</h3>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">{t('step1Description')}</p>
            </div>
            <div className="text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-md border border-emerald-100 bg-emerald-50 dark:border-emerald-900/60 dark:bg-emerald-950/30">
                <Users className="h-6 w-6 text-emerald-600" />
              </div>
              <h3 className="mb-1 font-medium text-zinc-950 dark:text-zinc-50">{t('step2Title')}</h3>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">{t('step2Description')}</p>
            </div>
            <div className="text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-md border border-violet-100 bg-violet-50 dark:border-violet-900/60 dark:bg-violet-950/30">
                <Gift className="h-6 w-6 text-violet-600" />
              </div>
              <h3 className="mb-1 font-medium text-zinc-950 dark:text-zinc-50">{t('step3Title')}</h3>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">{t('step3Description')}</p>
            </div>
          </div>
        </div>
      </RolePanel>
    </RolePageFrame>
  );
}
