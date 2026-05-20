export interface CanvasMarkdownBlock {
  type: string
  title?: string
  content?: string
  items?: string[]
  columns?: string[]
  rows?: string[][]
  metrics?: Array<{
    label: string
    value: string
    detail?: string
  }>
  risks?: Array<{
    title: string
    description: string
    priority: string
    meta?: string
  }>
  trends?: Array<{
    label: string
    value: string
    direction: string
    detail?: string
  }>
  chartType?: 'bar' | 'line'
  unit?: string
  points?: Array<{
    label: string
    value: number
    detail?: string
  }>
}

export function slugifyCanvasFilename(value: string): string {
  return (
    value
      .toLowerCase()
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 80) || 'ai-canvas'
  )
}

function escapeMarkdownTableCell(value: string | undefined): string {
  return (value || '').replace(/\|/g, '\\|').replace(/\n/g, '<br>')
}

export function canvasToMarkdown(
  title: string,
  blocks: CanvasMarkdownBlock[],
  includeExportDate = true,
  locale: 'en' | 'sv' = 'en'
): string {
  const dateLocale = locale === 'sv' ? 'sv-SE' : 'en-US'
  const copy = locale === 'sv'
    ? { exported: 'Exporterad', section: 'Sektion', metric: 'Mätvärde', value: 'Värde', detail: 'Detalj', point: 'Punkt' }
    : { exported: 'Exported', section: 'Section', metric: 'Metric', value: 'Value', detail: 'Detail', point: 'Point' }
  const lines = [
    `# ${title.trim() || 'AI Canvas'}`,
    '',
    ...(includeExportDate ? [`_${copy.exported} ${new Date().toLocaleString(dateLocale)}_`, ''] : []),
  ]

  for (const block of blocks) {
    const blockTitle = block.title?.trim()

    if (blockTitle && block.type !== 'heading') {
      lines.push(`## ${blockTitle}`, '')
    }

    if (block.type === 'heading') {
      lines.push(`## ${blockTitle || copy.section}`)
      if (block.content) lines.push('', block.content)
    }

    if (block.type === 'text' || block.type === 'insight') {
      if (block.content) lines.push(block.content)
    }

    if (block.type === 'checklist' || block.type === 'actions') {
      for (const item of block.items || []) {
        lines.push(block.type === 'checklist' ? `- [ ] ${item}` : `- ${item}`)
      }
    }

    if (block.type === 'table' && block.columns?.length) {
      lines.push(
        `| ${block.columns.map(escapeMarkdownTableCell).join(' | ')} |`,
        `| ${block.columns.map(() => '---').join(' | ')} |`
      )
      for (const row of block.rows || []) {
        lines.push(`| ${block.columns.map((_, index) => escapeMarkdownTableCell(row[index])).join(' | ')} |`)
      }
    }

    if (block.type === 'metric-row') {
      lines.push(`| ${copy.metric} | ${copy.value} | ${copy.detail} |`, '| --- | --- | --- |')
      for (const metric of block.metrics || []) {
        lines.push(
          `| ${escapeMarkdownTableCell(metric.label)} | ${escapeMarkdownTableCell(metric.value)} | ${escapeMarkdownTableCell(metric.detail)} |`
        )
      }
    }

    if (block.type === 'risk-list') {
      for (const risk of block.risks || []) {
        const meta = risk.meta ? ` - ${risk.meta}` : ''
        lines.push(`- **${risk.title}** (${risk.priority}): ${risk.description}${meta}`)
      }
    }

    if (block.type === 'trend-summary') {
      for (const trend of block.trends || []) {
        const detail = trend.detail ? ` - ${trend.detail}` : ''
        lines.push(`- **${trend.label}**: ${trend.value} (${trend.direction})${detail}`)
      }
    }

    if (block.type === 'chart') {
      if (block.content) lines.push(block.content, '')
      lines.push(`| ${copy.point} | ${copy.value} | ${copy.detail} |`, '| --- | --- | --- |')
      for (const point of block.points || []) {
        lines.push(
          `| ${escapeMarkdownTableCell(point.label)} | ${point.value}${block.unit ? ` ${escapeMarkdownTableCell(block.unit)}` : ''} | ${escapeMarkdownTableCell(point.detail)} |`
        )
      }
    }

    lines.push('')
  }

  return `${lines.join('\n').replace(/\n{3,}/g, '\n\n').trim()}\n`
}
