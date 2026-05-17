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
  drillId?: string | null
  drillStructure?: unknown
}

export type PracticeTemplateKind = 'skills' | 'tactical' | 'gamePrep'

function blockId() {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`
}

export function blockSummary(block: PracticeBlock) {
  const lines = [`${block.duration} min | ${block.title}`]
  if (block.focus) lines.push(`Fokus: ${block.focus}`)
  if (block.groups) lines.push(`Grupp: ${block.groups}`)
  if (block.equipment) lines.push(`Material: ${block.equipment}`)
  if (block.description) lines.push(block.description)
  if (block.coachingPoints) lines.push(`Coaching: ${block.coachingPoints}`)
  return lines.join('\n')
}

export function practiceBlocksToDescription(blocks: PracticeBlock[]) {
  return blocks.map(blockSummary).join('\n\n')
}

export function makePracticeBlock(input: Omit<PracticeBlock, 'id'>): PracticeBlock {
  return { id: blockId(), ...input }
}

export function newPracticeBlock(): PracticeBlock {
  return makePracticeBlock({
    type: 'technical',
    title: 'Nytt block',
    duration: 10,
    focus: '',
    description: '',
    coachingPoints: '',
    groups: '',
    equipment: '',
  })
}

export function icePracticeTemplate(kind: PracticeTemplateKind): PracticeBlock[] {
  if (kind === 'skills') {
    return [
      makePracticeBlock({ type: 'warmup', title: 'Skridskoteknik + pucktouch', duration: 10, focus: 'Aktivering', groups: 'Alla', equipment: 'Puckar', description: 'Lätta riktningsförändringar, puckkontroll och tempo upp stegvis.', coachingPoints: 'Knä över tå, aktiv klubba, korta byten.' }),
      makePracticeBlock({ type: 'technical', title: 'Teknikstationer', duration: 15, focus: 'Pass/mottag, skott, riktningsförändringar', groups: '3 stationer', equipment: 'Puckar, koner, mål', description: 'Tre stationer med tydlig rotation och hög repetition.', coachingPoints: 'Kvalitet före fart första varvet, sedan tempo.' }),
      makePracticeBlock({ type: 'small_game', title: '2v2 / 3v3 korta byten', duration: 15, focus: 'Beslut i små ytor', groups: 'Färggrupper', equipment: 'Småmål eller avgränsare', description: 'Smålagsspel med 30-40 sek byten.', coachingPoints: 'Spelbarhet, snabb återerövring, kommunikation.' }),
      makePracticeBlock({ type: 'technical', title: 'Fartmoment + avslut', duration: 15, focus: 'Övergångar', groups: 'Forwards/backar i par', equipment: 'Puckar, mål', description: 'Övergång från fart till avslut med trafik mot mål.', coachingPoints: 'Attackera med fart, andra våg mot retur.' }),
      makePracticeBlock({ type: 'cooldown', title: 'Nedvarvning + samling', duration: 5, focus: 'Summering', groups: 'Alla', equipment: '', description: 'Lugn åkning och kort samling.', coachingPoints: 'Lyft 1-2 nycklar till nästa pass.' }),
    ]
  }

  if (kind === 'tactical') {
    return [
      makePracticeBlock({ type: 'warmup', title: 'Spelvändningar utan press', duration: 10, focus: 'Timing', groups: 'Alla', equipment: 'Puckar', description: 'Lugn uppstart med passvägar och uppspel.', coachingPoints: 'Vänd upp tidigt, scan före puck.' }),
      makePracticeBlock({ type: 'tactical', title: 'Breakout + första pass', duration: 15, focus: 'Speluppbyggnad', groups: 'Femman / lagdelar', equipment: 'Puckar', description: 'Back-forward-center-positioner med kontrollerad press.', coachingPoints: 'Bredd, understöd, första pass på blad.' }),
      makePracticeBlock({ type: 'tactical', title: 'Forecheck/backcheck', duration: 15, focus: 'Styrning och avstånd', groups: 'Lagdelar', equipment: 'Puckar', description: 'Lagdelar jobbar med triggers och hemgångar.', coachingPoints: 'Rätt sida, korta avstånd, tydliga triggers.' }),
      makePracticeBlock({ type: 'special_teams', title: 'Zonspel / special teams', duration: 15, focus: 'Roller', groups: 'PP/BP-enheter', equipment: 'Puckar, tavla', description: 'Repetera PP/BP eller försvar/anfall i zon.', coachingPoints: 'Tydliga roller och nästa aktion.' }),
      makePracticeBlock({ type: 'cooldown', title: 'Samling', duration: 5, focus: 'Nycklar', groups: 'Alla', equipment: '', description: '1-2 prioriteringar till nästa match.', coachingPoints: 'Kort och tydligt.' }),
    ]
  }

  return [
    makePracticeBlock({ type: 'warmup', title: 'Tempo + pucktouch', duration: 10, focus: 'Aktivering', groups: 'Alla + målvakter', equipment: 'Puckar', description: 'Matchlik start med målvaktsvärmning integrerad.', coachingPoints: 'Få upp fart utan att slita.' }),
    makePracticeBlock({ type: 'technical', title: 'Matchlika avslut', duration: 15, focus: 'Trafik på mål', groups: 'Kedjor', equipment: 'Puckar, mål', description: 'Avslut med skymning, retur och andra puck.', coachingPoints: 'In på kassen, klubba ledig, stoppa vid mål.' }),
    makePracticeBlock({ type: 'tactical', title: 'Spelvändningar + hemgångar', duration: 15, focus: 'Matchdetaljer', groups: 'Femman / lagdelar', equipment: 'Puckar', description: 'Övergångar med defensiv sortering.', coachingPoints: 'Första hem, andra styr, tredje säkrar.' }),
    makePracticeBlock({ type: 'special_teams', title: 'PP / BP / tekningar', duration: 12, focus: 'Special teams', groups: 'Special teams-enheter', equipment: 'Puckar, tavla', description: 'Repetera fasta situationer och roller.', coachingPoints: 'Startposition, första beslut, returjobb.' }),
    makePracticeBlock({ type: 'small_game', title: 'Kort spel + matchplan', duration: 8, focus: 'Energi', groups: 'Alla', equipment: 'Puckar', description: 'Kort intensivt spel och tydlig matchplan.', coachingPoints: 'Avsluta med självförtroende.' }),
  ]
}
