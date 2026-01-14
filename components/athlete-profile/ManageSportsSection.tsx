'use client'

import { useState } from 'react'
import { Settings2, ChevronRight, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { GlassCard, GlassCardContent } from '@/components/ui/GlassCard'
import { ChangeSportDialog } from '@/components/athlete/ChangeSportDialog'
import { SPORT_OPTIONS } from '@/components/onboarding/SportSelector'
import { SportType } from '@prisma/client'
import { cn } from '@/lib/utils'

interface ManageSportsSectionProps {
  clientId: string
  sportProfile: {
    primarySport: string
    secondarySports?: string[]
  }
}

export function ManageSportsSection({ clientId, sportProfile }: ManageSportsSectionProps) {
  const [showChangeSportDialog, setShowChangeSportDialog] = useState(false)

  const primarySportInfo = SPORT_OPTIONS.find(s => s.value === sportProfile.primarySport)
  const secondarySports = (sportProfile.secondarySports || []) as SportType[]
  const secondarySportsInfo = secondarySports
    .map(sport => SPORT_OPTIONS.find(s => s.value === sport))
    .filter(Boolean)

  return (
    <>
      <GlassCard className="mt-6 border-slate-200 bg-white/80 dark:border-white/5 dark:bg-white/5 shadow-sm dark:shadow-none">
        <GlassCardContent className="p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            {/* Sports Info */}
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-3">
                <Settings2 className="h-4 w-4 text-slate-500 dark:text-slate-400" />
                <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">
                  Mina sporter
                </h3>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                {/* Primary Sport */}
                {primarySportInfo && (
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{primarySportInfo.icon}</span>
                    <div>
                      <p className="text-sm font-bold text-slate-900 dark:text-white">
                        {primarySportInfo.labelSv}
                      </p>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                        Huvudsport
                      </p>
                    </div>
                  </div>
                )}

                {/* Secondary Sports */}
                {secondarySportsInfo.length > 0 && (
                  <>
                    <div className="hidden sm:block h-8 w-px bg-slate-200 dark:bg-white/10 mx-2" />
                    <div className="flex items-center gap-2">
                      {secondarySportsInfo.map((sport) => sport && (
                        <Badge
                          key={sport.value}
                          variant="secondary"
                          className="gap-1.5 h-8 px-3 bg-slate-100 dark:bg-white/5 border-slate-200 dark:border-white/10"
                        >
                          <span>{sport.icon}</span>
                          <span className="text-xs">{sport.labelSv}</span>
                        </Badge>
                      ))}
                    </div>
                  </>
                )}

                {/* No secondary sports message */}
                {secondarySportsInfo.length === 0 && (
                  <>
                    <div className="hidden sm:block h-8 w-px bg-slate-200 dark:bg-white/10 mx-2" />
                    <p className="text-xs text-slate-400 dark:text-slate-500 italic">
                      Inga sekundära sporter valda
                    </p>
                  </>
                )}
              </div>
            </div>

            {/* Manage Button */}
            <Button
              variant="outline"
              onClick={() => setShowChangeSportDialog(true)}
              className={cn(
                "gap-2 h-10 px-4 rounded-xl transition-all",
                "border-slate-200 dark:border-white/10",
                "hover:bg-slate-100 dark:hover:bg-white/5",
                "text-slate-700 dark:text-slate-300"
              )}
            >
              {secondarySportsInfo.length === 0 ? (
                <>
                  <Plus className="h-4 w-4" />
                  <span className="text-xs font-bold uppercase tracking-wide">Lägg till sporter</span>
                </>
              ) : (
                <>
                  <Settings2 className="h-4 w-4" />
                  <span className="text-xs font-bold uppercase tracking-wide">Hantera sporter</span>
                  <ChevronRight className="h-4 w-4" />
                </>
              )}
            </Button>
          </div>

          {/* Helper text */}
          <p className="mt-4 text-[10px] text-slate-400 dark:text-slate-500 leading-relaxed">
            Du kan välja en huvudsport och upp till 2 sekundära sporter. Sekundära sporter låter dig snabbt växla mellan
            olika träningsvyer via dropdown-menyn i navigeringen.
          </p>
        </GlassCardContent>
      </GlassCard>

      {/* Change Sport Dialog */}
      <ChangeSportDialog
        open={showChangeSportDialog}
        onOpenChange={setShowChangeSportDialog}
        clientId={clientId}
        currentSport={sportProfile.primarySport as SportType}
        currentSecondarySports={secondarySports}
      />
    </>
  )
}
