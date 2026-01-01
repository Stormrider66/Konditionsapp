'use client'

import {
    Activity,
    Flame,
    Timer,
    Trophy,
    ChevronRight,
    CalendarDays,
    Dumbbell,
    TrendingUp,
    Zap
} from 'lucide-react'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'

export default function DesignPreviewPage() {
    return (
        <div className="min-h-screen bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-slate-800 via-slate-950 to-black text-slate-200 selection:bg-orange-500/30 font-sans">

            {/* Navbar Mock */}
            <nav className="border-b border-white/5 bg-slate-950/50 backdrop-blur-md sticky top-0 z-50">
                <div className="container mx-auto px-6 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center text-white font-bold shadow-[0_0_15px_rgba(249,115,22,0.5)]">
                            K
                        </div>
                        <span className="font-bold text-lg tracking-tight text-white">Konditionstest<span className="text-orange-500">.se</span></span>
                    </div>
                    <div className="flex items-center gap-6 text-sm font-medium text-slate-400">
                        <span className="text-white">Dashboard</span>
                        <span className="hover:text-white transition-colors cursor-pointer">Training</span>
                        <span className="hover:text-white transition-colors cursor-pointer">Analysis</span>
                        <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700"></div>
                    </div>
                </div>
            </nav>

            <main className="container mx-auto px-6 py-8 space-y-8">

                {/* Welcome Section */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
                    <div>
                        <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
                            Welcome back, <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-red-500">Henrik</span>
                        </h1>
                        <p className="text-slate-400 flex items-center gap-2">
                            <CalendarDays className="w-4 h-4 text-orange-500" />
                            Tuesday, 31 December • <span className="text-orange-400 font-medium">Phase 2: Hypertrophy</span>
                        </p>
                    </div>
                    <Button className="bg-orange-600 hover:bg-orange-700 text-white shadow-[0_0_20px_rgba(234,88,12,0.3)] border-0">
                        <Zap className="w-4 h-4 mr-2" /> Start Session
                    </Button>
                </div>

                {/* Hero Card: Next Workout */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <Card className="lg:col-span-2 border-0 bg-slate-900/60 backdrop-blur-xl ring-1 ring-white/10 shadow-2xl overflow-hidden relative group">
                        <div className="absolute inset-0 bg-gradient-to-r from-orange-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                        <div className="absolute top-0 right-0 p-6 md:p-8 w-1/2 h-full hidden md:block opacity-40 mix-blend-screen pointer-events-none">
                            {/* Using the generated image here */}
                            <div className="relative w-full h-full mask-image-gradient">
                                <Image
                                    src="/images/posterior-chain/marklyft-1.png"
                                    alt="Deadlift"
                                    fill
                                    style={{ objectFit: 'contain', objectPosition: 'right center' }}
                                    className="drop-shadow-[0_0_15px_rgba(255,100,0,0.3)]"
                                />
                            </div>
                        </div>

                        <CardContent className="p-8 relative z-10 flex flex-col h-full justify-between min-h-[300px]">
                            <div>
                                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-400 text-xs font-bold uppercase tracking-wider mb-4">
                                    <Flame className="w-3 h-3" />
                                    Heavy Lower Body
                                </div>
                                <h2 className="text-3xl font-bold text-white mb-2 max-w-md">Posterior Chain Focus</h2>
                                <p className="text-slate-400 max-w-sm">
                                    Focus on explosive hinge movements and hamstring activation.
                                    Primary lift: <span className="text-white font-semibold">Deadlift</span>.
                                </p>
                            </div>

                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-6 mt-8">
                                <div>
                                    <div className="text-slate-500 text-xs uppercase tracking-wider mb-1">Duration</div>
                                    <div className="text-xl font-bold text-white flex items-center gap-2">
                                        <Timer className="w-5 h-5 text-orange-500" /> 60 min
                                    </div>
                                </div>
                                <div>
                                    <div className="text-slate-500 text-xs uppercase tracking-wider mb-1">Volume</div>
                                    <div className="text-xl font-bold text-white flex items-center gap-2">
                                        <Dumbbell className="w-5 h-5 text-orange-500" /> 12,400 kg
                                    </div>
                                </div>
                                <div>
                                    <div className="text-slate-500 text-xs uppercase tracking-wider mb-1">Intensity</div>
                                    <div className="text-xl font-bold text-white flex items-center gap-2">
                                        <Activity className="w-5 h-5 text-orange-500" /> RPE 8
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Quick Stats Column */}
                    <div className="space-y-6">
                        <Card className="border-0 bg-slate-900/60 backdrop-blur-xl ring-1 ring-white/10 h-full">
                            <CardHeader>
                                <CardTitle className="text-lg text-white flex items-center gap-2">
                                    <TrendingUp className="w-5 h-5 text-cyan-400" /> Readiness
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div>
                                    <div className="flex justify-between text-sm mb-2">
                                        <span className="text-slate-400">Recovery Score</span>
                                        <span className="text-emerald-400 font-bold">94%</span>
                                    </div>
                                    <Progress value={94} className="h-2 bg-slate-800 [&>div]:bg-emerald-500 [&>div]:shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
                                </div>

                                <div>
                                    <div className="flex justify-between text-sm mb-2">
                                        <span className="text-slate-400">Weekly Load</span>
                                        <span className="text-orange-400 font-bold">850 / 1000</span>
                                    </div>
                                    <Progress value={85} className="h-2 bg-slate-800 [&>div]:bg-orange-500" />
                                </div>

                                <div className="pt-4 border-t border-white/5">
                                    <h4 className="text-sm font-medium text-white mb-3">Muscular Fatigue</h4>
                                    <div className="flex gap-2 flex-wrap">
                                        <span className="px-2 py-1 bg-red-500/10 border border-red-500/20 text-red-500 text-xs rounded">Legs (High)</span>
                                        <span className="px-2 py-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-xs rounded">Push (Fresh)</span>
                                        <span className="px-2 py-1 bg-cyan-500/10 border border-cyan-500/20 text-cyan-500 text-xs rounded">Pull (Fresh)</span>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>

                {/* Recent Library Additions */}
                <div>
                    <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                        <Dumbbell className="w-5 h-5 text-orange-500" /> Recent Exercises
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                        {[
                            { name: 'Deadlift', img: '/images/posterior-chain/marklyft-1.png' },
                            { name: 'Kettlebell Swing', img: '/images/posterior-chain/kettlebell-swing-1.png' },
                            { name: 'Box Jump', img: '/images/posterior-chain/box-jump-1.png' },
                            { name: 'Clean', img: '/images/posterior-chain/clean-1.png' },
                            { name: 'Farmers Carry', img: '/images/core/farmers-carry-1.png' }
                        ].map((ex, i) => (
                            <div key={i} className="group relative aspect-[9/16] rounded-xl overflow-hidden bg-slate-900 ring-1 ring-white/10 hover:ring-orange-500/50 transition-all cursor-pointer">
                                <Image src={ex.img} alt={ex.name} fill className="object-cover opacity-80 group-hover:opacity-100 group-hover:scale-105 transition-all duration-500" />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />
                                <div className="absolute bottom-0 left-0 p-4">
                                    <p className="text-white text-sm font-bold leading-tight">{ex.name}</p>
                                    <p className="text-orange-400 text-xs uppercase tracking-wider mt-1 opacity-0 group-hover:opacity-100 transition-opacity transform translate-y-2 group-hover:translate-y-0">View Stats</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

            </main>
        </div>
    )
}
