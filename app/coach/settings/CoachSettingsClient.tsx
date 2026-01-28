'use client'

import React from 'react'
import { Settings, ChevronLeft, Bot, Palette, ChevronRight } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ThemeSelector } from '@/components/athlete/settings/ThemeSelector'
import { GlassCard, GlassCardContent } from '@/components/ui/GlassCard'
import type { User } from '@supabase/supabase-js'

interface CoachSettingsClientProps {
    user: User
    businessSlug?: string
}

export function CoachSettingsClient({ user, businessSlug }: CoachSettingsClientProps) {
    const displayName = user.email || 'Coach'
    const basePath = businessSlug ? `/${businessSlug}/coach` : '/coach'

    return (
        <div className="min-h-screen text-slate-900 dark:text-slate-200 pb-20 selection:bg-orange-500/30 transition-colors">
            {/* Background elements are managed by the parent Layout/ThemedContent */}

            {/* Header - Sticky below the main nav bar */}
            <div className="bg-white/70 dark:bg-black/40 backdrop-blur-md border-b border-slate-200 dark:border-white/5 sticky top-16 z-20 transition-colors">
                <div className="container max-w-lg mx-auto px-4 py-4 flex items-center gap-4">
                    <Link href={`${basePath}/dashboard`}>
                        <Button variant="ghost" size="icon" className="text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 rounded-full transition-all">
                            <ChevronLeft className="h-5 w-5" />
                        </Button>
                    </Link>
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-orange-100 dark:bg-orange-500/10 flex items-center justify-center border border-orange-200 dark:border-orange-500/20 transition-colors">
                            <Settings className="h-5 w-5 text-orange-600 dark:text-orange-400 transition-colors" />
                        </div>
                        <div>
                            <h1 className="text-lg font-black uppercase italic tracking-tight text-slate-900 dark:text-white leading-none transition-colors">Inställningar</h1>
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mt-1 transition-colors">Coach Preferenser</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="container max-w-lg mx-auto p-4 space-y-6 relative z-10">
                {/* Coach Info */}
                <GlassCard>
                    <GlassCardContent className="p-6">
                        <h2 className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-500 mb-2 transition-colors">Inloggad som</h2>
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900 border border-slate-200 dark:border-white/10 flex items-center justify-center text-xl font-black italic text-slate-700 dark:text-white transition-all">
                                {displayName.charAt(0).toUpperCase()}
                            </div>
                            <div>
                                <p className="text-xl font-black italic tracking-tight text-slate-900 dark:text-white transition-colors">{displayName}</p>
                                <p className="text-xs text-slate-500 dark:text-slate-400 transition-colors">Coach</p>
                            </div>
                        </div>
                    </GlassCardContent>
                </GlassCard>

                {/* Theme Settings */}
                <div className="space-y-4">
                    <div className="flex items-center gap-2 px-2">
                        <div className="w-1.5 h-4 bg-orange-500 rounded-full" />
                        <h3 className="text-xs font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 transition-colors">Utseende</h3>
                    </div>
                    <ThemeSelector variant="glass" />
                </div>

                {/* AI Settings Link */}
                <div className="space-y-4">
                    <div className="flex items-center gap-2 px-2">
                        <div className="w-1.5 h-4 bg-purple-500 rounded-full" />
                        <h3 className="text-xs font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 transition-colors">AI Inställningar</h3>
                    </div>
                    <Link href={`${basePath}/settings/ai`}>
                        <div className="bg-white/60 dark:bg-white/5 backdrop-blur-md border border-slate-200/50 dark:border-white/10 rounded-2xl p-4 hover:bg-white/80 dark:hover:bg-white/10 transition-all cursor-pointer group">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-500/10 flex items-center justify-center border border-purple-200 dark:border-purple-500/20">
                                        <Bot className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                                    </div>
                                    <div>
                                        <p className="font-semibold text-slate-900 dark:text-white">AI Modell & Konfiguration</p>
                                        <p className="text-xs text-slate-500 dark:text-slate-400">Hantera AI-modeller och system promptar</p>
                                    </div>
                                </div>
                                <ChevronRight className="h-5 w-5 text-slate-400 group-hover:text-slate-600 dark:group-hover:text-white transition-colors" />
                            </div>
                        </div>
                    </Link>
                </div>

            </div>
        </div>
    )
}
