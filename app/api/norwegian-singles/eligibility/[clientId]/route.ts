// app/api/norwegian-singles/eligibility/[clientId]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireCoach } from '@/lib/auth-utils';
import { validateNorwegianSinglesEligibility } from '@/lib/training-engine/integration/norwegian-singles-validation';
import { validateNorwegianMethodEligibility } from '@/lib/training-engine/integration/norwegian-validation';
import { logger } from '@/lib/logger';

/**
 * GET /api/norwegian-singles/eligibility/[clientId]
 * Check if athlete is eligible for Norwegian Singles methodology
 * Also provides comparison with Norwegian Doubles if athlete is close to eligibility
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { clientId: string } }
) {
  try {
    // Authenticate
    const user = await requireCoach();

    const clientId = params.clientId;

    // Verify client belongs to this coach
    const client = await prisma.client.findUnique({
      where: { id: clientId },
      select: { userId: true, name: true }
    });

    if (!client) {
      return NextResponse.json(
        { success: false, error: 'Klient hittades inte' },
        { status: 404 }
      );
    }

    if (client.userId !== user.id) {
      return NextResponse.json(
        { success: false, error: 'Obehörig åtkomst' },
        { status: 403 }
      );
    }

    // Check Norwegian Singles eligibility
    const singlesEligibility = await validateNorwegianSinglesEligibility(
      clientId,
      prisma
    );

    // Also check Norwegian Doubles eligibility for comparison
    let doublesEligibility;
    try {
      doublesEligibility = await validateNorwegianMethodEligibility(
        clientId,
        prisma
      );
    } catch (error) {
      // Doubles check might fail, that's OK
      doublesEligibility = null;
    }

    return NextResponse.json({
      success: true,
      data: {
        clientName: client.name,
        singles: singlesEligibility,
        doubles: doublesEligibility,
        recommendation: generateRecommendation(singlesEligibility, doublesEligibility)
      }
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    logger.error('[Norwegian Singles Eligibility] Error', { clientId: params.clientId }, error);
    return NextResponse.json(
      {
        success: false,
        error: errorMessage || 'Ett fel uppstod vid kontroll av behörighet'
      },
      { status: 500 }
    );
  }
}

/**
 * Generate recommendation based on eligibility for both methodologies
 */
function generateRecommendation(
  singles: any,
  doubles: any
): {
  methodology: 'NORWEGIAN_SINGLES' | 'NORWEGIAN' | 'OTHER';
  reasoning: string[];
  nextSteps: string[];
} {
  // If eligible for both
  if (singles.eligible && doubles?.eligible) {
    return {
      methodology: 'NORWEGIAN_SINGLES',
      reasoning: [
        '✅ Behörig för både Norwegian Singles och Norwegian Doubles',
        '💡 Norwegian Singles rekommenderas för de flesta idrottare',
        'Singles ger samma grundläggande fördelar med mindre tidskrav',
        'Doubles kräver 10+ timmar/vecka och dubbeldagssessioner'
      ],
      nextSteps: [
        'Välj Norwegian Singles om du har 5-9 timmar/vecka',
        'Välj Norwegian Doubles om du har 10+ timmar/vecka och laktatmätare',
        'Du kan börja med Singles och uppgradera till Doubles senare'
      ]
    };
  }

  // If eligible for singles only
  if (singles.eligible && !doubles?.eligible) {
    return {
      methodology: 'NORWEGIAN_SINGLES',
      reasoning: [
        '✅ Behörig för Norwegian Singles',
        '❌ Inte behörig för Norwegian Doubles ännu',
        'Singles är perfekt för hobbylöpare med jobb/familj',
        'Samma sub-tröskelträningsmål (2.3-3.0 mmol/L)'
      ],
      nextSteps: [
        'Starta Norwegian Singles-program',
        'Bygg volym och erfarenhet under 6-12 månader',
        'Omvärdera för Doubles när volym når 60+ km/vecka',
        'Laktatmätare INTE nödvändig för Singles (puls/tempo/RPE fungerar)'
      ]
    };
  }

  // If not eligible for singles (means not enough base)
  if (!singles.eligible) {
    const criticalUnmet = singles.requirements.filter(
      (r: any) => r.severity === 'CRITICAL' && !r.met
    );

    return {
      methodology: 'OTHER',
      reasoning: [
        '❌ Inte behörig för Norwegian Singles ännu',
        ...criticalUnmet.map((r: any) => `Missing: ${r.message}`),
        'Norwegian Singles kräver solid aerob bas (40+ km/vecka)',
        'Behöver minst 1 års konsekvent träning'
      ],
      nextSteps: [
        'Bygg aerob bas med polariserad träning',
        'Målsätt 40+ km/vecka hållbar volym',
        'Fokusera på lätta löpningar + 1-2 intervallpass/vecka',
        'Genomför fälttester (20-min eller 30-min TT)',
        'Omvärdera efter 8-12 veckor basträning'
      ]
    };
  }

  return {
    methodology: 'OTHER',
    reasoning: ['Kontakta tränare för personlig bedömning'],
    nextSteps: ['Genomför tester för att etablera träningszoner']
  };
}
