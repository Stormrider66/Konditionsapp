import { NextRequest, NextResponse } from 'next/server'
import { requireCoach } from '@/lib/auth-utils'
import { getResolvedAiKeys } from '@/lib/user-api-keys'
import { resolveModel } from '@/types/ai-models'
import { createModelInstance } from '@/lib/ai/create-model'
import { withAiContext } from '@/lib/ai/usage-logger'
import { resolveRequestLocale, type AppLocale } from '@/lib/i18n/request-locale'
import { generateText } from 'ai'

/**
 * POST /api/coach/social/generate
 * Generate AI-powered social media captions
 */
export async function POST(request: NextRequest) {
  let locale: AppLocale = 'en'

  try {
    const user = await requireCoach()
    const body = await request.json()

    const {
      platform = 'instagram', // instagram, facebook, tiktok, linkedin
      topic,                  // "New PR", "Class promo", "Weekly highlights", "Free text"
      context,                // { athleteName, exerciseName, value, unit, gymName, className, etc. }
      tone = 'motivational',  // motivational, professional, casual, fun
      language,               // sv or en
      includeHashtags = true,
    } = body
    locale = language === 'sv' || language === 'en'
      ? language
      : resolveRequestLocale(request, user.language)

    if (!topic) {
      return NextResponse.json(
        { error: t(locale, 'Topic is required', 'Ämne krävs') },
        { status: 400 }
      )
    }

    // Resolve AI model
    const apiKeys = await getResolvedAiKeys(user.id)
    const resolved = resolveModel(apiKeys, 'fast')

    if (!resolved) {
      return NextResponse.json(
        {
          error: t(
            locale,
            'API key is missing. Configure an AI API key in settings.',
            'API-nyckel saknas. Konfigurera en AI API-nyckel i inställningarna.'
          ),
        },
        { status: 400 }
      )
    }

    const model = createModelInstance(resolved)

    // Platform-specific guidelines
    const platformGuides: Record<AppLocale, Record<string, string>> = {
      en: {
        instagram: 'Instagram: max 2200 characters, use emojis, include relevant hashtags (5-10). Use a visually engaging tone.',
        facebook: 'Facebook: can be longer and more narrative. Include a call-to-action. Use fewer hashtags (2-3).',
        tiktok: 'TikTok: short and catchy, hook in the first sentence, youthful tone. 2-3 hashtags max.',
        linkedin: 'LinkedIn: professional tone, focus on results and expertise. Use short paragraphs. 3-5 hashtags.',
      },
      sv: {
        instagram: 'Instagram: max 2200 tecken, använd emojis, inkludera relevanta hashtags (5-10 st). Visuellt engagerande ton.',
        facebook: 'Facebook: kan vara längre, mer berättande. Inkludera en call-to-action. Färre hashtags (2-3).',
        tiktok: 'TikTok: kort och catchy, hook i första meningen, ungdomlig ton. 2-3 hashtags max.',
        linkedin: 'LinkedIn: professionell ton, fokusera på resultat och expertis. Korta stycken. 3-5 hashtags.',
      },
    }

    const toneGuides: Record<AppLocale, Record<string, string>> = {
      en: {
        motivational: 'Motivational and energetic, celebrate progress, encourage them to keep going.',
        professional: 'Professional and credible, focused on knowledge and results.',
        casual: 'Relaxed and personal, like talking to a friend.',
        fun: 'Playful and fun, use humor and emojis.',
      },
      sv: {
        motivational: 'Motiverande och energisk, fira framgångar, uppmuntra att fortsätta.',
        professional: 'Professionell och trovärdig, fokus på kunskap och resultat.',
        casual: 'Avslappnad och personlig, som att prata med en vän.',
        fun: 'Rolig och lekfull, använd humor och emojis.',
      },
    }

    const systemPrompt = locale === 'sv'
      ? `Du är en social media-expert för gym och träningsverksamheter i Sverige.
Generera engagerande inlägg som följer plattformens bästa praxis.

Regler:
- Skriv på svenska
- ${platformGuides.sv[platform] || platformGuides.sv.instagram}
- ${toneGuides.sv[tone] || toneGuides.sv.motivational}
- ${includeHashtags ? 'Inkludera relevanta hashtags i slutet' : 'Inga hashtags'}
- Gör ALDRIG ogrundade hälsopåståenden
- Om inlägget handlar om en medlem, var positiv och uppmuntrande
- Om det är reklam för gymmet, var tydlig med det (svensk lag kräver transparens)
- Svara ENBART med caption-texten, ingen förklaring`
      : `You are a social media expert for gyms and training businesses.
Generate engaging posts that follow each platform's best practices.

Rules:
- Write in English
- ${platformGuides.en[platform] || platformGuides.en.instagram}
- ${toneGuides.en[tone] || toneGuides.en.motivational}
- ${includeHashtags ? 'Include relevant hashtags at the end' : 'Do not include hashtags'}
- NEVER make unsupported health claims
- If the post is about a member, keep it positive and encouraging
- If it is advertising for the gym, make that clear
- Respond ONLY with the caption text, no explanation`

    const userPrompt = buildUserPrompt(topic, context, locale)

    const result = await withAiContext(
      { userId: user.id, category: 'coach_social_caption_generation' },
      () => generateText({
        model,
        system: systemPrompt,
        prompt: userPrompt,
        maxOutputTokens: 500,
      }),
    )

    return NextResponse.json({
      caption: result.text.trim(),
      platform,
      isAiGenerated: true,
      model: resolved.displayName,
    })
  } catch (error) {
    console.error('Social generate error:', error)
    return NextResponse.json(
      { error: t(locale, 'Failed to generate caption', 'Kunde inte generera inläggstext') },
      { status: 500 }
    )
  }
}

function buildUserPrompt(topic: string, context: Record<string, string | number> | undefined, locale: AppLocale): string {
  if (!context) {
    return locale === 'sv'
      ? `Skriv ett sociala media-inlägg om: ${topic}`
      : `Write a social media post about: ${topic}`
  }

  if (locale === 'en') {
    switch (topic) {
      case 'PR_ACHIEVED':
        return `Celebrate a new personal record!
Athlete: ${context.athleteName || 'A member'}
Exercise: ${context.exerciseName || 'strength exercise'}
Result: ${context.value || ''} ${context.unit || 'kg'}
${context.previousValue ? `Improvement from: ${context.previousValue} ${context.unit || 'kg'}` : ''}`

      case 'CHALLENGE_COMPLETE':
        return `A challenge is complete. Summarize the results.
Challenge: ${context.challengeName || 'Monthly challenge'}
Winner: ${context.winnerName || ''}
Participants: ${context.participantCount || ''}
${context.topResult ? `Best result: ${context.topResult}` : ''}`

      case 'WEEKLY_SUMMARY':
        return `Create a "Weekly summary" post for the gym.
Gym: ${context.gymName || 'our gym'}
Completed workouts: ${context.totalWorkouts || ''}
PRs: ${context.totalPRs || ''}
Busiest day: ${context.busiestDay || ''}
${context.highlight ? `Weekly highlight: ${context.highlight}` : ''}`

      case 'CLASS_PROMO':
        return `Promote a group training class.
Class: ${context.className || ''}
Time: ${context.time || ''}
Instructor: ${context.instructor || ''}
${context.spotsLeft ? `Spots left: ${context.spotsLeft}` : ''}
${context.description ? `Description: ${context.description}` : ''}`

      case 'MILESTONE':
        return `Celebrate a member milestone.
Athlete: ${context.athleteName || 'A member'}
Milestone: ${context.milestone || ''}
${context.details ? `Details: ${context.details}` : ''}`

      default:
        return `Write a social media post about: ${topic}
${Object.entries(context).map(([k, v]) => `${k}: ${v}`).join('\n')}`
    }
  }

  switch (topic) {
    case 'PR_ACHIEVED':
      return `Fira ett nytt personligt rekord!
Atlet: ${context.athleteName || 'En medlem'}
Övning: ${context.exerciseName || 'styrkeövning'}
Resultat: ${context.value || ''} ${context.unit || 'kg'}
${context.previousValue ? `Förbättring från: ${context.previousValue} ${context.unit || 'kg'}` : ''}`

    case 'CHALLENGE_COMPLETE':
      return `En utmaning är avslutad! Sammanfatta resultaten.
Utmaning: ${context.challengeName || 'Månadens utmaning'}
Vinnare: ${context.winnerName || ''}
Antal deltagare: ${context.participantCount || ''}
${context.topResult ? `Bästa resultat: ${context.topResult}` : ''}`

    case 'WEEKLY_SUMMARY':
      return `Skapa ett "Veckans sammanfattning"-inlägg för gymmet.
Gym: ${context.gymName || 'vårt gym'}
Antal pass genomförda: ${context.totalWorkouts || ''}
Antal PRs: ${context.totalPRs || ''}
Mest aktiva dag: ${context.busiestDay || ''}
${context.highlight ? `Veckans highlight: ${context.highlight}` : ''}`

    case 'CLASS_PROMO':
      return `Marknadsför en gruppträningsklass.
Klass: ${context.className || ''}
Tid: ${context.time || ''}
Instruktör: ${context.instructor || ''}
${context.spotsLeft ? `Platser kvar: ${context.spotsLeft}` : ''}
${context.description ? `Beskrivning: ${context.description}` : ''}`

    case 'MILESTONE':
      return `Fira en milstolpe för en medlem!
Atlet: ${context.athleteName || 'En medlem'}
Milstolpe: ${context.milestone || ''}
${context.details ? `Detaljer: ${context.details}` : ''}`

    default:
      return `Skriv ett sociala media-inlägg om: ${topic}
${Object.entries(context).map(([k, v]) => `${k}: ${v}`).join('\n')}`
  }
}

function t(locale: AppLocale, en: string, sv: string): string {
  return locale === 'sv' ? sv : en
}
