# UI/UX Specifikation

## Design System

### Färgpalett
```css
/* globals.css */
:root {
  /* Primära färger - från rapporterna */
  --primary-gradient-start: #667eea;
  --primary-gradient-end: #764ba2;
  
  /* Sekundära färger */
  --success: #4caf50;
  --warning: #ff9800;
  --error: #ff6b6b;
  --info: #2196f3;
  
  /* Neutrala färger */
  --gray-50: #f8f9fa;
  --gray-100: #f5f5f5;
  --gray-200: #eee;
  --gray-300: #ddd;
  --gray-500: #555;
  --gray-700: #333;
  
  /* Tröskelfärger */
  --aerobic: #e8f5e9;
  --aerobic-border: #4caf50;
  --anaerobic: #fff3e0;
  --anaerobic-border: #ff9800;
  --economy: #e3f2fd;
  --economy-border: #2196f3;
}
```

### Typography
```css
/* Font stack */
body {
  font-family: 'Inter', 'Arial', sans-serif;
  font-size: 16px;
  line-height: 1.6;
  color: var(--gray-700);
}

h1 { font-size: 2.5rem; font-weight: 700; }
h2 { font-size: 1.875rem; font-weight: 600; }
h3 { font-size: 1.5rem; font-weight: 600; }
```

## Layout Komponenter

### Navigation
```tsx
// components/ui/Navigation.tsx
export function Navigation() {
  return (
    <nav className="bg-gradient-to-r from-[#667eea] to-[#764ba2] text-white">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <h1 className="text-xl font-bold">Star by Thomson</h1>
          </div>
          <div className="flex space-x-8">
            <Link href="/dashboard">Dashboard</Link>
            <Link href="/clients">Klienter</Link>
            <Link href="/tests">Tester</Link>
            <Link href="/reports">Rapporter</Link>
          </div>
          <div className="flex items-center space-x-4">
            <UserMenu />
          </div>
        </div>
      </div>
    </nav>
  )
}
```

### Dashboard Layout
```tsx
// app/(dashboard)/layout.tsx
export default function DashboardLayout({ children }) {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      <main className="max-w-7xl mx-auto px-4 py-8">
        {children}
      </main>
    </div>
  )
}
```

## Sidor och Flöden

### 1. Dashboard (Startsida)
```tsx
// app/(dashboard)/page.tsx
export default function Dashboard() {
  return (
    <div>
      {/* Snabbåtgärder */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <QuickActionCard
          title="Nytt Test"
          icon={<Plus />}
          href="/tests/new"
          color="primary"
        />
        <QuickActionCard
          title="Ny Klient"
          icon={<UserPlus />}
          href="/clients/new"
          color="success"
        />
        <QuickActionCard
          title="Visa Rapporter"
          icon={<FileText />}
          href="/reports"
          color="info"
        />
      </div>
      
      {/* Senaste tester */}
      <Card>
        <CardHeader>
          <h2>Senaste Tester</h2>
        </CardHeader>
        <CardContent>
          <RecentTestsList />
        </CardContent>
      </Card>
      
      {/* Statistik */}
      <div className="grid grid-cols-4 gap-4 mt-8">
        <StatCard title="Totalt antal klienter" value={clientCount} />
        <StatCard title="Tester denna månad" value={monthlyTests} />
        <StatCard title="Genomsnittligt VO2max" value={avgVO2} />
        <StatCard title="Rapporter genererade" value={reportCount} />
      </div>
    </div>
  )
}
```

### 2. Klientlista
```tsx
// app/(dashboard)/clients/page.tsx
export default function ClientsPage() {
  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1>Klienter</h1>
        <Button href="/clients/new">
          <Plus className="mr-2" />
          Ny Klient
        </Button>
      </div>
      
      {/* Sökfält */}
      <SearchBar placeholder="Sök klient..." />
      
      {/* Klienttabell */}
      <DataTable
        columns={[
          { key: 'name', label: 'Namn' },
          { key: 'age', label: 'Ålder' },
          { key: 'gender', label: 'Kön' },
          { key: 'lastTest', label: 'Senaste test' },
          { key: 'actions', label: 'Åtgärder' }
        ]}
        data={clients}
      />
    </div>
  )
}
```

### 3. Nytt Test - Steg för steg wizard
```tsx
// app/(dashboard)/tests/new/page.tsx
export default function NewTestPage() {
  const [step, setStep] = useState(1)
  
  return (
    <div className="max-w-3xl mx-auto">
      {/* Progress indicator */}
      <ProgressBar current={step} total={4} />
      
      {/* Steg 1: Välj klient */}
      {step === 1 && (
        <Card>
          <CardHeader>
            <h2>Steg 1: Välj Klient</h2>
          </CardHeader>
          <CardContent>
            <ClientSelector onSelect={(client) => {
              setSelectedClient(client)
              setStep(2)
            }} />
          </CardContent>
        </Card>
      )}
      
      {/* Steg 2: Testinformation */}
      {step === 2 && (
        <Card>
          <CardHeader>
            <h2>Steg 2: Testinformation</h2>
          </CardHeader>
          <CardContent>
            <TestInfoForm onSubmit={(data) => {
              setTestInfo(data)
              setStep(3)
            }} />
          </CardContent>
        </Card>
      )}
      
      {/* Steg 3: Testdata */}
      {step === 3 && (
        <Card>
          <CardHeader>
            <h2>Steg 3: Mata in testdata</h2>
          </CardHeader>
          <CardContent>
            <TestDataInput
              testType={testInfo.type}
              onSubmit={(stages) => {
                setTestStages(stages)
                setStep(4)
              }}
            />
          </CardContent>
        </Card>
      )}
      
      {/* Steg 4: Granska och generera */}
      {step === 4 && (
        <Card>
          <CardHeader>
            <h2>Steg 4: Granska och generera rapport</h2>
          </CardHeader>
          <CardContent>
            <TestSummary
              client={selectedClient}
              testInfo={testInfo}
              stages={testStages}
            />
            <Button onClick={generateReport} className="mt-4">
              Generera Rapport
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
```

### 4. Testdata Input Component
```tsx
// components/forms/TestDataInput.tsx
export function TestDataInput({ testType, onSubmit }) {
  const [stages, setStages] = useState([createEmptyStage()])
  
  return (
    <div>
      <div className="space-y-4">
        {stages.map((stage, index) => (
          <div key={index} className="border rounded-lg p-4">
            <div className="flex justify-between mb-2">
              <h3>Steg {index + 1}</h3>
              {stages.length > 1 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeStage(index)}
                >
                  <Trash className="h-4 w-4" />
                </Button>
              )}
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              {testType === 'RUNNING' ? (
                <>
                  <Input
                    label="Hastighet (km/h)"
                    type="number"
                    step="0.1"
                    value={stage.speed}
                    onChange={(e) => updateStage(index, 'speed', e.target.value)}
                    required
                  />
                  <Input
                    label="Lutning (%)"
                    type="number"
                    step="0.5"
                    value={stage.incline}
                    onChange={(e) => updateStage(index, 'incline', e.target.value)}
                  />
                </>
              ) : (
                <>
                  <Input
                    label="Effekt (watt)"
                    type="number"
                    value={stage.power}
                    onChange={(e) => updateStage(index, 'power', e.target.value)}
                    required
                  />
                  <Input
                    label="Kadens (rpm)"
                    type="number"
                    value={stage.cadence}
                    onChange={(e) => updateStage(index, 'cadence', e.target.value)}
                  />
                </>
              )}
              
              <Input
                label="Puls (slag/min)"
                type="number"
                value={stage.heartRate}
                onChange={(e) => updateStage(index, 'heartRate', e.target.value)}
                required
              />
              
              <Input
                label="Laktat (mmol/L)"
                type="number"
                step="0.1"
                value={stage.lactate}
                onChange={(e) => updateStage(index, 'lactate', e.target.value)}
                required
              />
              
              <Input
                label="VO₂ (ml/kg/min)"
                type="number"
                step="0.1"
                value={stage.vo2}
                onChange={(e) => updateStage(index, 'vo2', e.target.value)}
              />
              
              <Input
                label="Duration (min)"
                type="number"
                step="0.5"
                value={stage.duration}
                onChange={(e) => updateStage(index, 'duration', e.target.value)}
                required
              />
            </div>
          </div>
        ))}
      </div>
      
      <Button
        variant="outline"
        onClick={addStage}
        className="mt-4"
      >
        <Plus className="mr-2" />
        Lägg till steg
      </Button>
      
      {/* Live preview av diagram */}
      <div className="mt-8">
        <h3>Förhandsgranskning</h3>
        <TestChart data={stages} testType={testType} />
      </div>
    </div>
  )
}
```

### 5. Rapportvisning
```tsx
// app/(dashboard)/reports/[id]/page.tsx
export default function ReportPage({ params }) {
  return (
    <div>
      {/* Åtgärdsknappar */}
      <div className="flex justify-between mb-6">
        <Button variant="outline" onClick={goBack}>
          <ArrowLeft className="mr-2" />
          Tillbaka
        </Button>
        <div className="space-x-2">
          <Button variant="outline" onClick={editReport}>
            <Edit className="mr-2" />
            Redigera
          </Button>
          <Button onClick={exportPDF}>
            <Download className="mr-2" />
            Exportera PDF
          </Button>
          <Button variant="outline" onClick={print}>
            <Printer className="mr-2" />
            Skriv ut
          </Button>
        </div>
      </div>
      
      {/* Rapport */}
      <div className="bg-white rounded-lg shadow-lg">
        <ReportTemplate
          client={report.client}
          test={report.test}
          calculations={report.calculations}
          testLeader={report.testLeader}
          organization={report.organization}
        />
      </div>
    </div>
  )
}
```

## Interaktiva komponenter

### Diagram med Recharts
```tsx
// components/charts/TestChart.tsx
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts'

export function TestChart({ data, testType }) {
  const chartData = data.map(stage => ({
    x: testType === 'RUNNING' ? stage.speed : stage.power,
    heartRate: stage.heartRate,
    lactate: stage.lactate
  }))
  
  return (
    <div className="w-full h-[400px]">
      <ResponsiveContainer>
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis 
            dataKey="x" 
            label={{ 
              value: testType === 'RUNNING' ? 'Hastighet (km/h)' : 'Effekt (watt)', 
              position: 'insideBottom', 
              offset: -5 
            }} 
          />
          <YAxis 
            yAxisId="left"
            label={{ 
              value: 'Puls (slag/min)', 
              angle: -90, 
              position: 'insideLeft' 
            }}
          />
          <YAxis 
            yAxisId="right" 
            orientation="right"
            label={{ 
              value: 'Laktat (mmol/L)', 
              angle: 90, 
              position: 'insideRight' 
            }}
          />
          <Tooltip />
          <Legend />
          <Line 
            yAxisId="left"
            type="monotone" 
            dataKey="heartRate" 
            stroke="#667eea" 
            name="Puls"
            strokeWidth={2}
          />
          <Line 
            yAxisId="right"
            type="monotone" 
            dataKey="lactate" 
            stroke="#ff6b6b" 
            name="Laktat"
            strokeWidth={2}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
```

### Responsiv tabell
```tsx
// components/ui/DataTable.tsx
export function DataTable({ columns, data }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead className="bg-gradient-to-r from-[#667eea] to-[#764ba2] text-white">
          <tr>
            {columns.map(column => (
              <th key={column.key} className="px-4 py-3 text-left">
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, index) => (
            <tr 
              key={row.id} 
              className={`
                hover:bg-gray-50 
                ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}
              `}
            >
              {columns.map(column => (
                <td key={column.key} className="px-4 py-3">
                  {row[column.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
```

## Mobile Responsiveness

### Breakpoints
```css
/* Tailwind config */
module.exports = {
  theme: {
    screens: {
      'sm': '640px',   // Mobile landscape
      'md': '768px',   // Tablet
      'lg': '1024px',  // Desktop
      'xl': '1280px',  // Large desktop
    }
  }
}
```

### Mobile-first design
```tsx
// Exempel på responsiv komponent
<div className="
  grid 
  grid-cols-1 
  sm:grid-cols-2 
  lg:grid-cols-3 
  xl:grid-cols-4 
  gap-4
">
  {/* Content */}
</div>
```

## Loading States

```tsx
// components/ui/LoadingStates.tsx

export function TableSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="h-10 bg-gray-200 rounded mb-4"></div>
      {[...Array(5)].map((_, i) => (
        <div key={i} className="h-8 bg-gray-100 rounded mb-2"></div>
      ))}
    </div>
  )
}

export function ChartSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="h-[400px] bg-gray-200 rounded"></div>
    </div>
  )
}

export function LoadingSpinner() {
  return (
    <div className="flex justify-center items-center p-8">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
    </div>
  )
}
```

## Toast Notifications

```tsx
// lib/toast.ts
import { toast } from 'sonner'

export const notify = {
  success: (message: string) => toast.success(message),
  error: (message: string) => toast.error(message),
  info: (message: string) => toast.info(message),
  loading: (message: string) => toast.loading(message),
}

// Användning
notify.success('Test sparat!')
notify.error('Något gick fel. Försök igen.')
```

## Keyboard Shortcuts

```tsx
// hooks/useKeyboardShortcuts.ts
export function useKeyboardShortcuts() {
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Cmd/Ctrl + N = Nytt test
      if ((e.metaKey || e.ctrlKey) && e.key === 'n') {
        e.preventDefault()
        router.push('/tests/new')
      }
      
      // Cmd/Ctrl + K = Sök
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        openSearchModal()
      }
      
      // ESC = Stäng modal
      if (e.key === 'Escape') {
        closeModal()
      }
    }
    
    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [])
}
```

## Accessibility

```tsx
// Exempel på tillgänglig komponent
<Button
  aria-label="Skapa nytt test"
  role="button"
  tabIndex={0}
  onKeyDown={(e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      handleClick()
    }
  }}
>
  <Plus className="mr-2" aria-hidden="true" />
  <span>Nytt Test</span>
</Button>
```

## Print Styles

```css
/* styles/print.css */
@media print {
  /* Dölj navigering och knappar */
  nav, .no-print {
    display: none !important;
  }
  
  /* Återställ bakgrunder för utskrift */
  body {
    background: white;
  }
  
  /* Säkerställ att diagram syns */
  .chart-container {
    page-break-inside: avoid;
  }
  
  /* Tabeller på egen sida om nödvändigt */
  table {
    page-break-inside: auto;
  }
  
  tr {
    page-break-inside: avoid;
  }
}
```