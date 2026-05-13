import { NextRequest, NextResponse } from 'next/server'
import { requireCoach } from '@/lib/auth-utils'
import { getResolvedAiKeys } from '@/lib/user-api-keys'
import { resolveModel } from '@/types/ai-models'
import { createModelInstance } from '@/lib/ai/create-model'
import { withAiContext } from '@/lib/ai/usage-logger'
import { generateText } from 'ai'

/**
 * POST /api/coach/social/generate
 * Generate AI-powered social media captions
 */
export async function POST(request: NextRequest) {
  try {
    const user = await requireCoach()
    const body = await request.json()

    const {
      platform = 'instagram', // instagram, facebook, tiktok, linkedin
      topic,                  // "New PR", "Class promo", "Weekly highlights", "Free text"
      context,                // { athleteName, exerciseName, value, unit, gymName, className, etc. }
      tone = 'motivational',  // motivational, professional, casual, fun
      language = 'sv',        // sv or en
      includeHashtags = true,
    } = body

    if (!topic) {
      return NextResponse.json({ error: 'topic required' }, { status: 400 })
    }

    // Resolve AI model
    const apiKeys = await getResolvedAiKeys(user.id)
    const resolved = resolveModel(apiKeys, 'fast')

    if (!resolved) {
      return NextResponse.json(
        { error: 'API-nyckel saknas. Konfigurera en AI API-nyckel i inställningarna.' },
        { status: 400 }
      )
    }

    const model = createModelInstance(resolved)

    // Platform-specific guidelines
    const platformGuides: Record<string, string> = {
      instagram: 'Instagram: max 2200 tecken, använd emojis, inkludera relevanta hashtags (5-10 st). Visuellt engagerande ton.',
      facebook: 'Facebook: kan vara längre, mer berättande. Inkludera en call-to-action. Färre hashtags (2-3).',
      tiktok: 'TikTok: kort och catchy, hook i första meningen, ungdomlig ton. 2-3 hashtags max.',
      linkedin: 'LinkedIn: professionell ton, fokusera på resultat och expertis. Korta stycken. 3-5 hashtags.',
    }

    const toneGuides: Record<string, string> = {
      motivational: 'Motiverande och energisk, fira framgångar, uppmuntra att fortsätta.',
      professional: 'Professionell och trovärdig, fokus på kunskap och resultat.',
      casual: 'Avslappnad och personlig, som att prata med en vän.',
      fun: 'Rolig och lekfull, använd humor och emojis.',
    }

    const systemPrompt = `Du är en social media-expert för gym och träningsverksamheter i Sverige.
Generera engagerande inlägg som följer plattformens bästa praxis.

Regler:
- Skriv på ${language === 'sv' ? 'svenska' : 'engelska'}
- ${platformGuides[platform] || platformGuides.instagram}
- ${toneGuides[tone] || toneGuides.motivational}
- ${includeHashtags ? 'Inkludera relevanta hashtags i slutet' : 'Inga hashtags'}
- Gör ALDRIG ogrundade hälsopåståenden
- Om inlägget handlar om en medlem, var positiv och uppmuntrande
- Om det är reklam för gymmet, var tydlig med det (svensk lag kräver transparens)
- Svara ENBART med caption-texten, ingen förklaring`

    const userPrompt = buildUserPrompt(topic, context)

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
    return NextResponse.json({ error: 'Failed to generate caption' }, { status: 500 })
  }
}

function buildUserPrompt(topic: string, context?: Record<string, string | number>): string {
  if (!context) {
    return `Skriv ett sociala media-inlägg om: ${topic}`
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
