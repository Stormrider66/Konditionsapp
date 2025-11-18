'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { 
  Activity, 
  TrendingUp, 
  Timer, 
  Heart, 
  Zap, 
  ShieldCheck, 
  ArrowRight, 
  CheckCircle2,
  ChevronRight,
  BarChart3,
  Calendar
} from 'lucide-react'

export function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Navigation */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-primary-foreground">
              <Activity className="w-5 h-5" />
            </div>
            <span className="text-xl font-bold tracking-tight">Star by Thomson</span>
          </div>
          <nav className="hidden md:flex items-center space-x-6 text-sm font-medium">
            <Link href="#features" className="text-muted-foreground hover:text-primary transition-colors">Funktioner</Link>
            <Link href="#science" className="text-muted-foreground hover:text-primary transition-colors">Vetenskapen</Link>
            <Link href="#pricing" className="text-muted-foreground hover:text-primary transition-colors">Priser</Link>
          </nav>
          <div className="flex items-center space-x-4">
            <Link href="/login">
              <Button variant="ghost" size="sm">Logga in</Button>
            </Link>
            <Link href="/register">
              <Button size="sm" className="bg-primary hover:bg-primary/90">
                Börja nu
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative py-20 lg:py-32 overflow-hidden bg-slate-900 text-white">
          <div className="absolute inset-0 z-0 opacity-20">
            <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-blue-500 via-slate-900 to-slate-900"></div>
          </div>
          
          <div className="container mx-auto px-4 relative z-10">
            <div className="max-w-3xl mx-auto text-center space-y-8">
              <div className="inline-flex items-center rounded-full border border-blue-500/30 bg-blue-500/10 px-3 py-1 text-sm text-blue-300">
                <span className="flex h-2 w-2 rounded-full bg-blue-500 mr-2"></span>
                Nyhet: AI-baserad träningsanalys
              </div>
              
              <h1 className="text-4xl md:text-6xl lg:text-7xl font-extrabold tracking-tight leading-tight">
                Spring snabbare med <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-emerald-400">smartare träning</span>
              </h1>
              
              <p className="text-xl text-slate-300 max-w-2xl mx-auto leading-relaxed">
                Kombinera vetenskaplig precision med modern teknik. Få skräddarsydda träningsprogram baserade på dina laktattester, pulszoner och dagliga dagsform.
              </p>
              
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
                <Link href="/register" className="w-full sm:w-auto">
                  <Button size="lg" className="w-full h-14 text-lg bg-blue-600 hover:bg-blue-500 border-0 shadow-lg shadow-blue-900/20">
                    Skapa konto gratis
                    <ArrowRight className="ml-2 w-5 h-5" />
                  </Button>
                </Link>
                <Link href="/login" className="w-full sm:w-auto">
                  <Button size="lg" variant="outline" className="w-full h-14 text-lg border-slate-700 text-white hover:bg-slate-800 hover:text-white">
                    Logga in
                  </Button>
                </Link>
              </div>

              <div className="pt-12 grid grid-cols-3 gap-8 text-center border-t border-slate-800/50 mt-12">
                <div>
                  <p className="text-3xl font-bold text-white">VO2max</p>
                  <p className="text-sm text-slate-400 uppercase tracking-wider mt-1">Analys</p>
                </div>
                <div>
                  <p className="text-3xl font-bold text-white">5+</p>
                  <p className="text-sm text-slate-400 uppercase tracking-wider mt-1">Zonmodeller</p>
                </div>
                <div>
                  <p className="text-3xl font-bold text-white">100%</p>
                  <p className="text-sm text-slate-400 uppercase tracking-wider mt-1">Anpassat</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Features Grid */}
        <section id="features" className="py-24 bg-slate-50 dark:bg-slate-950">
          <div className="container mx-auto px-4">
            <div className="text-center max-w-2xl mx-auto mb-16">
              <h2 className="text-3xl font-bold mb-4 text-slate-900 dark:text-white">Allt du behöver för att utvecklas</h2>
              <p className="text-lg text-slate-600 dark:text-slate-400">
                Från avancerade tester till daglig uppföljning – vi ger dig verktygen som elitidrottare använder.
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              <FeatureCard 
                icon={<TrendingUp className="w-6 h-6 text-blue-600" />}
                title="Dynamiska Program"
                description="Träningsprogram som anpassar sig efter din utveckling och din dagliga readiness."
              />
              <FeatureCard 
                icon={<Activity className="w-6 h-6 text-emerald-600" />}
                title="Laktat & Zoner"
                description="Exakta träningszoner baserade på dina laktattester för optimal intensitetsstyrning."
              />
              <FeatureCard 
                icon={<Heart className="w-6 h-6 text-red-600" />}
                title="Readiness & HRV"
                description="Daglig hälsokoll som justerar dagens pass baserat på din återhämtning."
              />
              <FeatureCard 
                icon={<Timer className="w-6 h-6 text-amber-600" />}
                title="Race Prediction"
                description="Se vad du kan prestera på milen, halvmaraton eller maraton baserat på din data."
              />
              <FeatureCard 
                icon={<BarChart3 className="w-6 h-6 text-purple-600" />}
                title="Djupanalys"
                description="Följ din utveckling över tid med tydliga grafer och trender."
              />
              <FeatureCard 
                icon={<Calendar className="w-6 h-6 text-indigo-600" />}
                title="Smart Kalender"
                description="Planera din säsong och toppa formen precis när det gäller."
              />
            </div>
          </div>
        </section>

        {/* Science Section */}
        <section id="science" className="py-24 border-t bg-white dark:bg-background">
          <div className="container mx-auto px-4">
            <div className="flex flex-col lg:flex-row items-center gap-16">
              <div className="lg:w-1/2 space-y-8">
                <h2 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-white">
                  Byggt på vetenskap, inte gissningar.
                </h2>
                <p className="text-lg text-slate-600 dark:text-slate-400 leading-relaxed">
                  Vi använder beprövade metoder för att säkerställa att varje löpsteg räknas. Genom att basera din träning på faktiska fysiologiska data minimerar du skaderisken och maximerar effekten.
                </p>
                
                <div className="space-y-4">
                  <div className="flex gap-4">
                    <div className="flex-shrink-0 w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 font-bold">1</div>
                    <div>
                      <h3 className="font-bold text-lg mb-1">Testa</h3>
                      <p className="text-slate-600 dark:text-slate-400">Genomför laktat- eller fälttester för att hitta dina trösklar.</p>
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <div className="flex-shrink-0 w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 font-bold">2</div>
                    <div>
                      <h3 className="font-bold text-lg mb-1">Analysera</h3>
                      <p className="text-slate-600 dark:text-slate-400">Vi beräknar dina zoner och skapar en profil över dina styrkor och svagheter.</p>
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <div className="flex-shrink-0 w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 font-bold">3</div>
                    <div>
                      <h3 className="font-bold text-lg mb-1">Träna</h3>
                      <p className="text-slate-600 dark:text-slate-400">Följ ett program som vet exakt vilken fart du ska hålla idag.</p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="lg:w-1/2">
                <div className="relative rounded-2xl overflow-hidden shadow-2xl border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900 aspect-square lg:aspect-video flex items-center justify-center">
                  {/* Placeholder for visual or chart */}
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-emerald-50 dark:from-slate-900 dark:to-slate-800 opacity-50"></div>
                  <div className="relative z-10 text-center p-8">
                    <Activity className="w-24 h-24 mx-auto text-blue-500/50 mb-4" />
                    <p className="text-slate-400 font-medium">Visualisering av träningszoner</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20 bg-slate-900 text-white">
          <div className="container mx-auto px-4 text-center">
            <h2 className="text-3xl md:text-4xl font-bold mb-6">Redo att ta din löpning till nästa nivå?</h2>
            <p className="text-xl text-slate-300 mb-10 max-w-2xl mx-auto">
              Gå med idag och få tillgång till professionella verktyg som hjälper dig att nå dina mål snabbare och säkrare.
            </p>
            <Link href="/register">
              <Button size="lg" className="h-14 px-8 text-lg bg-white text-slate-900 hover:bg-slate-100">
                Kom igång gratis
                <ChevronRight className="ml-2 w-5 h-5" />
              </Button>
            </Link>
            <p className="mt-6 text-sm text-slate-400">
              Inga kreditkortskrav för att starta.
            </p>
          </div>
        </section>
      </main>

      <footer className="py-12 bg-background border-t">
        <div className="container mx-auto px-4 text-center text-muted-foreground">
          <div className="flex items-center justify-center space-x-2 mb-4">
            <Activity className="w-5 h-5 text-primary" />
            <span className="font-bold text-foreground">Star by Thomson</span>
          </div>
          <p>&copy; {new Date().getFullYear()} Star by Thomson. Alla rättigheter förbehållna.</p>
        </div>
      </footer>
    </div>
  )
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode, title: string, description: string }) {
  return (
    <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:shadow-lg transition-shadow duration-300">
      <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-4">
        {icon}
      </div>
      <h3 className="text-xl font-bold mb-2 text-slate-900 dark:text-white">{title}</h3>
      <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
        {description}
      </p>
    </div>
  )
}

