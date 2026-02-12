// app/clients/[id]/page.tsx
'use client'

import { useEffect, useState, useMemo, Fragment, useCallback, Suspense } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { format } from 'date-fns'
import { sv } from 'date-fns/locale'
import type { Client, Test, TestType, TrainingZone } from '@/types'
import { ProgressionChart } from '@/components/charts/ProgressionChart'
import { SportSpecificAthleteView } from '@/components/coach/sport-views'
import { VisualReportCard } from '@/components/visual-reports/VisualReportCard'
import { PaceValidationDashboard } from '@/components/coach/pace-zones/PaceValidationDashboard'
import { AIContextButton } from '@/components/ai-studio/AIContextButton'
import { AnalyzeTestButton } from '@/components/ai/performance-analysis'
import { ClientVideoAnalyses } from '@/components/coach/video-analysis/ClientVideoAnalyses'
import { VBTProgressionWidget, VBTExerciseProgression } from '@/components/athlete/VBTProgressionWidget'
import { Concept2SummaryWidget } from '@/components/athlete/Concept2SummaryWidget'
import { ZoneDistributionChart } from '@/components/athlete/ZoneDistributionChart'
import { WeeklyZoneSummary } from '@/components/athlete/WeeklyZoneSummary'
import { YearlyTrainingOverview } from '@/components/athlete/YearlyTrainingOverview'
import { usePageContextOptional } from '@/components/ai-studio/PageContextProvider'
import type { PageContext } from '@/components/ai-studio/FloatingAIChat'
import { ClientDetailTabs } from '@/components/client/ClientDetailTabs'
import { UnifiedCalendar } from '@/components/calendar'
import { ChevronDown, ChevronUp, ArrowUpDown, Trash2, Download, Edit2, UserCircle, Calendar, ExternalLink, Loader2, UserPlus } from 'lucide-react'
import { CreateAthleteAccountDialog } from '@/components/client/CreateAthleteAccountDialog'
import { exportClientTestsToCSV } from '@/lib/utils/csv-export'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { SearchInput } from '@/components/ui/search-input'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { useToast } from '@/hooks/use-toast'
import { MobileNav } from '@/components/navigation/MobileNav'
import { createClient as createSupabaseClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'

interface ClientWithTests extends Client {
  tests?: Test[]
}

type SortField = 'date' | 'type' | 'vo2max' | 'status'
type SortDirection = 'asc' | 'desc'

export default function ClientDetailPage() {
  const params = useParams()
  const id = params.id as string

  const [client, setClient] = useState<ClientWithTests | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [programs, setPrograms] = useState<any[]>([])
  const [programsLoading, setProgramsLoading] = useState(true)
  const [sportProfile, setSportProfile] = useState<any>(null)
  const [sportProfileLoading, setSportProfileLoading] = useState(true)

  // Sorting and filtering state
  const [sortField, setSortField] = useState<SortField>('date')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')
  const [filterTestType, setFilterTestType] = useState<TestType | 'ALL'>('ALL')
  const [searchTerm, setSearchTerm] = useState('')
  const [expandedTestId, setExpandedTestId] = useState<string | null>(null)

  // Delete confirmation state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [testToDelete, setTestToDelete] = useState<Test | null>(null)
  const [deleting, setDeleting] = useState(false)

  const { toast } = useToast()
  const pageContextApi = usePageContextOptional()

  // Handler for loading video analysis to AI Studio
  const handleLoadVideoAnalysisToAI = useCallback((analysis: {
    id: string
    videoType: string
    formScore: number | null
    aiAnalysis: string | null
    issuesDetected: Array<{ issue: string; severity: string; description: string }> | null
    recommendations: Array<{ priority: number; recommendation: string; explanation: string }> | null
    exercise: { name: string; nameSv: string | null } | null
  }) => {
    if (!pageContextApi?.setPageContext) {
      toast({
        title: 'AI Studio ej tillgänglig',
        description: 'Öppna AI-chatten för att ladda videoanalys som kontext',
        variant: 'destructive',
      })
      return
    }

    const context: PageContext = {
      type: 'video-analysis',
      title: `Videoanalys: ${analysis.exercise?.nameSv || analysis.exercise?.name || analysis.videoType}`,
      data: {
        analysisId: analysis.id,
        videoType: analysis.videoType,
        formScore: analysis.formScore,
        exercise: analysis.exercise?.nameSv || analysis.exercise?.name,
        issues: analysis.issuesDetected,
        recommendations: analysis.recommendations,
      },
      summary: `Videoanalys för ${client?.name || 'atlet'} - ${analysis.exercise?.nameSv || analysis.exercise?.name || analysis.videoType}. Poäng: ${analysis.formScore ?? 'Ej bedömd'}. ${analysis.issuesDetected?.length || 0} problem identifierade.`,
    }

    pageContextApi.setPageContext(context)
  }, [pageContextApi, client?.name, toast])

  const fetchUser = useCallback(async () => {
    const supabase = createSupabaseClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    setUser(user)
  }, [])

  const fetchClient = useCallback(async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/clients/${id}`)
      const result = await response.json()

      if (result.success) {
        setClient(result.data)
      } else {
        setError(result.error || 'Failed to fetch client')
      }
    } catch (err) {
      setError('Network error')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [id])

  const fetchPrograms = useCallback(async () => {
    try {
      setProgramsLoading(true)
      const response = await fetch(`/api/programs?clientId=${id}`)
      const result = await response.json()

      if (result.success) {
        setPrograms(result.data || [])
      } else {
        console.error('Failed to fetch programs:', result.error)
        setPrograms([])
      }
    } catch (err) {
      console.error('Error fetching programs:', err)
      setPrograms([])
    } finally {
      setProgramsLoading(false)
    }
  }, [id])

  const fetchSportProfile = useCallback(async () => {
    try {
      setSportProfileLoading(true)
      const response = await fetch(`/api/sport-profile/${id}`)
      const result = await response.json()

      if (result.success && result.data) {
        setSportProfile(result.data)
      } else {
        setSportProfile(null)
      }
    } catch (err) {
      console.error('Error fetching sport profile:', err)
      setSportProfile(null)
    } finally {
      setSportProfileLoading(false)
    }
  }, [id])

  useEffect(() => {
    fetchClient()
    fetchUser()
    fetchPrograms()
    fetchSportProfile()
  }, [fetchClient, fetchPrograms, fetchUser, fetchSportProfile])

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

  // Sort and filter tests
  const sortedAndFilteredTests = useMemo(() => {
    if (!client?.tests) return []

    let filtered = [...client.tests]

    // Apply test type filter
    if (filterTestType !== 'ALL') {
      filtered = filtered.filter((test) => test.testType === filterTestType)
    }

    // Apply search filter
    if (searchTerm) {
      const search = searchTerm.toLowerCase()
      filtered = filtered.filter((test) => {
        const dateString = format(new Date(test.testDate), 'PPP', { locale: sv }).toLowerCase()
        const notes = test.notes?.toLowerCase() || ''
        return dateString.includes(search) || notes.includes(search)
      })
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let comparison = 0

      switch (sortField) {
        case 'date':
          comparison = new Date(a.testDate).getTime() - new Date(b.testDate).getTime()
          break
        case 'type':
          comparison = a.testType.localeCompare(b.testType)
          break
        case 'vo2max':
          comparison = (a.vo2max || 0) - (b.vo2max || 0)
          break
        case 'status':
          comparison = a.status.localeCompare(b.status)
          break
      }

      return sortDirection === 'asc' ? comparison : -comparison
    })

    return filtered
  }, [client?.tests, filterTestType, searchTerm, sortField, sortDirection])

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('desc')
    }
  }

  const toggleExpandTest = (testId: string) => {
    setExpandedTestId(expandedTestId === testId ? null : testId)
  }

  const handleDeleteClick = (test: Test, e: React.MouseEvent) => {
    e.stopPropagation()
    setTestToDelete(test)
    setDeleteDialogOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (!testToDelete) return

    setDeleting(true)
    try {
      const response = await fetch(`/api/tests/${testToDelete.id}`, {
        method: 'DELETE',
      })

      const result = await response.json()

      if (result.success) {
        toast({
          title: 'Test borttaget',
          description: 'Testet har tagits bort',
        })

        // Refresh client data
        await fetchClient()

        // Close expanded row if it was the deleted test
        if (expandedTestId === testToDelete.id) {
          setExpandedTestId(null)
        }
      } else {
        throw new Error(result.error || 'Failed to delete test')
      }
    } catch (error) {
      console.error('Error deleting test:', error)
      toast({
        title: 'Fel',
        description: 'Kunde inte ta bort testet',
        variant: 'destructive',
      })
    } finally {
      setDeleting(false)
      setDeleteDialogOpen(false)
      setTestToDelete(null)
    }
  }

  const handleExportTests = () => {
    if (!client || !client.tests || client.tests.length === 0) {
      toast({
        title: 'Ingen data att exportera',
        description: 'Det finns inga tester att exportera.',
        variant: 'destructive',
      })
      return
    }

    try {
      const testsToExport = sortedAndFilteredTests.length > 0
        ? sortedAndFilteredTests
        : client.tests

      exportClientTestsToCSV(testsToExport, client.name)

      toast({
        title: 'Export lyckades!',
        description: `${testsToExport.length} tester exporterades till CSV.`,
      })
    } catch (error) {
      console.error('Export error:', error)
      toast({
        title: 'Exportfel',
        description: 'Kunde inte exportera tester.',
        variant: 'destructive',
      })
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <MobileNav user={user} />
        <main className="max-w-7xl mx-auto px-4 py-6 lg:py-12">
          <div className="text-center">Laddar klientinformation...</div>
        </main>
      </div>
    )
  }

  if (error || !client) {
    return (
      <div className="min-h-screen bg-gray-50">
        <MobileNav user={user} />
        <main className="max-w-7xl mx-auto px-4 py-6 lg:py-12">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800">Fel: {error || 'Client not found'}</p>
          </div>
          <Link
            href="/clients"
            className="mt-4 inline-block text-blue-600 hover:text-blue-800"
          >
            Tillbaka till klientlista
          </Link>
        </main>
      </div>
    )
  }

  // Overview Tab Content
  const overviewContent = (
    <>
      {/* Klientinformation */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Personuppgifter</h2>
          <div className="flex items-center gap-2">
            <CreateAthleteAccountDialog
              clientId={id}
              clientName={client.name}
              clientEmail={client.email}
              hasExistingAccount={!!(client as any).athleteAccount}
              onAccountCreated={fetchClient}
            />
            <Link href={`/clients/${id}/profile`}>
              <Button variant="default" size="sm">
                <UserCircle className="w-4 h-4 mr-2" />
                Fullständig profil
              </Button>
            </Link>
            <AIContextButton
              athleteId={id}
              athleteName={client.name}
            />
            <Link href={`/clients/${id}/edit`}>
              <Button variant="outline" size="sm">
                <Edit2 className="w-4 h-4 mr-2" />
                Redigera
              </Button>
            </Link>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div>
            <p className="text-sm text-gray-500">Ålder</p>
            <p className="text-lg font-medium">{calculateAge(client.birthDate)} år</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Kön</p>
            <p className="text-lg font-medium">
              {client.gender === 'MALE' ? 'Man' : 'Kvinna'}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Födelsedatum</p>
            <p className="text-lg font-medium">
              {format(new Date(client.birthDate), 'PPP', { locale: sv })}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Längd</p>
            <p className="text-lg font-medium">{client.height} cm</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Vikt</p>
            <p className="text-lg font-medium">{client.weight} kg</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">BMI</p>
            <p className="text-lg font-medium">
              {calculateBMI(client.weight, client.height)}
            </p>
          </div>
          {client.email && (
            <div>
              <p className="text-sm text-gray-500">E-post</p>
              <p className="text-lg font-medium">{client.email}</p>
            </div>
          )}
          {client.phone && (
            <div>
              <p className="text-sm text-gray-500">Telefon</p>
              <p className="text-lg font-medium">{client.phone}</p>
            </div>
          )}
          {(client as any).team && (
            <div>
              <p className="text-sm text-gray-500">Lag/Klubb</p>
              <p className="text-lg font-medium">{(client as any).team.name}</p>
            </div>
          )}
        </div>
        {client.notes && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <p className="text-sm text-gray-500">Anteckningar</p>
            <p className="mt-1 text-gray-700">{client.notes}</p>
          </div>
        )}
      </div>

      {/* Sport-Specific Dashboard */}
      {!sportProfileLoading && sportProfile && (
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Sportspecifik Data</h2>
          <SportSpecificAthleteView
            clientId={id}
            clientName={client.name}
            sportProfile={sportProfile}
          />
        </div>
      )}

      {/* Training Summary Visual Report */}
      <div className="mb-6">
        <VisualReportCard
          clientId={id}
          reportType="training-summary"
        />
      </div>

      {/* Elite Pace Zones Dashboard */}
      {!sportProfileLoading && sportProfile?.primarySport === 'RUNNING' && (
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <PaceValidationDashboard
            clientId={id}
            clientName={client.name}
          />
        </div>
      )}

      {/* Video Analysis Section */}
      <ClientVideoAnalyses
        clientId={id}
        clientName={client.name}
        onLoadToAI={handleLoadVideoAnalysisToAI}
      />

      {/* VBT & Concept2 Integration Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <VBTProgressionWidget clientId={id} />
        <Concept2SummaryWidget clientId={id} />
      </div>

      {/* Training Zone Analysis Section */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Pulszonanalys</h2>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Weekly Zone Summary */}
          <div className="lg:col-span-1">
            <WeeklyZoneSummary clientId={id} />
          </div>
          {/* Zone Distribution Chart */}
          <div className="lg:col-span-2">
            <ZoneDistributionChart clientId={id} />
          </div>
        </div>
      </div>

      {/* Yearly Training Overview */}
      <div className="mb-6">
        <YearlyTrainingOverview clientId={id} />
      </div>

      {/* Progression Chart */}
      {client.tests && client.tests.length >= 2 && (
        <ProgressionChart tests={client.tests} />
      )}
    </>
  )

  // Calendar Tab Content
  const calendarContent = (
    <div className="bg-white rounded-lg shadow-md p-4 lg:p-6">
      <UnifiedCalendar
        clientId={id}
        clientName={client.name}
        isCoachView={true}
      />
    </div>
  )

  // Logs Tab Content
  const logsContent = (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h2 className="text-xl font-semibold">Träningsloggar</h2>
          <p className="text-sm text-gray-600 mt-1">
            Följ upp atletens träning och ge feedback
          </p>
        </div>
        <Link href={`/coach/athletes/${id}/logs`}>
          <Button size="sm">
            <ExternalLink className="w-4 h-4 mr-2" />
            Öppna fullständig vy
          </Button>
        </Link>
      </div>
      {(client as any).athleteAccount ? (
        <div className="text-center py-12 text-gray-500">
          <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p className="mb-4">Visa alla träningsloggar och ge feedback till atleten</p>
          <Link href={`/coach/athletes/${id}/logs`}>
            <Button variant="outline">
              Öppna loggöversikt
            </Button>
          </Link>
        </div>
      ) : (
        <div className="text-center py-12 text-gray-500">
          <UserPlus className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p className="mb-2">Denna klient har inget atletkonto</p>
          <p className="text-sm mb-4">Skapa ett atletkonto så att klienten kan logga in och logga träningspass</p>
          <CreateAthleteAccountDialog
            clientId={id}
            clientName={client.name}
            clientEmail={client.email}
            hasExistingAccount={false}
            onAccountCreated={fetchClient}
            trigger={
              <Button>
                <UserPlus className="w-4 h-4 mr-2" />
                Skapa atletkonto
              </Button>
            }
          />
        </div>
      )}
    </div>
  )

  // Programs Tab Content
  const programsContent = (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">Träningsprogram</h2>
        <Link href="/programs/new">
          <Button size="sm">+ Nytt program</Button>
        </Link>
      </div>

      {programsLoading ? (
        <div className="flex items-center justify-center py-8 text-gray-500">
          <Loader2 className="w-5 h-5 mr-2 animate-spin" />
          Laddar program...
        </div>
      ) : programs.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <p className="mb-2">Inga träningsprogram skapade ännu</p>
          <Link
            href="/programs/new"
            className="text-blue-600 hover:text-blue-800 font-medium"
          >
            Skapa första programmet
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {programs.map((program: any) => (
            <Link key={program.id} href={`/coach/programs/${program.id}`}>
              <div className="border rounded-lg p-4 hover:bg-gray-50 transition cursor-pointer">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-semibold text-lg mb-1">{program.name}</h3>
                    <p className="text-sm text-gray-600 mb-2">
                      {program.goalType === 'marathon' && 'Marathon'}
                      {program.goalType === 'half_marathon' && 'Halvmarathon'}
                      {program.goalType === '10k' && '10K'}
                      {program.goalType === '5k' && '5K'}
                      {program.goalType === 'fitness' && 'Fitness/Kondition'}
                      {program.goalType === 'cycling' && 'Cykling'}
                      {program.goalType === 'skiing' && 'Skidåkning'}
                      {program.goalType === 'triathlon' && 'Triathlon'}
                      {program.goalType === 'custom' && 'Anpassad'}
                    </p>
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <span>
                        {format(new Date(program.startDate), 'PPP', { locale: sv })} -{' '}
                        {format(new Date(program.endDate), 'PPP', { locale: sv })}
                      </span>
                      {program._count?.weeks && (
                        <span className="text-gray-400">
                          {program._count.weeks} veckor
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-blue-600 hover:text-blue-800 text-sm font-medium">
                      Visa →
                    </span>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )

  // Tests Tab Content (the large test history section)
  const testsContent = (
    <>
      {/* Testhistorik */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex flex-col gap-4 mb-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h2 className="text-xl font-semibold">Testhistorik</h2>
                {(searchTerm || filterTestType !== 'ALL') && client.tests && (
                  <p className="text-sm text-muted-foreground mt-1">
                    Visar {sortedAndFilteredTests.length} av {client.tests.length} tester
                  </p>
                )}
              </div>

              <Link
                href={`/test`}
                className="px-4 py-2 gradient-primary text-white rounded-lg hover:opacity-90 transition self-end sm:self-auto"
              >
                + Nytt Test
              </Link>
            </div>

            {/* Search and Filter Controls */}
            {client.tests && client.tests.length > 0 && (
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="flex-1 sm:max-w-sm">
                  <SearchInput
                    placeholder="Sök datum eller anteckningar..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onClear={() => setSearchTerm('')}
                  />
                </div>
                <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                  <div className="w-full sm:w-auto">
                    <Select
                      value={filterTestType}
                      onValueChange={(value) => setFilterTestType(value as TestType | 'ALL')}
                    >
                      <SelectTrigger id="test-type-filter" className="w-full sm:w-[180px]">
                        <SelectValue placeholder="Filtrera testtyp" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ALL">Alla testtyper</SelectItem>
                        <SelectItem value="RUNNING">Löpning</SelectItem>
                        <SelectItem value="CYCLING">Cykling</SelectItem>
                        <SelectItem value="SKIING">Skidåkning</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button
                    variant="outline"
                    onClick={handleExportTests}
                    className="w-full sm:w-auto"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Exportera CSV
                  </Button>
                </div>
              </div>
            )}
          </div>

          {!client.tests || client.tests.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <p className="mb-4">Inga tester registrerade ännu</p>
              <Link
                href={`/test`}
                className="text-blue-600 hover:text-blue-800 font-medium"
              >
                Skapa första testet
              </Link>
            </div>
          ) : sortedAndFilteredTests.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <p className="mb-4">Inga tester matchar sökningen eller filtren</p>
              <button
                onClick={() => {
                  setFilterTestType('ALL')
                  setSearchTerm('')
                }}
                className="text-blue-600 hover:text-blue-800 font-medium"
              >
                Återställ alla filter
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto -mx-4 sm:mx-0">
              <div className="inline-block min-w-full align-middle">
                <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 sm:rounded-lg">
                  <table className="min-w-full divide-y divide-gray-300">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left">
                      <button
                        onClick={() => handleSort('date')}
                        className="flex items-center gap-1 text-sm font-semibold text-gray-700 hover:text-gray-900"
                      >
                        Datum
                        {sortField === 'date' ? (
                          sortDirection === 'asc' ? (
                            <ChevronUp className="w-4 h-4" />
                          ) : (
                            <ChevronDown className="w-4 h-4" />
                          )
                        ) : (
                          <ArrowUpDown className="w-4 h-4 opacity-30" />
                        )}
                      </button>
                    </th>
                    <th className="px-4 py-3 text-left">
                      <button
                        onClick={() => handleSort('type')}
                        className="flex items-center gap-1 text-sm font-semibold text-gray-700 hover:text-gray-900"
                      >
                        Typ
                        {sortField === 'type' ? (
                          sortDirection === 'asc' ? (
                            <ChevronUp className="w-4 h-4" />
                          ) : (
                            <ChevronDown className="w-4 h-4" />
                          )
                        ) : (
                          <ArrowUpDown className="w-4 h-4 opacity-30" />
                        )}
                      </button>
                    </th>
                    <th className="px-4 py-3 text-left">
                      <button
                        onClick={() => handleSort('status')}
                        className="flex items-center gap-1 text-sm font-semibold text-gray-700 hover:text-gray-900"
                      >
                        Status
                        {sortField === 'status' ? (
                          sortDirection === 'asc' ? (
                            <ChevronUp className="w-4 h-4" />
                          ) : (
                            <ChevronDown className="w-4 h-4" />
                          )
                        ) : (
                          <ArrowUpDown className="w-4 h-4 opacity-30" />
                        )}
                      </button>
                    </th>
                    <th className="px-4 py-3 text-left">
                      <button
                        onClick={() => handleSort('vo2max')}
                        className="flex items-center gap-1 text-sm font-semibold text-gray-700 hover:text-gray-900"
                      >
                        VO2max
                        {sortField === 'vo2max' ? (
                          sortDirection === 'asc' ? (
                            <ChevronUp className="w-4 h-4" />
                          ) : (
                            <ChevronDown className="w-4 h-4" />
                          )
                        ) : (
                          <ArrowUpDown className="w-4 h-4 opacity-30" />
                        )}
                      </button>
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                      Aerob tröskel
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                      Anaerob tröskel
                    </th>
                    <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">
                      Åtgärder
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {sortedAndFilteredTests.map((test, index) => {
                    const aerobicThreshold = test.aerobicThreshold as any
                    const anaerobicThreshold = test.anaerobicThreshold as any

                    const isExpanded = expandedTestId === test.id
                    const trainingZones = test.trainingZones as TrainingZone[] | null
                    // Get previous test for comparison (tests sorted desc by date, so index+1 is earlier)
                    const previousTest = sortedAndFilteredTests[index + 1]

                    return (
                      <Fragment key={test.id}>
                        <tr
                          className="hover:bg-gray-50 cursor-pointer"
                          onClick={() => toggleExpandTest(test.id)}
                        >
                          <td className="px-4 py-3 text-sm text-gray-900">
                            <div className="flex items-center gap-2">
                              {isExpanded ? (
                                <ChevronUp className="w-4 h-4 text-gray-400" />
                              ) : (
                                <ChevronDown className="w-4 h-4 text-gray-400" />
                              )}
                              {format(new Date(test.testDate), 'PPP', { locale: sv })}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-700">
                            {test.testType === 'RUNNING' ? 'Löpning' : test.testType === 'CYCLING' ? 'Cykling' : 'Skidåkning'}
                          </td>
                          <td className="px-4 py-3 text-sm">
                            <span
                              className={`px-2 py-1 rounded-full text-xs font-medium ${
                                test.status === 'COMPLETED'
                                  ? 'bg-green-100 text-green-800'
                                  : test.status === 'DRAFT'
                                  ? 'bg-yellow-100 text-yellow-800'
                                  : 'bg-gray-100 text-gray-800'
                              }`}
                            >
                              {test.status === 'COMPLETED'
                                ? 'Genomfört'
                                : test.status === 'DRAFT'
                                ? 'Utkast'
                                : 'Arkiverad'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-700">
                            {test.vo2max ? `${test.vo2max.toFixed(1)}` : '-'}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-700">
                            {aerobicThreshold?.heartRate ? `${aerobicThreshold.heartRate} bpm` : '-'}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-700">
                            {anaerobicThreshold?.heartRate ? `${anaerobicThreshold.heartRate} bpm` : '-'}
                          </td>
                          <td className="px-4 py-3 text-sm text-right" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-end gap-2">
                              <Link
                                href={`/tests/${test.id}`}
                                className="text-blue-600 hover:text-blue-800 font-medium"
                              >
                                Visa
                              </Link>
                              <AnalyzeTestButton
                                testId={test.id}
                                clientId={id}
                                previousTestId={previousTest?.id}
                                className="h-8 text-xs"
                              />
                              <Link
                                href={`/tests/${test.id}/edit`}
                                className="text-blue-600 hover:text-blue-800"
                                title="Redigera test"
                              >
                                <Edit2 className="w-4 h-4" />
                              </Link>
                              <button
                                onClick={(e) => handleDeleteClick(test, e)}
                                className="text-red-600 hover:text-red-800 transition"
                                title="Ta bort test"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                        {isExpanded && (
                          <tr key={`${test.id}-expanded`} className="bg-gray-50">
                            <td colSpan={7} className="px-4 py-4">
                              <div className="space-y-4">
                                <h4 className="font-semibold text-sm text-gray-700">
                                  Detaljerad information
                                </h4>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                  <div>
                                    <p className="text-xs text-gray-500">Max puls</p>
                                    <p className="text-sm font-medium">
                                      {test.maxHR ? `${test.maxHR} bpm` : '-'}
                                    </p>
                                  </div>
                                  <div>
                                    <p className="text-xs text-gray-500">Max laktat</p>
                                    <p className="text-sm font-medium">
                                      {test.maxLactate ? `${test.maxLactate.toFixed(1)} mmol/L` : '-'}
                                    </p>
                                  </div>
                                  <div>
                                    <p className="text-xs text-gray-500">VO2max</p>
                                    <p className="text-sm font-medium">
                                      {test.vo2max ? `${test.vo2max.toFixed(1)} ml/kg/min` : '-'}
                                    </p>
                                  </div>
                                </div>

                                {trainingZones && trainingZones.length > 0 && (
                                  <div className="mt-4">
                                    <h5 className="font-semibold text-sm text-gray-700 mb-2">
                                      Träningszoner
                                    </h5>
                                    <div className="overflow-x-auto">
                                      <table className="min-w-full text-sm">
                                        <thead className="bg-gray-100">
                                          <tr>
                                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-600">
                                              Zon
                                            </th>
                                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-600">
                                              Puls (bpm)
                                            </th>
                                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-600">
                                              % av max
                                            </th>
                                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-600">
                                              Beskrivning
                                            </th>
                                          </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-200">
                                          {trainingZones.map((zone, idx) => (
                                            <tr key={idx}>
                                              <td className="px-3 py-2 font-medium">{zone.zone}</td>
                                              <td className="px-3 py-2">
                                                {zone.hrMin} - {zone.hrMax}
                                              </td>
                                              <td className="px-3 py-2">
                                                {zone.percentMin}% - {zone.percentMax}%
                                              </td>
                                              <td className="px-3 py-2 text-gray-600">
                                                {zone.effect}
                                              </td>
                                            </tr>
                                          ))}
                                        </tbody>
                                      </table>
                                    </div>
                                  </div>
                                )}

                                {test.notes && (
                                  <div className="mt-4">
                                    <h5 className="font-semibold text-sm text-gray-700 mb-1">
                                      Anteckningar
                                    </h5>
                                    <p className="text-sm text-gray-600">{test.notes}</p>
                                  </div>
                                )}
                              </div>
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    )
                  })}
                </tbody>
              </table>
                </div>
              </div>
            </div>
          )}
        </div>
    </>
  )

  return (
    <div className="min-h-screen bg-gray-50">
      <MobileNav user={user} />

      <main className="max-w-7xl mx-auto px-4 py-6 lg:py-12">
        <div className="mb-6">
          <h2 className="text-2xl lg:text-3xl font-bold text-gray-900">{client.name}</h2>
          <p className="text-gray-600 mt-1 text-sm lg:text-base">Klientdetaljer och testhistorik</p>
        </div>

        <Suspense fallback={<div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 animate-spin" /></div>}>
          <ClientDetailTabs
            clientId={id}
            content={{
              overview: overviewContent,
              calendar: calendarContent,
              logs: logsContent,
              programs: programsContent,
              tests: testsContent,
            }}
          />
        </Suspense>
      </main>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Är du säker?</AlertDialogTitle>
            <AlertDialogDescription>
              Detta kommer att permanent ta bort testet från{' '}
              {testToDelete && format(new Date(testToDelete.testDate), 'PPP', { locale: sv })}.
              <br />
              <br />
              Denna åtgärd kan inte ångras.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Avbryt</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={deleting}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
            >
              {deleting ? 'Tar bort...' : 'Ta bort'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
