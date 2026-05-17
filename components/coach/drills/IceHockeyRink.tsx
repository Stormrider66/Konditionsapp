'use client'

/**
 * Ice Hockey Rink SVG Renderer
 *
 * Renders an IIHF standard rink with player positions,
 * movement arrows, puck paths, and annotations.
 *
 * Coordinate system: 0,0 = top-left, 200x85 (proportional to 60m x 26m)
 */

interface Player {
  id: string
  x: number // 0-200
  y: number // 0-85
  label: string // "C", "LW", "RW", "LD", "RD", "G" or numbers
  team: 'home' | 'away'
  color?: string
}

interface Movement {
  id: string
  fromX: number
  fromY: number
  toX: number
  toY: number
  type: 'skate' | 'pass' | 'shot' | 'puck'
  playerId?: string | null
  phase?: number
  color?: string
  dashed?: boolean
}

interface Zone {
  id: string
  x: number
  y: number
  width: number
  height: number
  color: string
  label?: string
}

interface Annotation {
  id: string
  x: number
  y: number
  text: string
}

export interface DrillStructure {
  players: Player[]
  movements: Movement[]
  zones?: Zone[]
  annotations?: Annotation[]
}

interface IceHockeyRinkProps {
  structure: DrillStructure
  width?: number
  className?: string
}

export function IceHockeyRink({ structure, width = 600, className = '' }: IceHockeyRinkProps) {
  const height = (width / 200) * 85

  return (
    <svg
      viewBox="0 0 200 85"
      width={width}
      height={height}
      className={className}
      style={{ maxWidth: '100%', height: 'auto' }}
    >
      {/* Rink outline */}
      <rect x="0" y="0" width="200" height="85" rx="14" ry="14" fill="#e8f4f8" stroke="#1a5276" strokeWidth="0.8" />

      {/* Center line */}
      <line x1="100" y1="0" x2="100" y2="85" stroke="#cc0000" strokeWidth="0.6" />

      {/* Blue lines */}
      <line x1="65" y1="0" x2="65" y2="85" stroke="#1a5276" strokeWidth="0.6" />
      <line x1="135" y1="0" x2="135" y2="85" stroke="#1a5276" strokeWidth="0.6" />

      {/* Goal lines */}
      <line x1="11" y1="0" x2="11" y2="85" stroke="#cc0000" strokeWidth="0.4" />
      <line x1="189" y1="0" x2="189" y2="85" stroke="#cc0000" strokeWidth="0.4" />

      {/* Center circle */}
      <circle cx="100" cy="42.5" r="7.5" fill="none" stroke="#1a5276" strokeWidth="0.4" />
      <circle cx="100" cy="42.5" r="0.6" fill="#1a5276" />

      {/* Center dot */}
      <circle cx="100" cy="42.5" r="0.8" fill="#1a5276" />

      {/* Faceoff circles - offensive */}
      <circle cx="31" cy="22" r="7.5" fill="none" stroke="#cc0000" strokeWidth="0.4" />
      <circle cx="31" cy="22" r="0.6" fill="#cc0000" />
      <circle cx="31" cy="63" r="7.5" fill="none" stroke="#cc0000" strokeWidth="0.4" />
      <circle cx="31" cy="63" r="0.6" fill="#cc0000" />

      {/* Faceoff circles - defensive */}
      <circle cx="169" cy="22" r="7.5" fill="none" stroke="#cc0000" strokeWidth="0.4" />
      <circle cx="169" cy="22" r="0.6" fill="#cc0000" />
      <circle cx="169" cy="63" r="7.5" fill="none" stroke="#cc0000" strokeWidth="0.4" />
      <circle cx="169" cy="63" r="0.6" fill="#cc0000" />

      {/* Neutral zone faceoff dots */}
      <circle cx="80" cy="22" r="0.6" fill="#cc0000" />
      <circle cx="80" cy="63" r="0.6" fill="#cc0000" />
      <circle cx="120" cy="22" r="0.6" fill="#cc0000" />
      <circle cx="120" cy="63" r="0.6" fill="#cc0000" />

      {/* Goal creases */}
      <path d="M 7 38 A 3 3 0 0 1 7 47" fill="rgba(135,206,250,0.3)" stroke="#1a5276" strokeWidth="0.3" />
      <path d="M 193 38 A 3 3 0 0 0 193 47" fill="rgba(135,206,250,0.3)" stroke="#1a5276" strokeWidth="0.3" />

      {/* Goals */}
      <rect x="3" y="39.5" width="4" height="6" rx="0.5" fill="none" stroke="#cc0000" strokeWidth="0.5" />
      <rect x="193" y="39.5" width="4" height="6" rx="0.5" fill="none" stroke="#cc0000" strokeWidth="0.5" />

      {/* Zones overlay */}
      {structure.zones?.map((zone) => (
        <g key={zone.id}>
          <rect
            x={zone.x}
            y={zone.y}
            width={zone.width}
            height={zone.height}
            fill={zone.color}
            opacity={0.2}
            rx="2"
          />
          {zone.label && (
            <text x={zone.x + zone.width / 2} y={zone.y + zone.height / 2} textAnchor="middle" fontSize="3" fill={zone.color} fontWeight="bold">
              {zone.label}
            </text>
          )}
        </g>
      ))}

      {/* Movement arrows */}
      <defs>
        <marker id="arrowSkate" viewBox="0 0 6 6" refX="5" refY="3" markerWidth="4" markerHeight="4" orient="auto-start-reverse">
          <path d="M 0 0 L 6 3 L 0 6 z" fill="#1a1a1a" />
        </marker>
        <marker id="arrowPass" viewBox="0 0 6 6" refX="5" refY="3" markerWidth="4" markerHeight="4" orient="auto-start-reverse">
          <path d="M 0 0 L 6 3 L 0 6 z" fill="#2563eb" />
        </marker>
        <marker id="arrowShot" viewBox="0 0 6 6" refX="5" refY="3" markerWidth="4" markerHeight="4" orient="auto-start-reverse">
          <path d="M 0 0 L 6 3 L 0 6 z" fill="#dc2626" />
        </marker>
      </defs>
      {structure.movements.map((m) => {
        const color = m.color || (m.type === 'pass' ? '#2563eb' : m.type === 'shot' ? '#dc2626' : '#1a1a1a')
        const markerId = m.type === 'pass' ? 'arrowPass' : m.type === 'shot' ? 'arrowShot' : 'arrowSkate'
        return (
          <g key={m.id}>
            <line
              x1={m.fromX}
              y1={m.fromY}
              x2={m.toX}
              y2={m.toY}
              stroke={color}
              strokeWidth={m.type === 'shot' ? '0.8' : '0.6'}
              strokeDasharray={m.dashed || m.type === 'pass' ? '1.5 1' : undefined}
              markerEnd={`url(#${markerId})`}
            />
            {m.phase && (
              <g>
                <circle
                  cx={(m.fromX + m.toX) / 2}
                  cy={(m.fromY + m.toY) / 2}
                  r="2.3"
                  fill="white"
                  stroke={color}
                  strokeWidth="0.35"
                />
                <text
                  x={(m.fromX + m.toX) / 2}
                  y={(m.fromY + m.toY) / 2 + 0.8}
                  textAnchor="middle"
                  fontSize="2.4"
                  fill={color}
                  fontWeight="700"
                >
                  {m.phase}
                </text>
              </g>
            )}
          </g>
        )
      })}

      {/* Players */}
      {structure.players.map((p) => {
        const fillColor = p.color || (p.team === 'home' ? '#dc2626' : '#2563eb')
        return (
          <g key={p.id}>
            <circle cx={p.x} cy={p.y} r="3" fill={fillColor} stroke="white" strokeWidth="0.4" />
            <text x={p.x} y={p.y + 1} textAnchor="middle" fontSize="2.5" fill="white" fontWeight="bold" fontFamily="sans-serif">
              {p.label}
            </text>
          </g>
        )
      })}

      {/* Annotations */}
      {structure.annotations?.map((a) => (
        <text key={a.id} x={a.x} y={a.y} textAnchor="middle" fontSize="2.8" fill="#1a1a1a" fontWeight="600" fontFamily="sans-serif">
          {a.text}
        </text>
      ))}
    </svg>
  )
}
