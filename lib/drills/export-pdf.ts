'use client'

/**
 * Drill PDF Export
 *
 * Renders a drill diagram as a one-page PDF with:
 * - Title and description
 * - Sport type badge
 * - SVG rink/court/pitch diagram rendered as image
 * - Movement legend
 * - Player roster
 * - Creation metadata
 */

import { jsPDF } from 'jspdf'
import type { DrillStructure } from '@/components/coach/drills/IceHockeyRink'

interface ExportDrillPDFOptions {
  title: string
  description?: string
  sportType: string
  structure: DrillStructure
  createdBy?: string
  teamName?: string
  createdAt?: string
}

const SPORT_LABELS: Record<string, string> = {
  ICE_HOCKEY: 'Ishockey',
  FOOTBALL: 'Fotboll',
  HANDBALL: 'Handboll',
  BASKETBALL: 'Basket',
  FLOORBALL: 'Innebandy',
  VOLLEYBALL: 'Volleyboll',
}

const MOVEMENT_TYPE_LABELS: Record<string, string> = {
  skate: 'Åkning/Löpning',
  pass: 'Passning',
  shot: 'Skott',
  puck: 'Puck/Boll',
}

/**
 * Convert an SVG element to a data URL image.
 */
async function svgToDataUrl(svgElement: SVGSVGElement): Promise<string> {
  return new Promise((resolve, reject) => {
    const svgData = new XMLSerializer().serializeToString(svgElement)
    const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' })
    const url = URL.createObjectURL(svgBlob)

    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      const scale = 3 // High resolution
      canvas.width = img.width * scale
      canvas.height = img.height * scale
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        reject(new Error('Canvas context failed'))
        return
      }
      ctx.scale(scale, scale)
      ctx.drawImage(img, 0, 0)
      URL.revokeObjectURL(url)
      resolve(canvas.toDataURL('image/png', 0.95))
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Image load failed'))
    }
    img.src = url
  })
}

/**
 * Generate and download a PDF for a drill.
 * Requires a rendered SVG element (the rink diagram) to capture.
 */
export async function exportDrillPDF(
  svgElement: SVGSVGElement,
  options: ExportDrillPDFOptions
): Promise<void> {
  const { title, description, sportType, structure, createdBy, teamName, createdAt } = options

  // A4 landscape for wide rink diagrams
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  })

  const pageW = 297
  const pageH = 210
  const margin = 15
  let y = margin

  // ─── Header ────────────────────────────────────────────────────

  // Title
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(18)
  doc.text(title, margin, y)
  y += 8

  // Sport type + metadata line
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(100, 100, 100)
  const metaParts: string[] = [SPORT_LABELS[sportType] || sportType]
  if (teamName) metaParts.push(teamName)
  if (createdBy) metaParts.push(`Skapad av ${createdBy}`)
  if (createdAt) {
    metaParts.push(
      new Date(createdAt).toLocaleDateString('sv-SE', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    )
  }
  doc.text(metaParts.join('  ·  '), margin, y)
  y += 6
  doc.setTextColor(0, 0, 0)

  // Description
  if (description) {
    doc.setFontSize(10)
    const descLines = doc.splitTextToSize(description, pageW - margin * 2)
    doc.text(descLines, margin, y)
    y += descLines.length * 4.5 + 2
  }

  y += 3

  // ─── Diagram ───────────────────────────────────────────────────

  try {
    const dataUrl = await svgToDataUrl(svgElement)

    // Calculate image dimensions to fill available width
    const imgMaxW = pageW - margin * 2
    const imgMaxH = pageH - y - 35 // Leave room for legend
    const svgW = svgElement.viewBox.baseVal.width || 200
    const svgH = svgElement.viewBox.baseVal.height || 85
    const aspectRatio = svgW / svgH

    let imgW = imgMaxW
    let imgH = imgW / aspectRatio
    if (imgH > imgMaxH) {
      imgH = imgMaxH
      imgW = imgH * aspectRatio
    }

    const imgX = margin + (imgMaxW - imgW) / 2
    doc.addImage(dataUrl, 'PNG', imgX, y, imgW, imgH)
    y += imgH + 6
  } catch {
    // If SVG capture fails, just skip the image
    doc.setFontSize(9)
    doc.setTextColor(150, 150, 150)
    doc.text('[Diagram kunde inte renderas]', margin, y)
    y += 8
    doc.setTextColor(0, 0, 0)
  }

  // ─── Legend ────────────────────────────────────────────────────

  const legendY = Math.max(y, pageH - 30)

  // Player roster
  if (structure.players.length > 0) {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8)
    doc.text('Spelare:', margin, legendY)

    doc.setFont('helvetica', 'normal')
    const playerText = structure.players
      .map((p) => `${p.label} (${p.team === 'home' ? 'Hemma' : 'Borta'})`)
      .join('    ')
    doc.text(playerText, margin + 18, legendY)
  }

  // Movement legend
  if (structure.movements.length > 0) {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8)
    doc.text('Rörelser:', margin, legendY + 5)

    doc.setFont('helvetica', 'normal')
    const types = new Set(structure.movements.map((m) => m.type))
    const legendItems = Array.from(types).map(
      (t) => MOVEMENT_TYPE_LABELS[t] || t
    )
    doc.text(`${structure.movements.length} st — ${legendItems.join(', ')}`, margin + 18, legendY + 5)
  }

  // Footer
  doc.setFontSize(7)
  doc.setTextColor(150, 150, 150)
  doc.text('Trainomics.app', pageW - margin, pageH - 5, { align: 'right' })

  // ─── Download ──────────────────────────────────────────────────

  const safeName = title.replace(/[^a-zA-ZåäöÅÄÖ0-9-_ ]/g, '').replace(/\s+/g, '-')
  doc.save(`${safeName || 'ovning'}.pdf`)
}
