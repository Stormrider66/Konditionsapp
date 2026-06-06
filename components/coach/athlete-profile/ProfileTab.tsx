'use client'

import type { Dispatch, SetStateAction } from 'react'
import Link from 'next/link'
import { format } from 'date-fns'
import { enUS, sv } from 'date-fns/locale'
import { Edit2, CheckCircle2, CircleAlert, UserPlus } from 'lucide-react'
import { useLocale, useTranslations } from '@/i18n/client'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { CreateAthleteAccountDialog } from '@/components/client/CreateAthleteAccountDialog'
import { ExternalAthleteAccessCard } from '@/components/coach/clients/ExternalAthleteAccessCard'
import { SportProfileEditor } from '@/components/coach/clients/SportProfileEditor'
import { ProfileField, AthletePortalStatusBadge } from './ui'
import { GarminConnectionCard } from './GarminConnectionCard'
import type { ClientWithTests, SportProfileSummary, CoachSnapshotTone } from './types'

interface ProfileSetupItem {
  id: string
  complete: boolean
  label: string
  value: string
}

interface ProfileTabProps {
  id: string
  basePath: string
  client: ClientWithTests
  sportProfile: SportProfileSummary | null
  sportProfileLoading: boolean
  profileSetupTone: CoachSnapshotTone
  profileSetupItems: ProfileSetupItem[]
  setSportProfile: Dispatch<SetStateAction<SportProfileSummary | null>>
  onRefetchClient: () => void
}

export function ProfileTab({
  id,
  basePath,
  client,
  sportProfile,
  sportProfileLoading,
  profileSetupTone,
  profileSetupItems,
  setSportProfile,
  onRefetchClient,
}: ProfileTabProps) {
  const t = useTranslations('coach.pages.clientDetail')
  const locale = useLocale()
  const dateFnsLocale = locale === 'sv' ? sv : enUS

  const calculateAge = (birthDate: Date) => {
    const today = new Date()
    const birth = new Date(birthDate)
    let age = today.getFullYear() - birth.getFullYear()
    const monthDiff = today.getMonth() - birth.getMonth()
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--
    }
    return age
  }

  const calculateBMI = (weight: number, height: number) => {
    const heightInMeters = height / 100
    return (weight / (heightInMeters * heightInMeters)).toFixed(1)
  }

  const portalStatusLabels = {
    passwordReady: t('portalStatus.passwordReady'),
    active: t('portalStatus.active'),
    notLoggedIn: t('portalStatus.notLoggedIn'),
  }
  const athletePortalStatus = client.athleteAccount?.authStatus
  const formatProfileDate = (value?: string | Date | null) => value
    ? format(new Date(value), 'PPP', { locale: dateFnsLocale })
    : t('profile.notAvailable')

  const profileOverviewContent = (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(280px,1fr)]">
      <div className="bg-white dark:bg-slate-900/50 rounded-lg shadow-md dark:border dark:border-white/10 p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-4">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg sm:text-xl font-semibold dark:text-white">{t('overview.personalInfo')}</h2>
            <AthletePortalStatusBadge
              athleteAccount={client.athleteAccount}
              labels={portalStatusLabels}
            />
          </div>
          <Link href={`${basePath}/clients/${id}/edit`}>
            <Button variant="outline" size="sm">
              <Edit2 className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">{t('actions.edit')}</span>
            </Button>
          </Link>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          <ProfileField label={t('fields.age')} value={t('ageYears', { age: calculateAge(client.birthDate) })} />
          <ProfileField label={t('fields.gender')} value={client.gender === 'MALE' ? t('gender.male') : t('gender.female')} />
          <ProfileField label={t('fields.birthDate')} value={format(new Date(client.birthDate), 'PPP', { locale: dateFnsLocale })} className="col-span-2 sm:col-span-1" />
          <ProfileField label={t('fields.height')} value={`${client.height} cm`} />
          <ProfileField label={t('fields.weight')} value={`${client.weight} kg`} />
          <ProfileField label="BMI" value={calculateBMI(client.weight, client.height)} />
          {client.email && (
            <ProfileField label={t('fields.email')} value={client.email} className="col-span-2 sm:col-span-1" />
          )}
          {client.phone && (
            <ProfileField label={t('fields.phone')} value={client.phone} />
          )}
          {client.team && (
            <ProfileField label={t('fields.team')} value={client.team.name} />
          )}
        </div>
        {client.notes && (
          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-white/10">
            <p className="text-sm text-gray-500 dark:text-slate-400">{t('fields.notes')}</p>
            <p className="mt-1 text-gray-700 dark:text-slate-300">{client.notes}</p>
          </div>
        )}
      </div>

      <div className="space-y-4">
        <div className="bg-white dark:bg-slate-900/50 rounded-lg shadow-md dark:border dark:border-white/10 p-4 sm:p-6">
          <div className="flex flex-col gap-4">
            <div>
              <h2 className="text-lg sm:text-xl font-semibold dark:text-white">{t('profile.portalTitle')}</h2>
              <p className="text-sm text-muted-foreground mt-1">{t('profile.portalDescription')}</p>
            </div>

            {client.athleteAccount ? (
              <>
                <AthletePortalStatusBadge
                  athleteAccount={client.athleteAccount}
                  labels={portalStatusLabels}
                />
                <div className="space-y-3 text-sm">
                  <ProfileField label={t('profile.accountCreated')} value={formatProfileDate(client.athleteAccount.user?.createdAt)} compact />
                  <ProfileField label={t('profile.lastSignIn')} value={formatProfileDate(athletePortalStatus?.lastSignInAt)} compact />
                  <ProfileField label={t('profile.passwordUpdated')} value={formatProfileDate(athletePortalStatus?.passwordUpdatedAt)} compact />
                </div>
                <CreateAthleteAccountDialog
                  clientId={id}
                  clientName={client.name}
                  clientEmail={client.email}
                  clientPhone={client.phone}
                  hasExistingAccount
                  onAccountCreated={onRefetchClient}
                  trigger={
                    <Button variant="outline" size="sm" className="w-full">
                      <UserPlus className="w-4 h-4 mr-2" />
                      {t('profile.sendInvite')}
                    </Button>
                  }
                />
              </>
            ) : (
              <div className="rounded-lg border border-dashed border-gray-300 dark:border-white/10 p-4 text-sm text-muted-foreground">
                <p className="mb-3">{t('profile.noPortalAccount')}</p>
                <CreateAthleteAccountDialog
                  clientId={id}
                  clientName={client.name}
                  clientEmail={client.email}
                  clientPhone={client.phone}
                  hasExistingAccount={false}
                  onAccountCreated={onRefetchClient}
                  trigger={
                    <Button size="sm" className="w-full">
                      <UserPlus className="w-4 h-4 mr-2" />
                      {t('actions.createAthleteAccount')}
                    </Button>
                  }
                />
              </div>
            )}
          </div>
        </div>
        <ExternalAthleteAccessCard clientId={id} clientName={client.name} />
      </div>
    </div>
  )

  const sportProfileContent = !sportProfileLoading ? (
    <div id="sport-profile" className="scroll-mt-24 bg-white dark:bg-slate-900/50 rounded-lg shadow-md dark:border dark:border-white/10 p-4 sm:p-6">
      <h2 className="text-xl font-semibold mb-4 dark:text-white">{t('overview.sportSpecificData')}</h2>
      <SportProfileEditor
        key={sportProfile?.id ?? id}
        clientId={id}
        sportProfile={sportProfile}
        onUpdated={(updatedProfile) => setSportProfile(updatedProfile as SportProfileSummary | null)}
      />
    </div>
  ) : null

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="bg-white dark:bg-slate-900/50 rounded-lg shadow-md dark:border dark:border-white/10 p-4 sm:p-6">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg sm:text-xl font-semibold dark:text-white">{t('profile.statusTitle')}</h2>
              <Badge
                variant="outline"
                className={cn(
                  'border font-medium',
                  profileSetupTone === 'good' && 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200',
                  profileSetupTone === 'caution' && 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200',
                  profileSetupTone === 'setup' && 'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-200',
                )}
              >
                {profileSetupTone === 'good' ? <CheckCircle2 className="mr-1 h-3.5 w-3.5" /> : <CircleAlert className="mr-1 h-3.5 w-3.5" />}
                {t(`profile.status.${profileSetupTone}`)}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              {t(`profile.statusSummary.${profileSetupTone}`)}
            </p>
          </div>
          <Link href={`${basePath}/clients/${id}/edit`}>
            <Button variant="outline" size="sm" className="w-full sm:w-auto">
              <Edit2 className="w-4 h-4 mr-2" />
              {t('actions.edit')}
            </Button>
          </Link>
        </div>

        <div className="grid gap-3 md:grid-cols-4 mt-5">
          {profileSetupItems.map((item) => (
            <div key={item.id} className="rounded-lg border border-gray-200 dark:border-white/10 p-3">
              <div className="flex items-center gap-2">
                {item.complete ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-300" />
                ) : (
                  <CircleAlert className="h-4 w-4 text-amber-600 dark:text-amber-300" />
                )}
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{item.label}</p>
              </div>
              <p className="text-sm font-semibold text-gray-900 dark:text-white mt-2 truncate">{item.value}</p>
            </div>
          ))}
        </div>

        <div className="grid gap-3 md:grid-cols-3 mt-5">
          {!client.athleteAccount ? (
            <CreateAthleteAccountDialog
              clientId={id}
              clientName={client.name}
              clientEmail={client.email}
              clientPhone={client.phone}
              hasExistingAccount={false}
              onAccountCreated={onRefetchClient}
              trigger={
                <Button variant="outline" className="h-auto w-full justify-start p-3">
                  <div className="text-left">
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">{t('profile.actions.createAccount')}</p>
                    <p className="text-xs text-muted-foreground mt-1">{t('profile.actions.createAccountDescription')}</p>
                  </div>
                </Button>
              }
            />
          ) : (
            <CreateAthleteAccountDialog
              clientId={id}
              clientName={client.name}
              clientEmail={client.email}
              clientPhone={client.phone}
              hasExistingAccount
              onAccountCreated={onRefetchClient}
              trigger={
                <Button variant="outline" className="h-auto w-full justify-start p-3">
                  <div className="text-left">
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">{t('profile.actions.sendInvite')}</p>
                    <p className="text-xs text-muted-foreground mt-1">{t('profile.actions.sendInviteDescription')}</p>
                  </div>
                </Button>
              }
            />
          )}

          <Link href={`${basePath}/clients/${id}/edit`}>
            <Button variant="outline" className="h-auto w-full justify-start p-3">
              <div className="text-left">
                <p className="text-sm font-semibold text-gray-900 dark:text-white">{t('profile.actions.editDetails')}</p>
                <p className="text-xs text-muted-foreground mt-1">{t('profile.actions.editDetailsDescription')}</p>
              </div>
            </Button>
          </Link>

          <Link href={`${basePath}/clients/${id}?tab=profile`}>
            <Button variant="outline" className="h-auto w-full justify-start p-3">
              <div className="text-left">
                <p className="text-sm font-semibold text-gray-900 dark:text-white">{t('profile.actions.sportProfile')}</p>
                <p className="text-xs text-muted-foreground mt-1">{t('profile.actions.sportProfileDescription')}</p>
              </div>
            </Button>
          </Link>
        </div>
      </div>
      {profileOverviewContent}
      {sportProfileContent}
      <GarminConnectionCard clientId={id} />
    </div>
  )
}
