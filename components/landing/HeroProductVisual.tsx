'use client'

/**
 * Stylized product mockup for the landing hero: a lactate-curve analysis
 * card with threshold markers and training zones. Pure presentation —
 * labels are scientific terms (LT1/LT2, mmol/L) and locale-neutral.
 */
export function HeroProductVisual() {
  return (
    <div className="relative mx-auto max-w-4xl" aria-hidden="true">
      {/* Glow behind the card */}
      <div className="absolute -inset-6 rounded-3xl bg-gradient-to-r from-blue-500/20 via-cyan-500/10 to-emerald-500/20 blur-2xl" />

      <div className="relative rounded-2xl border border-slate-700/60 bg-slate-900/80 shadow-2xl backdrop-blur">
        {/* Window chrome */}
        <div className="flex items-center gap-2 border-b border-slate-700/60 px-4 py-3">
          <span className="h-2.5 w-2.5 rounded-full bg-red-500/70" />
          <span className="h-2.5 w-2.5 rounded-full bg-amber-500/70" />
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-500/70" />
          <span className="ml-3 text-xs font-medium tracking-wide text-slate-400">
            Lactate Threshold Analysis
          </span>
          <span className="ml-auto hidden items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-300 sm:flex">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            LT2 detected
          </span>
        </div>

        <svg viewBox="0 0 560 300" className="w-full">
          {/* Grid */}
          {[70, 110, 150, 190, 230].map((y) => (
            <line key={y} x1="50" y1={y} x2="530" y2={y} stroke="#334155" strokeWidth="0.6" strokeDasharray="3 4" />
          ))}

          {/* Y axis labels (lactate mmol/L) */}
          {[
            { y: 234, label: '1' },
            { y: 194, label: '2' },
            { y: 154, label: '3' },
            { y: 114, label: '4' },
            { y: 74, label: '6' },
          ].map((tick) => (
            <text key={tick.y} x="40" y={tick.y} textAnchor="end" fontSize="10" fill="#64748b">
              {tick.label}
            </text>
          ))}
          <text x="18" y="150" fontSize="10" fill="#64748b" transform="rotate(-90 18 150)" textAnchor="middle">
            mmol/L
          </text>
          <text x="290" y="296" fontSize="10" fill="#64748b" textAnchor="middle">
            km/h
          </text>

          {/* Training zone bands under the curve */}
          <g opacity="0.9">
            <rect x="50" y="252" width="120" height="12" rx="2" fill="#3b82f6" opacity="0.55" />
            <rect x="172" y="252" width="100" height="12" rx="2" fill="#10b981" opacity="0.55" />
            <rect x="274" y="252" width="92" height="12" rx="2" fill="#eab308" opacity="0.55" />
            <rect x="368" y="252" width="78" height="12" rx="2" fill="#f97316" opacity="0.55" />
            <rect x="448" y="252" width="82" height="12" rx="2" fill="#ef4444" opacity="0.55" />
            {[
              { x: 110, label: 'Z1' },
              { x: 222, label: 'Z2' },
              { x: 320, label: 'Z3' },
              { x: 407, label: 'Z4' },
              { x: 489, label: 'Z5' },
            ].map((z) => (
              <text key={z.label} x={z.x} y="261.5" textAnchor="middle" fontSize="8.5" fontWeight="700" fill="#f8fafc" dominantBaseline="middle">
                {z.label}
              </text>
            ))}
          </g>

          {/* LT2 threshold (4 mmol/L) */}
          <line x1="50" y1="110" x2="530" y2="110" stroke="#ef4444" strokeWidth="1" strokeDasharray="5 4" opacity="0.7" />
          <line x1="412" y1="110" x2="412" y2="240" stroke="#ef4444" strokeWidth="1" strokeDasharray="5 4" opacity="0.5" />
          <text x="56" y="104" fontSize="10" fontWeight="600" fill="#f87171">
            LT2 · 4.0 mmol/L
          </text>

          {/* LT1 marker */}
          <line x1="296" y1="186" x2="296" y2="240" stroke="#f59e0b" strokeWidth="1" strokeDasharray="5 4" opacity="0.5" />
          <text x="296" y="180" fontSize="10" fontWeight="600" fill="#fbbf24" textAnchor="middle">
            LT1
          </text>

          {/* Area under lactate curve */}
          <path
            d="M50,232 C140,230 220,224 296,206 C350,193 390,160 412,110 C432,66 450,48 470,40 L470,240 L50,240 Z"
            fill="url(#lp-curve-fill)"
          />
          {/* Lactate curve */}
          <path
            d="M50,232 C140,230 220,224 296,206 C350,193 390,160 412,110 C432,66 450,48 470,40"
            fill="none"
            stroke="url(#lp-curve-stroke)"
            strokeWidth="3"
            strokeLinecap="round"
          />

          {/* Measured test stages */}
          {[
            { x: 50, y: 232 },
            { x: 130, y: 229 },
            { x: 212, y: 222 },
            { x: 296, y: 206 },
            { x: 356, y: 180 },
            { x: 412, y: 110 },
            { x: 470, y: 40 },
          ].map((p, i) => (
            <circle key={i} cx={p.x} cy={p.y} r="4" fill="#0f172a" stroke="#38bdf8" strokeWidth="2" />
          ))}

          {/* Threshold intersection highlight */}
          <circle cx="412" cy="110" r="7" fill="none" stroke="#ef4444" strokeWidth="1.5" opacity="0.8" />
          <circle cx="412" cy="110" r="4" fill="#ef4444" />

          <defs>
            <linearGradient id="lp-curve-stroke" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#38bdf8" />
              <stop offset="60%" stopColor="#34d399" />
              <stop offset="100%" stopColor="#f87171" />
            </linearGradient>
            <linearGradient id="lp-curve-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#0f172a" stopOpacity="0" />
            </linearGradient>
          </defs>
        </svg>
      </div>

      {/* Floating stat chips */}
      <div className="absolute -left-4 top-16 hidden rounded-xl border border-slate-700/70 bg-slate-900/90 px-4 py-3 shadow-xl backdrop-blur md:block">
        <p className="text-[10px] uppercase tracking-wider text-slate-400">VO2max</p>
        <p className="text-xl font-bold text-white">
          58.3 <span className="text-xs font-medium text-slate-400">ml/kg/min</span>
        </p>
      </div>
      <div className="absolute -right-4 bottom-14 hidden rounded-xl border border-slate-700/70 bg-slate-900/90 px-4 py-3 shadow-xl backdrop-blur md:block">
        <p className="text-[10px] uppercase tracking-wider text-slate-400">LT2 pace</p>
        <p className="text-xl font-bold text-white">
          4:12 <span className="text-xs font-medium text-slate-400">min/km</span>
        </p>
      </div>
    </div>
  )
}
