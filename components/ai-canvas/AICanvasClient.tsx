'use client'

import { useMemo, useState } from 'react'
import {
  AlertCircle,
  BarChart3,
  CheckCircle2,
  ClipboardList,
  FileText,
  Lightbulb,
  ListChecks,
  Plus,
  RotateCcw,
  Send,
  Sparkles,
  Table2,
  Wand2,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'

type CanvasBlockType = 'heading' | 'text' | 'checklist' | 'table' | 'insight' | 'actions'

type CanvasTemplateId = 'blank' | 'athlete-review' | 'weekly-briefing' | 'team-risk' | 'program-notes'

interface CanvasBlock {
  id: string
  type: CanvasBlockType
  title?: string
  content?: string
  items?: string[]
  columns?: string[]
  rows?: string[][]
  tone?: 'neutral' | 'positive' | 'warning'
}

interface CanvasTemplate {
  id: CanvasTemplateId
  name: string
  description: string
  prompt: string
  icon: typeof FileText
}

const starterTemplates: CanvasTemplate[] = [
  {
    id: 'blank',
    name: 'Tom canvas',
    description: 'Börja fritt med en egen fråga eller idé.',
    prompt: '',
    icon: Plus,
  },
  {
    id: 'athlete-review',
    name: 'Athlete review',
    description: 'Skapa en tydlig statusrapport för en atlet.',
    prompt: 'Skapa en athlete review med nuläge, viktigaste observationer, risker och nästa steg.',
    icon: FileText,
  },
  {
    id: 'weekly-briefing',
    name: 'Coach briefing',
    description: 'Sammanfatta veckan och vad coachen bör prioritera.',
    prompt: 'Skapa en weekly coach briefing med prioriteringar, uppföljningar och beslut.',
    icon: ClipboardList,
  },
  {
    id: 'team-risk',
    name: 'Team risk scan',
    description: 'Identifiera uppföljningar, testbehov och risker.',
    prompt: 'Skapa en team risk scan med atleter att följa upp, dataluckor och rekommenderade åtgärder.',
    icon: BarChart3,
  },
  {
    id: 'program-notes',
    name: 'Programplan',
    description: 'Bygg en arbetsyta för programidéer och träningsblock.',
    prompt: 'Skapa program planning notes för ett fyra veckors block med mål, nyckelpass och kontrollpunkter.',
    icon: ListChecks,
  },
]

const initialBlocks: CanvasBlock[] = [
  {
    id: 'welcome-heading',
    type: 'heading',
    title: 'AI Canvas',
    content: 'En arbetsyta för rapporter, analyser, planer och coachbeslut.',
  },
  {
    id: 'welcome-insight',
    type: 'insight',
    title: 'Första versionen',
    content:
      'Den här versionen fokuserar på känslan i arbetsytan: mallar, prompt, block och tydliga svar. Nästa steg blir att koppla in riktig atlet- och teamdata.',
    tone: 'positive',
  },
  {
    id: 'welcome-actions',
    type: 'actions',
    title: 'Bra första tester',
    items: [
      'Skapa en athlete review för en atlet',
      'Bygg en weekly coach briefing',
      'Sammanfatta risker inför kommande vecka',
    ],
  },
]

function createId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function buildBlocksFromPrompt(prompt: string, templateId: CanvasTemplateId): CanvasBlock[] {
  const normalizedPrompt = prompt.trim()
  const subject = normalizedPrompt || 'Ny canvas'

  if (templateId === 'team-risk' || /risk|team|lag|uppfölj/i.test(subject)) {
    return [
      {
        id: createId('heading'),
        type: 'heading',
        title: 'Team risk scan',
        content: 'Ett första arbetsutkast för att hitta uppföljningar och dataluckor.',
      },
      {
        id: createId('insight'),
        type: 'insight',
        title: 'Sammanfattning',
        content:
          'Jag har skapat en struktur för att separera akuta risker, saknad data och praktiska coachåtgärder. Koppla in teamdata i nästa fas för att fylla blocken automatiskt.',
        tone: 'warning',
      },
      {
        id: createId('table'),
        type: 'table',
        title: 'Risköversikt',
        columns: ['Område', 'Signal', 'Nästa steg'],
        rows: [
          ['Tester', 'Flera atleter kan ha gammal testdata', 'Prioritera ny testbokning'],
          ['Belastning', 'Missade pass behöver följas upp', 'Kontrollera senaste träningsvecka'],
          ['Readiness', 'Låg trend bör bekräftas', 'Skicka kort check-in'],
        ],
      },
      {
        id: createId('actions'),
        type: 'actions',
        title: 'Föreslagna åtgärder',
        items: ['Välj team och datumintervall', 'Generera med live-data i Phase 2', 'Skapa uppföljningslista'],
      },
    ]
  }

  if (templateId === 'program-notes' || /program|block|träning|plan/i.test(subject)) {
    return [
      {
        id: createId('heading'),
        type: 'heading',
        title: 'Programplan',
        content: 'Ett arbetsutkast för mål, nyckelpass och kontrollpunkter.',
      },
      {
        id: createId('text'),
        type: 'text',
        title: 'Målbild',
        content:
          'Planen bör börja med tydligt syfte, nuläge, begränsningar och hur belastningen ska följas upp vecka för vecka.',
      },
      {
        id: createId('checklist'),
        type: 'checklist',
        title: 'Blockstruktur',
        items: [
          'Definiera huvudmål för blocket',
          'Placera 1-2 nyckelpass per vecka',
          'Lägg in återhämtning och kontrollpunkter',
          'Bestäm vad som ska justeras vid låg readiness',
        ],
      },
    ]
  }

  if (templateId === 'weekly-briefing' || /brief|vecka|weekly/i.test(subject)) {
    return [
      {
        id: createId('heading'),
        type: 'heading',
        title: 'Weekly coach briefing',
        content: 'Ett kort beslutsunderlag för coachens kommande vecka.',
      },
      {
        id: createId('table'),
        type: 'table',
        title: 'Prioriteringar',
        columns: ['Prioritet', 'Varför', 'Coachbeslut'],
        rows: [
          ['Uppföljningar', 'Atleter med missade eller avvikande pass', 'Kontakta och justera vid behov'],
          ['Tester', 'Testdata kan bli gammal', 'Planera testfönster'],
          ['Program', 'Kommande belastning behöver kontrolleras', 'Granska nyckelpass'],
        ],
      },
      {
        id: createId('actions'),
        type: 'actions',
        title: 'Nästa drag',
        items: ['Välj vilka atleter som ska följas upp', 'Förbered kort meddelande', 'Markera beslut för veckan'],
      },
    ]
  }

  return [
    {
      id: createId('heading'),
      type: 'heading',
      title: 'Athlete review',
      content: normalizedPrompt || 'Ett första rapportutkast för atletens nuläge och nästa steg.',
    },
    {
      id: createId('text'),
      type: 'text',
      title: 'Nuläge',
      content:
        'Jag har skapat ett rapportformat som kan fyllas med testdata, träningshistorik, readiness och coachanteckningar när datakopplingen aktiveras.',
    },
    {
      id: createId('insight'),
      type: 'insight',
      title: 'Coachtolkning',
      content:
        'Fokusera på vad coachen behöver besluta: om atleten ska fortsätta enligt plan, justera belastning, boka test eller få en uppföljning.',
      tone: 'neutral',
    },
    {
      id: createId('checklist'),
      type: 'checklist',
      title: 'Rapportdelar',
      items: ['Sammanfattning', 'Senaste utveckling', 'Risker eller dataluckor', 'Rekommenderade nästa steg'],
    },
  ]
}

function getAssistantMessage(prompt: string, blockCount: number): string {
  if (!prompt.trim()) {
    return 'Jag behöver en fråga eller mall för att skapa nya block. Välj gärna en mall eller skriv vad du vill bygga.'
  }

  return `Jag skapade ${blockCount} canvasblock som ett första arbetsutkast. I den här versionen använder jag malllogik; live-data och riktig AI-generering kommer i nästa faser.`
}

export function AICanvasClient() {
  const [title, setTitle] = useState('Untitled coach canvas')
  const [prompt, setPrompt] = useState('')
  const [selectedTemplateId, setSelectedTemplateId] = useState<CanvasTemplateId>('blank')
  const [blocks, setBlocks] = useState<CanvasBlock[]>(initialBlocks)
  const [assistantMessage, setAssistantMessage] = useState(
    'Canvasen är redo. Välj en mall eller skriv vad du vill skapa.'
  )
  const [lastUpdated, setLastUpdated] = useState('Inte sparad än')

  const selectedTemplate = useMemo(
    () => starterTemplates.find((template) => template.id === selectedTemplateId) ?? starterTemplates[0],
    [selectedTemplateId]
  )

  const handleSelectTemplate = (template: CanvasTemplate) => {
    setSelectedTemplateId(template.id)
    setPrompt(template.prompt)
    setAssistantMessage(
      template.id === 'blank'
        ? 'Tom canvas vald. Skriv vad du vill skapa så bygger jag ett första utkast.'
        : `Mallen ${template.name} är vald. Du kan ändra prompten innan du skapar block.`
    )
  }

  const handleGenerate = () => {
    const nextBlocks = buildBlocksFromPrompt(prompt || selectedTemplate.prompt, selectedTemplate.id)
    setBlocks(nextBlocks)
    setAssistantMessage(getAssistantMessage(prompt || selectedTemplate.prompt, nextBlocks.length))
    setLastUpdated(new Date().toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' }))
  }

  const handleReset = () => {
    setBlocks(initialBlocks)
    setPrompt('')
    setSelectedTemplateId('blank')
    setAssistantMessage('Jag återställde canvasen till startläget.')
    setLastUpdated('Återställd')
  }

  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-700">
                  Phase 1A
                </Badge>
                <Badge variant="outline" className="border-cyan-200 bg-cyan-50 text-cyan-700">
                  Coach workspace
                </Badge>
              </div>
              <div>
                <input
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  className="w-full bg-transparent text-3xl font-bold text-slate-950 outline-none sm:text-4xl"
                  aria-label="Canvas title"
                />
                <p className="mt-2 max-w-2xl text-sm text-slate-600">
                  Skapa rapporter, analyser, planer och coachbriefs som strukturerade block.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-sm text-slate-500">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              <span>Senast uppdaterad: {lastUpdated}</span>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto grid w-full max-w-7xl gap-5 px-4 py-5 sm:px-6 lg:grid-cols-[280px_minmax(0,1fr)_320px] lg:px-8">
        <aside className="space-y-3">
          <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-amber-600" />
              <h2 className="text-sm font-semibold text-slate-900">Startmallar</h2>
            </div>
            <div className="space-y-2">
              {starterTemplates.map((template) => {
                const Icon = template.icon
                const isSelected = selectedTemplateId === template.id
                return (
                  <button
                    key={template.id}
                    type="button"
                    onClick={() => handleSelectTemplate(template)}
                    className={cn(
                      'w-full rounded-md border p-3 text-left transition hover:border-slate-300 hover:bg-slate-50',
                      isSelected ? 'border-slate-900 bg-slate-50' : 'border-slate-200 bg-white'
                    )}
                  >
                    <span className="flex items-center gap-2 text-sm font-medium text-slate-900">
                      <Icon className="h-4 w-4 text-slate-600" />
                      {template.name}
                    </span>
                    <span className="mt-1 block text-xs leading-5 text-slate-500">{template.description}</span>
                  </button>
                )
              })}
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-2 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-sky-600" />
              <h2 className="text-sm font-semibold text-slate-900">Kommande datakoppling</h2>
            </div>
            <p className="text-xs leading-5 text-slate-600">
              Nästa fas lägger till atlet, team, datumintervall, tester, pass, program och readiness som valbar kontext.
            </p>
          </div>
        </aside>

        <div className="space-y-4">
          <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-sm font-semibold text-slate-900">Canvas</h2>
                  <p className="text-xs text-slate-500">{blocks.length} block i arbetsytan</p>
                </div>
                <Button variant="outline" size="sm" onClick={handleReset} className="gap-2">
                  <RotateCcw className="h-4 w-4" />
                  Återställ
                </Button>
              </div>
            </div>
            <div className="space-y-3 p-4">
              {blocks.map((block) => (
                <CanvasBlockView key={block.id} block={block} />
              ))}
            </div>
          </div>
        </div>

        <aside className="space-y-3">
          <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center gap-2">
              <Wand2 className="h-4 w-4 text-violet-600" />
              <h2 className="text-sm font-semibold text-slate-900">Skapa block</h2>
            </div>
            <Textarea
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
              placeholder="Ex: Skapa en progress report för David med nuläge, risker och nästa steg..."
              className="min-h-[130px] resize-none rounded-md border-slate-200 text-sm"
            />
            <div className="mt-3 flex gap-2">
              <Button onClick={handleGenerate} className="flex-1 gap-2">
                <Send className="h-4 w-4" />
                Skapa
              </Button>
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-2 flex items-center gap-2">
              <Lightbulb className="h-4 w-4 text-amber-600" />
              <h2 className="text-sm font-semibold text-slate-900">AI svar</h2>
            </div>
            <p className="text-sm leading-6 text-slate-700">{assistantMessage}</p>
          </div>
        </aside>
      </section>
    </main>
  )
}

function CanvasBlockView({ block }: { block: CanvasBlock }) {
  if (block.type === 'heading') {
    return (
      <article className="rounded-lg border border-slate-200 bg-slate-950 p-5 text-white">
        <h3 className="text-2xl font-semibold">{block.title}</h3>
        {block.content && <p className="mt-2 text-sm leading-6 text-slate-300">{block.content}</p>}
      </article>
    )
  }

  if (block.type === 'table') {
    return (
      <article className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <BlockHeader icon={Table2} title={block.title ?? 'Tabell'} />
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                {block.columns?.map((column) => (
                  <th key={column} className="px-4 py-3 font-semibold">
                    {column}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {block.rows?.map((row) => (
                <tr key={row.join('-')} className="text-slate-700">
                  {row.map((cell) => (
                    <td key={cell} className="px-4 py-3 align-top">
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </article>
    )
  }

  if (block.type === 'checklist' || block.type === 'actions') {
    const Icon = block.type === 'actions' ? ClipboardList : ListChecks
    return (
      <article className="rounded-lg border border-slate-200 bg-white p-4">
        <BlockHeader icon={Icon} title={block.title ?? 'Lista'} compact />
        <ul className="mt-3 space-y-2">
          {block.items?.map((item) => (
            <li key={item} className="flex gap-2 text-sm leading-6 text-slate-700">
              <CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-emerald-600" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </article>
    )
  }

  if (block.type === 'insight') {
    const toneClass =
      block.tone === 'positive'
        ? 'border-emerald-200 bg-emerald-50 text-emerald-950'
        : block.tone === 'warning'
          ? 'border-amber-200 bg-amber-50 text-amber-950'
          : 'border-sky-200 bg-sky-50 text-sky-950'

    return (
      <article className={cn('rounded-lg border p-4', toneClass)}>
        <BlockHeader icon={Lightbulb} title={block.title ?? 'Insikt'} compact />
        {block.content && <p className="mt-2 text-sm leading-6">{block.content}</p>}
      </article>
    )
  }

  return (
    <article className="rounded-lg border border-slate-200 bg-white p-4">
      <BlockHeader icon={FileText} title={block.title ?? 'Text'} compact />
      {block.content && <p className="mt-2 text-sm leading-6 text-slate-700">{block.content}</p>}
    </article>
  )
}

function BlockHeader({
  icon: Icon,
  title,
  compact = false,
}: {
  icon: typeof FileText
  title: string
  compact?: boolean
}) {
  return (
    <div className={cn('flex items-center gap-2', compact ? 'text-sm' : 'px-4 py-3')}>
      <Icon className="h-4 w-4 text-slate-500" />
      <h3 className="font-semibold text-slate-900">{title}</h3>
    </div>
  )
}
