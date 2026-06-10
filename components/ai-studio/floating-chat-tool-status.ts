// Page-context typing and tool-result status messages for the floating AI chat.

// Page context types for different page contexts
export interface PageContext {
  /** Type of page context */
  type: string
  /** Human-readable title for the context */
  title: string
  /** Structured data to include in the AI prompt */
  data: Record<string, unknown>
  /** Optional summary text */
  summary?: string
  /** Concept keys from info-content.ts for this page */
  conceptKeys?: string[]
}

export interface ToolOutputPart {
  type: string
  state?: string
  output?: unknown
}

interface ToolStatusOutput {
  success?: boolean
  message?: string
  error?: string
  needsClarification?: boolean
  title?: string
  name?: string
  athleteName?: string
}

interface CoachOperatorContext {
  status?: 'attention' | 'stable'
  tone?: 'risk' | 'watch' | 'steady'
  headline?: string
  summary?: {
    urgentCount?: number
    reviewCount?: number
    queueCount?: number
    activeAlerts?: number
    recommendationCount?: number
  }
  focusAreas?: string[]
}

export function getCoachOperatorContext(pageContext?: PageContext): CoachOperatorContext | null {
  if (pageContext?.type !== 'coach-dashboard') return null
  const data = pageContext.data as {
    dashboard?: {
      operator?: CoachOperatorContext
    }
  }
  return data.dashboard?.operator ?? null
}

export function isToolStatusOutput(output: unknown): output is ToolStatusOutput {
  return typeof output === 'object' && output !== null
}

function getFallbackActionMessage(toolName: string, output: ToolStatusOutput, locale: 'en' | 'sv'): string {
  if (locale !== 'sv') {
    if (output.success === false) {
      const error = output.error || output.message || 'I did not get a clear error message from the system.'
      if (output.needsClarification) {
        return `${error} Choose the right option or give me a little more information and I will continue.`
      }
      return `I could not complete that: ${error}`
    }

    if (output.success === true) {
      if (output.message) return output.message

      switch (toolName) {
        case 'createTodayWorkout':
          return output.title
            ? `Done, I created the workout "${output.title}".`
            : 'Done, I created the workout.'
        case 'logMeal':
          return 'Done, I logged the meal.'
        case 'updateMeal':
          return 'Done, I updated the meal.'
        case 'deleteMeal':
          return 'Done, I deleted the meal.'
        case 'logDailyCheckIn':
          return 'Done, I saved the check-in.'
        case 'reportInjury':
          return 'Done, I registered the injury report.'
        case 'updateAthleteProfile':
          return 'Done, I updated the profile.'
        case 'createCalendarEvent':
          return 'Done, I created the calendar event.'
        case 'generateTrainingProgram':
          return output.athleteName
            ? `Done, I started program generation for ${output.athleteName}.`
            : 'Done, I started program generation.'
        case 'generateStrengthSession':
        case 'createComplementaryStrengthSession':
        case 'createCardioSession':
        case 'createHybridWorkout':
        case 'createSportWorkout':
        case 'modifyStrengthSession':
          return output.name
            ? `Done, I saved "${output.name}".`
            : 'Done, I saved the action.'
        case 'planTeamWorkoutInCalendar':
          return output.message || 'Done, I planned the workout in the team calendar.'
        case 'getTeamPlannedWorkout':
          return output.message || 'I checked the planned team workout.'
        case 'prepareCoachMessageDraft':
          return 'I prepared a message. It will not be sent until you confirm it in the card below.'
        case 'suggestCoachNavigation':
          return 'I prepared a shortcut. Click the button below to open it.'
        default:
          return 'Done, I completed the action.'
      }
    }

    return output.error || output.message || 'I tried to perform the action, but did not get a clear response from the system.'
  }

  if (output.success === false) {
    const error = output.error || output.message || 'Jag fick inget tydligt felmeddelande från systemet.'
    if (output.needsClarification) {
      return `${error} Välj rätt alternativ eller ge mig lite mer information så fortsätter jag.`
    }
    return `Jag kunde inte slutföra det: ${error}`
  }

  if (output.success === true) {
    if (output.message) return output.message

    switch (toolName) {
      case 'createTodayWorkout':
        return output.title
          ? `Klart, jag har skapat passet "${output.title}".`
          : 'Klart, jag har skapat passet.'
      case 'logMeal':
        return 'Klart, jag har loggat måltiden.'
      case 'updateMeal':
        return 'Klart, jag har uppdaterat måltiden.'
      case 'deleteMeal':
        return 'Klart, jag har tagit bort måltiden.'
      case 'logDailyCheckIn':
        return 'Klart, jag har sparat incheckningen.'
      case 'reportInjury':
        return 'Klart, jag har registrerat skaderapporten.'
      case 'updateAthleteProfile':
        return 'Klart, jag har uppdaterat profilen.'
      case 'createCalendarEvent':
        return 'Klart, jag har skapat kalenderhändelsen.'
      case 'generateTrainingProgram':
        return output.athleteName
          ? `Klart, jag har startat programgenereringen för ${output.athleteName}.`
          : 'Klart, jag har startat programgenereringen.'
      case 'generateStrengthSession':
      case 'createComplementaryStrengthSession':
      case 'createCardioSession':
      case 'createHybridWorkout':
      case 'createSportWorkout':
      case 'modifyStrengthSession':
        return output.name
          ? `Klart, jag har sparat "${output.name}".`
          : 'Klart, jag har sparat åtgärden.'
      case 'planTeamWorkoutInCalendar':
        return output.message || 'Klart, jag har planerat passet i lagkalendern.'
      case 'getTeamPlannedWorkout':
        return output.message || 'Jag har kontrollerat det planerade lagpasset.'
      case 'prepareCoachMessageDraft':
        return 'Jag har förberett ett meddelande. Det skickas först när du bekräftar i kortet nedan.'
      case 'suggestCoachNavigation':
        return 'Jag har förberett en genväg. Klicka på knappen nedan för att öppna den.'
      default:
        return 'Klart, jag har utfört åtgärden.'
    }
  }

  return output.error || output.message || 'Jag försökte utföra åtgärden, men fick inget tydligt svar från systemet.'
}

export function getToolOnlyStatusMessage(role: string, parts: unknown[] | undefined, locale: 'en' | 'sv'): string | null {
  if (role !== 'assistant') return null

  const toolOutputs = (parts as ToolOutputPart[] | undefined)?.filter(
    part => part.type.startsWith('tool-') && part.state === 'output-available'
  )
  if (!toolOutputs?.length) return null

  const latestOutput = [...toolOutputs]
    .reverse()
    .find(part => isToolStatusOutput(part.output))
  if (!latestOutput || !isToolStatusOutput(latestOutput.output)) {
    return locale === 'sv'
      ? 'Jag försökte utföra åtgärden, men fick inget tydligt svar från systemet.'
      : 'I tried to perform the action, but did not get a clear response from the system.'
  }

  return getFallbackActionMessage(
    latestOutput.type.replace(/^tool-/, ''),
    latestOutput.output,
    locale
  )
}
