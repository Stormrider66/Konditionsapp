'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { LoadingStats } from '@/components/ui/loading'
import {
  Users,
  ClipboardList,
  Plus,
  User2,
  FileText,
  Calendar,
  TrendingUp,
  Activity,
  BarChart3,
  Target,
  Zap,
  Shield,
  CheckCircle2,
  ArrowRight,
  Sparkles
} from 'lucide-react'
import { MobileNav } from '@/components/navigation/MobileNav'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'

import { LandingPage } from '@/components/landing/LandingPage'

export default function Home() {
  const [stats, setStats] = useState({
    clientCount: 0,
    testCount: 0,
    loading: true,
  })
  const [user, setUser] = useState<User | null>(null)
  const [userRole, setUserRole] = useState<'COACH' | 'ATHLETE' | 'ADMIN' | null>(null)
  const [isCheckingAuth, setIsCheckingAuth] = useState(true)

  useEffect(() => {
    checkAuth()
    fetchStats()
  }, [])

  const checkAuth = async () => {
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    setUser(user)

    if (user) {
      try {
        const response = await fetch('/api/users/me')
        const result = await response.json()
        if (result.success) {
          const role = result.data.role
          setUserRole(role)

          // Redirect athletes to athlete dashboard
          if (role === 'ATHLETE') {
            window.location.href = '/athlete/dashboard'
            return
          }

          // Redirect coaches to their business dashboard
          if (role === 'COACH' || role === 'ADMIN') {
            try {
              const contextResponse = await fetch('/api/coach/admin/context')
              const contextResult = await contextResponse.json()
              if (contextResult.data?.business?.slug) {
                window.location.href = `/${contextResult.data.business.slug}/coach/dashboard`
                return
              }
            } catch (err) {
              console.error('Error fetching business context:', err)
            }
          }
        }
      } catch (error) {
        console.error('Error fetching user role:', error)
      }
    }
    setIsCheckingAuth(false)
  }

  const fetchStats = async () => {
    try {
      const [clientsResponse, testsResponse] = await Promise.all([
        fetch('/api/clients'),
        fetch('/api/tests'),
      ])

      const clientsData = await clientsResponse.json()
      const testsData = await testsResponse.json()

      setStats({
        clientCount: clientsData.success ? clientsData.data.length : 0,
        testCount: testsData.success ? testsData.data.length : 0,
        loading: false,
      })
    } catch (error) {
      console.error('Error fetching stats:', error)
      setStats({ clientCount: 0, testCount: 0, loading: false })
    }
  }

  // Show loading state while checking authentication
  if (isCheckingAuth) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-cyan-50 flex items-center justify-center">
        <div className="animate-pulse text-center">
          <Activity className="w-12 h-12 text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Laddar...</p>
        </div>
      </div>
    )
  }

  // If user is authenticated, show dashboard (they should be redirected, but show as fallback)
  if (user) {
    return (
      <div className="min-h-screen bg-gray-50">
        <MobileNav user={user} userRole={userRole} />
        <main className="max-w-7xl mx-auto px-4 py-6 lg:py-8">
          {/* Welcome Section */}
          <div className="mb-8">
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Välkommen tillbaka!</h1>
            <p className="text-muted-foreground mt-1">Här är en översikt av din verksamhet</p>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {stats.loading ? (
              <>
                <LoadingStats />
                <LoadingStats />
                <LoadingStats />
                <LoadingStats />
              </>
            ) : (
              <>
                <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white">
                  <CardContent className="p-4">
                    <Users className="w-8 h-8 opacity-80 mb-2" />
                    <p className="text-3xl font-bold">{stats.clientCount}</p>
                    <p className="text-sm text-blue-100">Atleter</p>
                  </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white">
                  <CardContent className="p-4">
                    <ClipboardList className="w-8 h-8 opacity-80 mb-2" />
                    <p className="text-3xl font-bold">{stats.testCount}</p>
                    <p className="text-sm text-green-100">Laktattester</p>
                  </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white">
                  <CardContent className="p-4">
                    <Calendar className="w-8 h-8 opacity-80 mb-2" />
                    <p className="text-3xl font-bold">-</p>
                    <p className="text-sm text-purple-100">Program</p>
                  </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-orange-500 to-orange-600 text-white">
                  <CardContent className="p-4">
                    <Activity className="w-8 h-8 opacity-80 mb-2" />
                    <p className="text-3xl font-bold">-</p>
                    <p className="text-sm text-orange-100">Aktiva denna vecka</p>
                  </CardContent>
                </Card>
              </>
            )}
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            {/* Main Actions */}
            <div className="lg:col-span-2">
              <h2 className="text-lg font-semibold mb-4">Snabbåtgärder</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <Link href="/test">
                  <Card className="h-full hover:shadow-lg hover:border-blue-300 transition cursor-pointer group">
                    <CardContent className="p-4 text-center">
                      <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mx-auto mb-3 group-hover:bg-blue-200 transition">
                        <Plus className="w-6 h-6 text-blue-600" />
                      </div>
                      <h3 className="font-semibold text-sm">Nytt Test</h3>
                      <p className="text-xs text-muted-foreground mt-1">Laktattest</p>
                    </CardContent>
                  </Card>
                </Link>

                <Link href="/clients">
                  <Card className="h-full hover:shadow-lg hover:border-green-300 transition cursor-pointer group">
                    <CardContent className="p-4 text-center">
                      <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center mx-auto mb-3 group-hover:bg-green-200 transition">
                        <User2 className="w-6 h-6 text-green-600" />
                      </div>
                      <h3 className="font-semibold text-sm">Atleter</h3>
                      <p className="text-xs text-muted-foreground mt-1">Hantera klienter</p>
                    </CardContent>
                  </Card>
                </Link>

                <Link href="/coach/programs">
                  <Card className="h-full hover:shadow-lg hover:border-purple-300 transition cursor-pointer group">
                    <CardContent className="p-4 text-center">
                      <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center mx-auto mb-3 group-hover:bg-purple-200 transition">
                        <Calendar className="w-6 h-6 text-purple-600" />
                      </div>
                      <h3 className="font-semibold text-sm">Program</h3>
                      <p className="text-xs text-muted-foreground mt-1">Träningsplaner</p>
                    </CardContent>
                  </Card>
                </Link>

                <Link href="/coach/ai-studio">
                  <Card className="h-full hover:shadow-lg hover:border-amber-300 transition cursor-pointer group">
                    <CardContent className="p-4 text-center">
                      <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center mx-auto mb-3 group-hover:bg-amber-200 transition">
                        <Sparkles className="w-6 h-6 text-amber-600" />
                      </div>
                      <h3 className="font-semibold text-sm">AI Studio</h3>
                      <p className="text-xs text-muted-foreground mt-1">AI-assistent</p>
                    </CardContent>
                  </Card>
                </Link>

                <Link href="/coach/video-analysis">
                  <Card className="h-full hover:shadow-lg hover:border-pink-300 transition cursor-pointer group">
                    <CardContent className="p-4 text-center">
                      <div className="w-12 h-12 bg-pink-100 rounded-xl flex items-center justify-center mx-auto mb-3 group-hover:bg-pink-200 transition">
                        <Activity className="w-6 h-6 text-pink-600" />
                      </div>
                      <h3 className="font-semibold text-sm">Video</h3>
                      <p className="text-xs text-muted-foreground mt-1">Löpanalys</p>
                    </CardContent>
                  </Card>
                </Link>

                <Link href="/coach/monitoring">
                  <Card className="h-full hover:shadow-lg hover:border-cyan-300 transition cursor-pointer group">
                    <CardContent className="p-4 text-center">
                      <div className="w-12 h-12 bg-cyan-100 rounded-xl flex items-center justify-center mx-auto mb-3 group-hover:bg-cyan-200 transition">
                        <TrendingUp className="w-6 h-6 text-cyan-600" />
                      </div>
                      <h3 className="font-semibold text-sm">Monitorering</h3>
                      <p className="text-xs text-muted-foreground mt-1">Träningsbelastning</p>
                    </CardContent>
                  </Card>
                </Link>
              </div>
            </div>

            {/* Getting Started Guide */}
            <div>
              <h2 className="text-lg font-semibold mb-4">Kom igång</h2>
              <Card className="bg-gradient-to-br from-slate-50 to-slate-100 border-slate-200">
                <CardContent className="p-4">
                  <div className="space-y-4">
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">1</div>
                      <div>
                        <p className="font-medium text-sm">Lägg till atleter</p>
                        <p className="text-xs text-muted-foreground">Skapa klienter i registret</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">2</div>
                      <div>
                        <p className="font-medium text-sm">Genomför laktattest</p>
                        <p className="text-xs text-muted-foreground">Registrera testdata</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">3</div>
                      <div>
                        <p className="font-medium text-sm">Skapa program</p>
                        <p className="text-xs text-muted-foreground">Bygg träningsplaner</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">4</div>
                      <div>
                        <p className="font-medium text-sm">Följ upp</p>
                        <p className="text-xs text-muted-foreground">Monitorera & analysera</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </main>
      </div>
    )
  }

  // Landing page for non-authenticated users
  return <LandingPage />
}
