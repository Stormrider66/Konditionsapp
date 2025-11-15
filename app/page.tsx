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

          // Only redirect athletes, let coaches stay on home page
          if (role === 'ATHLETE') {
            window.location.href = '/athlete/dashboard'
            return
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
        <main className="max-w-7xl mx-auto px-4 py-6 lg:py-12">
          {/* Statistik */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 mb-6 md:mb-8">
            {stats.loading ? (
              <>
                <LoadingStats />
                <LoadingStats />
              </>
            ) : (
              <>
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Totalt antal klienter</p>
                        <p className="text-3xl font-bold text-blue-600 mt-1">
                          {stats.clientCount}
                        </p>
                      </div>
                      <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                        <Users className="w-6 h-6 text-blue-600" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Totalt antal tester</p>
                        <p className="text-3xl font-bold text-green-600 mt-1">
                          {stats.testCount}
                        </p>
                      </div>
                      <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                        <ClipboardList className="w-6 h-6 text-green-600" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </div>

          {/* Huvudmeny */}
          <Card className="p-4 md:p-8">
            <h2 className="text-xl md:text-2xl font-semibold mb-3 md:mb-4">Välkommen!</h2>
            <p className="text-muted-foreground mb-4 md:mb-6 text-sm md:text-base">
              Denna applikation hjälper dig att automatiskt generera professionella
              konditionstestrapporter.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
              <Link href="/test">
                <Card className="h-full hover:shadow-lg hover:border-blue-300 transition cursor-pointer">
                  <CardContent className="p-6">
                    <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                      <Plus className="w-6 h-6 text-blue-600" />
                    </div>
                    <h3 className="text-lg font-semibold mb-2">Nytt Test</h3>
                    <p className="text-muted-foreground text-sm">
                      Skapa ett nytt konditionstest och generera rapport
                    </p>
                  </CardContent>
                </Card>
              </Link>

              <Link href="/clients">
                <Card className="h-full hover:shadow-lg hover:border-blue-300 transition cursor-pointer">
                  <CardContent className="p-6">
                    <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
                      <User2 className="w-6 h-6 text-green-600" />
                    </div>
                    <h3 className="text-lg font-semibold mb-2">Klientregister</h3>
                    <p className="text-muted-foreground text-sm">
                      Hantera klientinformation och testhistorik
                    </p>
                  </CardContent>
                </Card>
              </Link>

              <Link href="/coach/programs">
                <Card className="h-full hover:shadow-lg hover:border-purple-300 transition cursor-pointer">
                  <CardContent className="p-6">
                    <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
                      <Calendar className="w-6 h-6 text-purple-600" />
                    </div>
                    <h3 className="text-lg font-semibold mb-2">Träningsprogram</h3>
                    <p className="text-muted-foreground text-sm">
                      Visa och hantera alla träningsprogram
                    </p>
                  </CardContent>
                </Card>
              </Link>

              <Card className="opacity-50 cursor-not-allowed">
                <CardContent className="p-6">
                  <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center mb-4">
                    <FileText className="w-6 h-6 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">Rapporter</h3>
                  <p className="text-muted-foreground text-sm">
                    Visa och exportera genererade rapporter (Kommer snart)
                  </p>
                </CardContent>
              </Card>
            </div>
          </Card>

          {/* Info box */}
          <Card className="mt-6 md:mt-8 bg-blue-50 border-blue-200">
            <CardContent className="p-4 md:p-6">
              <h3 className="font-semibold text-blue-900 mb-2 text-sm md:text-base">Kom igång</h3>
              <ol className="list-decimal list-inside space-y-2 text-xs md:text-sm text-blue-800">
                <li>Skapa en ny klient i klientregistret</li>
                <li>Genomför ett konditionstest och registrera testdata</li>
                <li>Generera en professionell rapport automatiskt</li>
                <li>Spara och jämför tester över tid</li>
              </ol>
            </CardContent>
          </Card>
        </main>
      </div>
    )
  }

  // Landing page for non-authenticated users
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-cyan-900 text-white overflow-hidden relative">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-cyan-500/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gold/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }}></div>
      </div>

      {/* Navigation */}
      <nav className="relative z-10 container mx-auto px-4 py-6 flex justify-between items-center">
        <div className="flex items-center space-x-2">
          <div className="w-10 h-10 bg-gradient-to-br from-gold to-cyan rounded-lg flex items-center justify-center">
            <Activity className="w-6 h-6 text-white" />
          </div>
          <span className="text-xl font-bold">Star by Thomson</span>
        </div>
        <div className="flex items-center space-x-4">
          <Link href="/login">
            <Button variant="ghost" className="text-white hover:text-cyan-300 hover:bg-white/10">
              Logga in
            </Button>
          </Link>
          <Link href="/register">
            <Button className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white border-0">
              Kom igång
            </Button>
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="relative z-10 container mx-auto px-4 py-20 md:py-32">
        <div className="max-w-5xl mx-auto text-center">
          {/* Main Headline */}
          <div className="mb-6 inline-flex items-center space-x-2 bg-white/10 backdrop-blur-sm rounded-full px-4 py-2 border border-white/20">
            <Sparkles className="w-4 h-4 text-gold" />
            <span className="text-sm">Professionell konditionstestning</span>
          </div>
          
          <h1 className="text-5xl md:text-7xl font-bold mb-6 bg-gradient-to-r from-white via-cyan-100 to-blue-100 bg-clip-text text-transparent leading-tight">
            Optimera Prestanda
            <br />
            <span className="text-gold">Med Data</span>
          </h1>
          
          <p className="text-xl md:text-2xl text-gray-300 mb-12 max-w-3xl mx-auto leading-relaxed">
            Den ultimata plattformen för tränare och idrottare att generera professionella 
            konditionstestrapporter, spåra progression och skapa skräddarsydda träningsprogram.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-16">
            <Link href="/register">
              <Button size="lg" className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white text-lg px-8 py-6 rounded-xl shadow-2xl hover:shadow-cyan-500/50 transition-all duration-300 hover:scale-105">
                Börja gratis
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </Link>
            <Link href="/login">
              <Button size="lg" variant="outline" className="border-2 border-white/30 text-white text-lg px-8 py-6 rounded-xl hover:bg-white/10 backdrop-blur-sm transition-all duration-300">
                Har du redan ett konto?
              </Button>
            </Link>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-3xl mx-auto">
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
              <div className="text-4xl font-bold text-gold mb-2">100%</div>
              <div className="text-gray-300">Automatiserad</div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
              <div className="text-4xl font-bold text-cyan-400 mb-2">24/7</div>
              <div className="text-gray-300">Tillgänglig</div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
              <div className="text-4xl font-bold text-blue-400 mb-2">Pro</div>
              <div className="text-gray-300">Rapporter</div>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="relative z-10 bg-white/5 backdrop-blur-sm border-t border-white/10">
        <div className="container mx-auto px-4 py-20">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              För <span className="text-gold">Tränare</span> och <span className="text-cyan-400">Idrottare</span>
            </h2>
            <p className="text-xl text-gray-300 max-w-2xl mx-auto">
              Allt du behöver för att maximera prestanda och spåra framsteg
            </p>
          </div>

          {/* Feature Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {/* Coach Features */}
            <Card className="bg-gradient-to-br from-blue-900/50 to-cyan-900/50 border-cyan-500/30 backdrop-blur-sm text-white">
              <CardContent className="p-8">
                <div className="w-14 h-14 bg-cyan-500/20 rounded-xl flex items-center justify-center mb-6">
                  <Users className="w-7 h-7 text-cyan-400" />
                </div>
                <h3 className="text-2xl font-bold mb-4">För Tränare</h3>
                <ul className="space-y-3 text-gray-300">
                  <li className="flex items-start">
                    <CheckCircle2 className="w-5 h-5 text-cyan-400 mr-2 mt-0.5 flex-shrink-0" />
                    <span>Hantera flera idrottare</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle2 className="w-5 h-5 text-cyan-400 mr-2 mt-0.5 flex-shrink-0" />
                    <span>Generera professionella rapporter</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle2 className="w-5 h-5 text-cyan-400 mr-2 mt-0.5 flex-shrink-0" />
                    <span>Skapa träningsprogram</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle2 className="w-5 h-5 text-cyan-400 mr-2 mt-0.5 flex-shrink-0" />
                    <span>Spåra progression över tid</span>
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-blue-900/50 to-cyan-900/50 border-cyan-500/30 backdrop-blur-sm text-white">
              <CardContent className="p-8">
                <div className="w-14 h-14 bg-blue-500/20 rounded-xl flex items-center justify-center mb-6">
                  <BarChart3 className="w-7 h-7 text-blue-400" />
                </div>
                <h3 className="text-2xl font-bold mb-4">Avancerad Analys</h3>
                <ul className="space-y-3 text-gray-300">
                  <li className="flex items-start">
                    <CheckCircle2 className="w-5 h-5 text-blue-400 mr-2 mt-0.5 flex-shrink-0" />
                    <span>VO2max-beräkningar</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle2 className="w-5 h-5 text-blue-400 mr-2 mt-0.5 flex-shrink-0" />
                    <span>Tröskelvärden automatiskt</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle2 className="w-5 h-5 text-blue-400 mr-2 mt-0.5 flex-shrink-0" />
                    <span>Träningszoner (Garmin 5-zoner)</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle2 className="w-5 h-5 text-blue-400 mr-2 mt-0.5 flex-shrink-0" />
                    <span>Löpekonomi-analys</span>
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-blue-900/50 to-cyan-900/50 border-cyan-500/30 backdrop-blur-sm text-white">
              <CardContent className="p-8">
                <div className="w-14 h-14 bg-gold/20 rounded-xl flex items-center justify-center mb-6">
                  <FileText className="w-7 h-7 text-gold" />
                </div>
                <h3 className="text-2xl font-bold mb-4">PDF-export</h3>
                <ul className="space-y-3 text-gray-300">
                  <li className="flex items-start">
                    <CheckCircle2 className="w-5 h-5 text-gold mr-2 mt-0.5 flex-shrink-0" />
                    <span>Professionella rapportmallar</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle2 className="w-5 h-5 text-gold mr-2 mt-0.5 flex-shrink-0" />
                    <span>Interaktiva diagram</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle2 className="w-5 h-5 text-gold mr-2 mt-0.5 flex-shrink-0" />
                    <span>E-postintegration</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle2 className="w-5 h-5 text-gold mr-2 mt-0.5 flex-shrink-0" />
                    <span>Utskriftsvänlig layout</span>
                  </li>
                </ul>
              </CardContent>
            </Card>

            {/* Athlete Features */}
            <Card className="bg-gradient-to-br from-gold/10 to-cyan-900/50 border-gold/30 backdrop-blur-sm text-white">
              <CardContent className="p-8">
                <div className="w-14 h-14 bg-gold/20 rounded-xl flex items-center justify-center mb-6">
                  <Target className="w-7 h-7 text-gold" />
                </div>
                <h3 className="text-2xl font-bold mb-4">För Idrottare</h3>
                <ul className="space-y-3 text-gray-300">
                  <li className="flex items-start">
                    <CheckCircle2 className="w-5 h-5 text-gold mr-2 mt-0.5 flex-shrink-0" />
                    <span>Följ dina träningsprogram</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle2 className="w-5 h-5 text-gold mr-2 mt-0.5 flex-shrink-0" />
                    <span>Se din progression</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle2 className="w-5 h-5 text-gold mr-2 mt-0.5 flex-shrink-0" />
                    <span>Logga träningar</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle2 className="w-5 h-5 text-gold mr-2 mt-0.5 flex-shrink-0" />
                    <span>Kommunikera med din tränare</span>
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-blue-900/50 to-cyan-900/50 border-cyan-500/30 backdrop-blur-sm text-white">
              <CardContent className="p-8">
                <div className="w-14 h-14 bg-cyan-500/20 rounded-xl flex items-center justify-center mb-6">
                  <TrendingUp className="w-7 h-7 text-cyan-400" />
                </div>
                <h3 className="text-2xl font-bold mb-4">Progression</h3>
                <ul className="space-y-3 text-gray-300">
                  <li className="flex items-start">
                    <CheckCircle2 className="w-5 h-5 text-cyan-400 mr-2 mt-0.5 flex-shrink-0" />
                    <span>Jämför tester över tid</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle2 className="w-5 h-5 text-cyan-400 mr-2 mt-0.5 flex-shrink-0" />
                    <span>Visualisera förbättringar</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle2 className="w-5 h-5 text-cyan-400 mr-2 mt-0.5 flex-shrink-0" />
                    <span>Sätt mål och spåra dem</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle2 className="w-5 h-5 text-cyan-400 mr-2 mt-0.5 flex-shrink-0" />
                    <span>Få insikter från din tränare</span>
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-blue-900/50 to-cyan-900/50 border-cyan-500/30 backdrop-blur-sm text-white">
              <CardContent className="p-8">
                <div className="w-14 h-14 bg-cyan-500/20 rounded-xl flex items-center justify-center mb-6">
                  <Zap className="w-7 h-7 text-cyan-400" />
                </div>
                <h3 className="text-2xl font-bold mb-4">Snabbt & Enkelt</h3>
                <ul className="space-y-3 text-gray-300">
                  <li className="flex items-start">
                    <CheckCircle2 className="w-5 h-5 text-cyan-400 mr-2 mt-0.5 flex-shrink-0" />
                    <span>Intuitivt gränssnitt</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle2 className="w-5 h-5 text-cyan-400 mr-2 mt-0.5 flex-shrink-0" />
                    <span>Responsiv design</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle2 className="w-5 h-5 text-cyan-400 mr-2 mt-0.5 flex-shrink-0" />
                    <span>Säker datalagring</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle2 className="w-5 h-5 text-cyan-400 mr-2 mt-0.5 flex-shrink-0" />
                    <span>Stöd för löpning & cykling</span>
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Final CTA Section */}
      <div className="relative z-10 border-t border-white/10 bg-gradient-to-r from-blue-900/50 via-cyan-900/50 to-blue-900/50">
        <div className="container mx-auto px-4 py-20 text-center">
          <h2 className="text-4xl md:text-5xl font-bold mb-6">
            Redo att börja?
          </h2>
          <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
            Gå med idag och börja optimera din eller dina idrottares prestanda
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/register">
              <Button size="lg" className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white text-lg px-8 py-6 rounded-xl shadow-2xl hover:shadow-cyan-500/50 transition-all duration-300 hover:scale-105">
                Skapa konto gratis
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </Link>
            <Link href="/login">
              <Button size="lg" variant="outline" className="border-2 border-white/30 text-white text-lg px-8 py-6 rounded-xl hover:bg-white/10 backdrop-blur-sm transition-all duration-300">
                Logga in
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/10 bg-black/20 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-8 text-center text-gray-400">
          <p>&copy; {new Date().getFullYear()} Star by Thomson. Alla rättigheter förbehållna.</p>
        </div>
      </footer>
    </div>
  )
}
