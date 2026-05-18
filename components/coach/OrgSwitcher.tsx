'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Building2, ChevronDown, CalendarDays, Check } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'
import { useTranslations } from '@/i18n/client'

interface BusinessEntry {
  membershipId: string
  role: string
  businessId: string
  name: string
  slug: string
  logoUrl: string | null
  primaryColor: string
  type: string
}

export function OrgSwitcher({ currentSlug }: { currentSlug: string }) {
  const [businesses, setBusinesses] = useState<BusinessEntry[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const tRoles = useTranslations('components.businessCoachHeader')
  const tOrgSwitcher = useTranslations('components.orgSwitcher')

  const roleLabelFor = (role: string, businessType: string): string => {
    if (role === 'OWNER') return tRoles('roles.owner')
    if (role === 'ADMIN') {
      return businessType !== 'CLUB'
        ? tOrgSwitcher('roles.adminNonClub')
        : tRoles('roles.admin')
    }
    if (role === 'COACH') return tRoles('roles.coach')
    if (role === 'PHYSICAL_TRAINER') return tRoles('roles.physicalTrainer')
    if (role === 'ASSISTANT_COACH') return tRoles('roles.assistantCoach')
    if (role === 'PHYSIO') return tRoles('roles.physio')
    if (role === 'MEMBER') return tRoles('roles.member')

    return role
  }

  useEffect(() => {
    const fetchBusinesses = async () => {
      try {
        const res = await fetch('/api/user/businesses')
        if (res.ok) {
          const data = await res.json()
          setBusinesses(data.businesses || [])
        }
      } catch (err) {
        console.error('[OrgSwitcher] Failed to fetch businesses:', err)
      } finally {
        setIsLoading(false)
      }
    }
    void fetchBusinesses()
  }, [])

  // Don't render if user only has one business or still loading
  if (isLoading || businesses.length <= 1) {
    return null
  }

  const current = businesses.find((b) => b.slug === currentSlug)
  // Fallback: if slug doesn't match any business (stale URL), use first business
  const displayBiz = current || businesses[0]
  const currentRole = roleLabelFor(displayBiz.role, displayBiz.type)

  // Organisation switches should land on that organisation's stable home.
  // Preserving deep paths like team/client ids can point to records that only
  // exist in the previous organisation.
  const getOrgHref = (slug: string) => {
    return `/${slug}/coach/dashboard`
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="flex items-center gap-2 text-sm font-medium transition-colors hover:text-white text-slate-400 max-w-[180px]"
          title={`${displayBiz.name} — ${currentRole}`}
          aria-label={tOrgSwitcher('a11y.switchOrganization', { org: displayBiz.name })}
        >
          <Building2 className="w-4 h-4 shrink-0 opacity-50" />
          <span className="truncate hidden sm:inline">
            {displayBiz.name}
          </span>
          <ChevronDown className="w-3 h-3 opacity-50 shrink-0" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        className="w-72 bg-slate-950 border-white/10 text-slate-200"
        align="start"
      >
        <DropdownMenuLabel className="text-xs text-slate-500 uppercase tracking-wider">
          {tOrgSwitcher('labels.title')}
        </DropdownMenuLabel>
        {businesses.map((biz) => {
          const isActive = biz.slug === currentSlug
          const roleLabel = roleLabelFor(biz.role, biz.type)
          return (
            <DropdownMenuItem
              key={biz.businessId}
              asChild
              className={cn(
                'focus:bg-white/10 focus:text-white cursor-pointer',
                isActive && 'bg-white/5'
              )}
            >
              <Link href={getOrgHref(biz.slug)} className="flex items-center gap-3 w-full">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-sm shrink-0"
                  style={{ backgroundColor: biz.primaryColor }}
                >
                  {biz.logoUrl ? (
                    <Image
                      src={biz.logoUrl}
                      alt={biz.name}
                      width={32}
                      height={32}
                      className="w-8 h-8 rounded-lg object-cover"
                    />
                  ) : (
                    biz.name.charAt(0).toUpperCase()
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={cn('text-sm font-medium truncate', isActive && 'text-white')}>
                      {biz.name}
                    </span>
                    {isActive && <Check className="w-3.5 h-3.5 text-blue-400 shrink-0" />}
                  </div>
                  <span className="text-xs text-slate-500">{roleLabel}</span>
                </div>
              </Link>
            </DropdownMenuItem>
          )
        })}
        <DropdownMenuSeparator className="bg-white/10" />
        <DropdownMenuItem asChild className="focus:bg-white/10 focus:text-white cursor-pointer">
          <Link href="/my/calendar" className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
              <CalendarDays className="w-4 h-4 text-white" />
            </div>
            <div>
              <span className="text-sm font-medium">{tOrgSwitcher('calendar.title')}</span>
              <p className="text-xs text-slate-500">{tOrgSwitcher('calendar.subtitle')}</p>
            </div>
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
