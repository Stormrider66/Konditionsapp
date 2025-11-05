'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { LoadingStats } from '@/components/ui/loading'
import { Users, ClipboardList, Plus, User2, FileText, Calendar } from 'lucide-react'
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

  useEffect(() => {
    fetchStats()
    fetchUser()
  }, [])

  const fetchUser = async () => {
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    setUser(user)

    // Fetch user role if user is authenticated
    if (user) {
      try {
        const response = await fetch('/api/users/me')
        const result = await response.json()
        if (result.success) {
          setUserRole(result.data.role)
        }
      } catch (error) {
        console.error('Error fetching user role:', error)
      }
    }
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
