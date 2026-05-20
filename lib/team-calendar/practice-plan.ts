export interface PracticeBlock {
  id: string
  type: 'warmup' | 'technical' | 'tactical' | 'small_game' | 'special_teams' | 'goalie' | 'cooldown'
  title: string
  duration: number
  focus: string
  description: string
  coachingPoints: string
  groups?: string
  equipment?: string
  rinkZone?: 'full_ice' | 'offensive_zone' | 'defensive_zone' | 'neutral_zone' | 'half_ice' | 'stations'
  intensity?: 'low' | 'medium' | 'high' | 'game'
  tacticalCategory?: 'skills' | 'breakout' | 'forecheck' | 'transition' | 'special_teams' | 'small_area' | 'finishing' | 'goalie'
  lineGroups?: string
  goalieNotes?: string
  drillId?: string | null
  drillStructure?: unknown
}

export type PracticeTemplateKind = 'skills' | 'tactical' | 'gamePrep'
export type PracticePlanLocale = 'en' | 'sv'

function text(locale: PracticePlanLocale, sv: string, en: string): string {
  return locale === 'sv' ? sv : en
}

function blockId() {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`
}

export function blockSummary(block: PracticeBlock, locale: PracticePlanLocale = 'sv') {
  const lines = [`${block.duration} min | ${block.title}`]
  if (block.focus) lines.push(`${text(locale, 'Fokus', 'Focus')}: ${block.focus}`)
  if (block.groups) lines.push(`${text(locale, 'Grupp', 'Group')}: ${block.groups}`)
  if (block.equipment) lines.push(`${text(locale, 'Material', 'Equipment')}: ${block.equipment}`)
  if (block.rinkZone) lines.push(`${text(locale, 'Zon', 'Zone')}: ${block.rinkZone}`)
  if (block.intensity) lines.push(`${text(locale, 'Intensitet', 'Intensity')}: ${block.intensity}`)
  if (block.tacticalCategory) lines.push(`${text(locale, 'Kategori', 'Category')}: ${block.tacticalCategory}`)
  if (block.lineGroups) lines.push(`${text(locale, 'Kedjor/roller', 'Lines/roles')}: ${block.lineGroups}`)
  if (block.description) lines.push(block.description)
  if (block.coachingPoints) lines.push(`Coaching: ${block.coachingPoints}`)
  if (block.goalieNotes) lines.push(`${text(locale, 'Målvakt', 'Goalie')}: ${block.goalieNotes}`)
  return lines.join('\n')
}

export function practiceBlocksToDescription(blocks: PracticeBlock[], locale: PracticePlanLocale = 'sv') {
  return blocks.map((block) => blockSummary(block, locale)).join('\n\n')
}

export function makePracticeBlock(input: Omit<PracticeBlock, 'id'>): PracticeBlock {
  return { id: blockId(), ...input }
}

function defaultTacticalCategory(block: PracticeBlock): NonNullable<PracticeBlock['tacticalCategory']> {
  if (block.type === 'small_game') return 'small_area'
  if (block.type === 'special_teams') return 'special_teams'
  if (block.type === 'goalie') return 'goalie'
  if (block.focus.toLowerCase().includes('avslut')) return 'finishing'
  if (block.focus.toLowerCase().includes('omställ') || block.title.toLowerCase().includes('spelvänd')) return 'transition'
  if (block.title.toLowerCase().includes('breakout') || block.focus.toLowerCase().includes('uppspel')) return 'breakout'
  if (block.title.toLowerCase().includes('forecheck')) return 'forecheck'
  return 'skills'
}

function defaultIntensity(block: PracticeBlock): NonNullable<PracticeBlock['intensity']> {
  if (block.type === 'cooldown') return 'low'
  if (block.type === 'small_game') return 'high'
  if (block.focus.toLowerCase().includes('match')) return 'game'
  return 'medium'
}

export function withPracticePlanningDefaults(block: PracticeBlock): PracticeBlock {
  return {
    ...block,
    rinkZone: block.rinkZone ?? 'full_ice',
    intensity: block.intensity ?? defaultIntensity(block),
    tacticalCategory: block.tacticalCategory ?? defaultTacticalCategory(block),
    lineGroups: block.lineGroups ?? '',
    goalieNotes: block.goalieNotes ?? '',
  }
}

export function newPracticeBlock(): PracticeBlock {
  return withPracticePlanningDefaults(makePracticeBlock({
    type: 'technical',
    title: 'Nytt block',
    duration: 10,
    focus: '',
    description: '',
    coachingPoints: '',
    groups: '',
    equipment: '',
    rinkZone: 'full_ice',
    intensity: 'medium',
    tacticalCategory: 'skills',
    lineGroups: '',
    goalieNotes: '',
  }))
}

export function icePracticeTemplate(kind: PracticeTemplateKind, locale: PracticePlanLocale = 'sv'): PracticeBlock[] {
  if (locale === 'en') {
    if (kind === 'skills') {
      return [
        makePracticeBlock({ type: 'warmup', title: 'Skating skills + puck touches', duration: 10, focus: 'Activation', groups: 'Everyone', equipment: 'Pucks', description: 'Light direction changes, puck control, and gradually rising tempo.', coachingPoints: 'Knee over toe, active stick, short shifts.' }),
        makePracticeBlock({ type: 'technical', title: 'Skills stations', duration: 15, focus: 'Passing/receiving, shooting, direction changes', groups: '3 stations', equipment: 'Pucks, cones, nets', description: 'Three stations with clear rotation and high repetition.', coachingPoints: 'Quality before speed on the first round, then tempo.' }),
        makePracticeBlock({ type: 'small_game', title: '2v2 / 3v3 short shifts', duration: 15, focus: 'Decisions in tight areas', groups: 'Color groups', equipment: 'Mini nets or dividers', description: 'Small-area games with 30-40 second shifts.', coachingPoints: 'Availability, quick regains, communication.' }),
        makePracticeBlock({ type: 'technical', title: 'Speed sequence + finish', duration: 15, focus: 'Transitions', groups: 'Forwards/defenders in pairs', equipment: 'Pucks, nets', description: 'Transition from speed into finishing with traffic at the net.', coachingPoints: 'Attack with speed, second wave to rebounds.' }),
        makePracticeBlock({ type: 'cooldown', title: 'Cooldown + team huddle', duration: 5, focus: 'Summary', groups: 'Everyone', equipment: '', description: 'Easy skating and a short huddle.', coachingPoints: 'Highlight 1-2 keys for the next session.' }),
      ].map(withPracticePlanningDefaults)
    }

    if (kind === 'tactical') {
      return [
        makePracticeBlock({ type: 'warmup', title: 'Regroups without pressure', duration: 10, focus: 'Timing', groups: 'Everyone', equipment: 'Pucks', description: 'Controlled start with passing lanes and breakouts.', coachingPoints: 'Turn up early, scan before the puck arrives.' }),
        makePracticeBlock({ type: 'tactical', title: 'Breakout + first pass', duration: 15, focus: 'Build-up play', groups: 'Unit / position groups', equipment: 'Pucks', description: 'Defender-forward-center positions with controlled pressure.', coachingPoints: 'Width, support, first pass on the tape.' }),
        makePracticeBlock({ type: 'tactical', title: 'Forecheck/backcheck', duration: 15, focus: 'Steering and spacing', groups: 'Position groups', equipment: 'Pucks', description: 'Units work on triggers and recovery routes.', coachingPoints: 'Right side, short distances, clear triggers.' }),
        makePracticeBlock({ type: 'special_teams', title: 'Zone play / special teams', duration: 15, focus: 'Roles', groups: 'PP/PK units', equipment: 'Pucks, board', description: 'Repeat PP/PK or zone offense/defense.', coachingPoints: 'Clear roles and the next action.' }),
        makePracticeBlock({ type: 'cooldown', title: 'Team huddle', duration: 5, focus: 'Keys', groups: 'Everyone', equipment: '', description: '1-2 priorities for the next game.', coachingPoints: 'Keep it short and clear.' }),
      ].map(withPracticePlanningDefaults)
    }

    return [
      makePracticeBlock({ type: 'warmup', title: 'Tempo + puck touches', duration: 10, focus: 'Activation', groups: 'Everyone + goalies', equipment: 'Pucks', description: 'Game-like start with goalie warmup integrated.', coachingPoints: 'Raise the pace without draining the group.' }),
      makePracticeBlock({ type: 'technical', title: 'Game-like finishing', duration: 15, focus: 'Traffic at the net', groups: 'Lines', equipment: 'Pucks, nets', description: 'Finishing with screens, rebounds, and second pucks.', coachingPoints: 'Get inside, keep the stick available, stop at the net.' }),
      makePracticeBlock({ type: 'tactical', title: 'Regroups + recovery routes', duration: 15, focus: 'Game details', groups: 'Unit / position groups', equipment: 'Pucks', description: 'Transitions with defensive sorting.', coachingPoints: 'First player back, second steers, third secures.' }),
      makePracticeBlock({ type: 'special_teams', title: 'PP / PK / faceoffs', duration: 12, focus: 'Special teams', groups: 'Special teams units', equipment: 'Pucks, board', description: 'Repeat set situations and roles.', coachingPoints: 'Starting position, first decision, rebound work.' }),
      makePracticeBlock({ type: 'small_game', title: 'Short game + game plan', duration: 8, focus: 'Energy', groups: 'Everyone', equipment: 'Pucks', description: 'Short intense game and a clear game plan.', coachingPoints: 'Finish with confidence.' }),
    ].map(withPracticePlanningDefaults)
  }

  if (kind === 'skills') {
    return [
      makePracticeBlock({ type: 'warmup', title: 'Skridskoteknik + pucktouch', duration: 10, focus: 'Aktivering', groups: 'Alla', equipment: 'Puckar', description: 'Lätta riktningsförändringar, puckkontroll och tempo upp stegvis.', coachingPoints: 'Knä över tå, aktiv klubba, korta byten.' }),
      makePracticeBlock({ type: 'technical', title: 'Teknikstationer', duration: 15, focus: 'Pass/mottag, skott, riktningsförändringar', groups: '3 stationer', equipment: 'Puckar, koner, mål', description: 'Tre stationer med tydlig rotation och hög repetition.', coachingPoints: 'Kvalitet före fart första varvet, sedan tempo.' }),
      makePracticeBlock({ type: 'small_game', title: '2v2 / 3v3 korta byten', duration: 15, focus: 'Beslut i små ytor', groups: 'Färggrupper', equipment: 'Småmål eller avgränsare', description: 'Smålagsspel med 30-40 sek byten.', coachingPoints: 'Spelbarhet, snabb återerövring, kommunikation.' }),
      makePracticeBlock({ type: 'technical', title: 'Fartmoment + avslut', duration: 15, focus: 'Övergångar', groups: 'Forwards/backar i par', equipment: 'Puckar, mål', description: 'Övergång från fart till avslut med trafik mot mål.', coachingPoints: 'Attackera med fart, andra våg mot retur.' }),
      makePracticeBlock({ type: 'cooldown', title: 'Nedvarvning + samling', duration: 5, focus: 'Summering', groups: 'Alla', equipment: '', description: 'Lugn åkning och kort samling.', coachingPoints: 'Lyft 1-2 nycklar till nästa pass.' }),
    ].map(withPracticePlanningDefaults)
  }

  if (kind === 'tactical') {
    return [
      makePracticeBlock({ type: 'warmup', title: 'Spelvändningar utan press', duration: 10, focus: 'Timing', groups: 'Alla', equipment: 'Puckar', description: 'Lugn uppstart med passvägar och uppspel.', coachingPoints: 'Vänd upp tidigt, scan före puck.' }),
      makePracticeBlock({ type: 'tactical', title: 'Breakout + första pass', duration: 15, focus: 'Speluppbyggnad', groups: 'Femman / lagdelar', equipment: 'Puckar', description: 'Back-forward-center-positioner med kontrollerad press.', coachingPoints: 'Bredd, understöd, första pass på blad.' }),
      makePracticeBlock({ type: 'tactical', title: 'Forecheck/backcheck', duration: 15, focus: 'Styrning och avstånd', groups: 'Lagdelar', equipment: 'Puckar', description: 'Lagdelar jobbar med triggers och hemgångar.', coachingPoints: 'Rätt sida, korta avstånd, tydliga triggers.' }),
      makePracticeBlock({ type: 'special_teams', title: 'Zonspel / special teams', duration: 15, focus: 'Roller', groups: 'PP/BP-enheter', equipment: 'Puckar, tavla', description: 'Repetera PP/BP eller försvar/anfall i zon.', coachingPoints: 'Tydliga roller och nästa aktion.' }),
      makePracticeBlock({ type: 'cooldown', title: 'Samling', duration: 5, focus: 'Nycklar', groups: 'Alla', equipment: '', description: '1-2 prioriteringar till nästa match.', coachingPoints: 'Kort och tydligt.' }),
    ].map(withPracticePlanningDefaults)
  }

  return [
    makePracticeBlock({ type: 'warmup', title: 'Tempo + pucktouch', duration: 10, focus: 'Aktivering', groups: 'Alla + målvakter', equipment: 'Puckar', description: 'Matchlik start med målvaktsvärmning integrerad.', coachingPoints: 'Få upp fart utan att slita.' }),
    makePracticeBlock({ type: 'technical', title: 'Matchlika avslut', duration: 15, focus: 'Trafik på mål', groups: 'Kedjor', equipment: 'Puckar, mål', description: 'Avslut med skymning, retur och andra puck.', coachingPoints: 'In på kassen, klubba ledig, stoppa vid mål.' }),
    makePracticeBlock({ type: 'tactical', title: 'Spelvändningar + hemgångar', duration: 15, focus: 'Matchdetaljer', groups: 'Femman / lagdelar', equipment: 'Puckar', description: 'Övergångar med defensiv sortering.', coachingPoints: 'Första hem, andra styr, tredje säkrar.' }),
    makePracticeBlock({ type: 'special_teams', title: 'PP / BP / tekningar', duration: 12, focus: 'Special teams', groups: 'Special teams-enheter', equipment: 'Puckar, tavla', description: 'Repetera fasta situationer och roller.', coachingPoints: 'Startposition, första beslut, returjobb.' }),
    makePracticeBlock({ type: 'small_game', title: 'Kort spel + matchplan', duration: 8, focus: 'Energi', groups: 'Alla', equipment: 'Puckar', description: 'Kort intensivt spel och tydlig matchplan.', coachingPoints: 'Avsluta med självförtroende.' }),
  ].map(withPracticePlanningDefaults)
}
