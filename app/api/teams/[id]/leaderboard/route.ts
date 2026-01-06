/**
 * Team Ergometer Leaderboard API
 *
 * GET - Fetch team leaderboard for ergometer tests
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createClient } from '@/lib/supabase/server';
import { ErgometerType, ErgometerTestProtocol } from '@prisma/client';
import {
  calculateLeaderboard,
  AthleteTestResult,
} from '@/lib/training-engine/ergometer/leaderboards/leaderboard-calculator';
import { logger } from '@/lib/logger';

type RouteParams = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id: teamId } = await params;
    const { searchParams } = new URL(request.url);

    // Parse query params
    const ergometerType = searchParams.get('ergometerType') as ErgometerType | null;
    const testProtocol = searchParams.get('testProtocol') as ErgometerTestProtocol | null;
    const sortMetric = (searchParams.get('sortMetric') as 'power' | 'pace' | 'time' | 'watts_per_kg') || 'power';

    // Verify team ownership
    const team = await prisma.team.findFirst({
      where: {
        id: teamId,
        userId: user.id,
      },
      include: {
        members: {
          select: {
            id: true,
            name: true,
            gender: true,
            weight: true,
          },
        },
      },
    });

    if (!team) {
      return NextResponse.json(
        { success: false, error: 'Team not found' },
        { status: 404 }
      );
    }

    const memberIds = team.members.map((m: { id: string }) => m.id);

    if (memberIds.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          leaderboards: [],
          teamStats: {
            totalMembers: 0,
            testedMembers: 0,
          },
        },
      });
    }

    // Fetch all ergometer tests for team members
    const tests = await prisma.ergometerFieldTest.findMany({
      where: {
        clientId: { in: memberIds },
        valid: true,
        ...(ergometerType && { ergometerType }),
        ...(testProtocol && { testProtocol }),
      },
      orderBy: { testDate: 'desc' },
      include: {
        client: {
          select: {
            id: true,
            name: true,
            gender: true,
            weight: true,
          },
        },
      },
    });

    // Transform tests to leaderboard format
    const testResults: AthleteTestResult[] = tests.map((test) => ({
      id: test.id,
      clientId: test.clientId,
      clientName: test.client.name,
      clientWeight: test.client.weight ?? undefined,
      clientGender: test.client.gender ?? undefined,
      ergometerType: test.ergometerType,
      testProtocol: test.testProtocol,
      testDate: test.testDate,
      avgPower: test.avgPower,
      avgPace: test.avgPace,
      totalTime: test.totalTime,
      criticalPower: test.criticalPower,
    }));

    // If specific ergometer/protocol requested, return single leaderboard
    if (ergometerType && testProtocol) {
      const leaderboard = calculateLeaderboard(
        testResults,
        ergometerType,
        testProtocol,
        sortMetric,
        team.members.length
      );

      return NextResponse.json({
        success: true,
        data: {
          leaderboard,
          teamStats: {
            totalMembers: team.members.length,
            testedMembers: leaderboard.entries.length,
          },
        },
      });
    }

    // Otherwise, return leaderboards for all available combinations
    const ergometerProtocolCombos = [
      ...new Set(tests.map((t) => `${t.ergometerType}|${t.testProtocol}`)),
    ];

    const leaderboards = ergometerProtocolCombos.map((combo) => {
      const [erg, protocol] = combo.split('|') as [ErgometerType, ErgometerTestProtocol];
      return calculateLeaderboard(
        testResults,
        erg,
        protocol,
        sortMetric,
        team.members.length
      );
    });

    // Sort by most popular (most entries)
    leaderboards.sort((a, b) => b.entries.length - a.entries.length);

    return NextResponse.json({
      success: true,
      data: {
        leaderboards,
        teamStats: {
          totalMembers: team.members.length,
          testedMembers: new Set(tests.map((t) => t.clientId)).size,
        },
      },
    });
  } catch (error) {
    logger.error('Error fetching team leaderboard', {}, error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch leaderboard' },
      { status: 500 }
    );
  }
}
