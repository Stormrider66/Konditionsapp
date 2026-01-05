/**
 * Athlete Team Rank API
 *
 * GET - Get athlete's rank within their team(s) for ergometer tests
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAthlete, canAccessClient } from '@/lib/auth-utils';
import { ErgometerType, ErgometerTestProtocol } from '@prisma/client';
import {
  calculateLeaderboard,
  getAthleteRank,
  getNearbyAthletes,
  calculateGapToRank,
  AthleteTestResult,
} from '@/lib/training-engine/ergometer/leaderboards/leaderboard-calculator';

export async function GET(request: NextRequest) {
  try {
    const user = await requireAthlete();
    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get('clientId');

    if (!clientId) {
      return NextResponse.json(
        { error: 'clientId is required' },
        { status: 400 }
      );
    }

    // Verify athlete has access to this client
    const hasAccess = await canAccessClient(user.id, clientId);
    if (!hasAccess) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Find all teams the athlete is a member of
    const client = await prisma.client.findUnique({
      where: { id: clientId },
      include: {
        teams: {
          include: {
            members: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                gender: true,
                weight: true,
              },
            },
          },
        },
      },
    });

    if (!client || !client.teams || client.teams.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          rankings: [],
          message: 'Du ar inte medlem i nagot lag',
        },
      });
    }

    // Collect rankings across all teams
    const rankings: Array<{
      teamId: string;
      teamName: string;
      ergometerType: ErgometerType;
      testProtocol: ErgometerTestProtocol;
      rank: number;
      totalAthletes: number;
      percentile: number;
      value: number;
      valueFormatted: string;
      tier: string;
      gapToLeader: string | null;
      nearby: {
        above: Array<{ rank: number; name: string; value: string }>;
        below: Array<{ rank: number; name: string; value: string }>;
      };
    }> = [];

    for (const team of client.teams) {
      const memberIds = team.members.map((m) => m.id);

      // Fetch all ergometer tests for team members
      const tests = await prisma.ergometerFieldTest.findMany({
        where: {
          clientId: { in: memberIds },
          valid: true,
        },
        include: {
          client: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              gender: true,
              weight: true,
            },
          },
        },
      });

      // Transform to leaderboard format
      const testResults: AthleteTestResult[] = tests.map((test) => ({
        id: test.id,
        clientId: test.clientId,
        clientName: `${test.client.firstName} ${test.client.lastName}`,
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

      // Get unique ergometer/protocol combinations
      const combos = [...new Set(tests.map((t) => `${t.ergometerType}|${t.testProtocol}`))];

      for (const combo of combos) {
        const [erg, protocol] = combo.split('|') as [ErgometerType, ErgometerTestProtocol];

        const leaderboard = calculateLeaderboard(
          testResults,
          erg,
          protocol,
          'power',
          team.members.length
        );

        const athleteRank = getAthleteRank(leaderboard, clientId);

        if (athleteRank) {
          const nearbyAthletes = getNearbyAthletes(leaderboard, clientId, 2);
          const gapToLeader = calculateGapToRank(leaderboard, clientId, 1);

          rankings.push({
            teamId: team.id,
            teamName: team.name,
            ergometerType: erg,
            testProtocol: protocol,
            rank: athleteRank.rank,
            totalAthletes: leaderboard.entries.length,
            percentile: athleteRank.percentile,
            value: athleteRank.value,
            valueFormatted: athleteRank.valueFormatted,
            tier: athleteRank.tier,
            gapToLeader: gapToLeader ? gapToLeader.gapFormatted : null,
            nearby: {
              above: nearbyAthletes.above.map((e) => ({
                rank: e.rank,
                name: e.athleteName,
                value: e.valueFormatted,
              })),
              below: nearbyAthletes.below.map((e) => ({
                rank: e.rank,
                name: e.athleteName,
                value: e.valueFormatted,
              })),
            },
          });
        }
      }
    }

    // Sort by rank (best first)
    rankings.sort((a, b) => a.rank - b.rank);

    return NextResponse.json({
      success: true,
      data: { rankings },
    });
  } catch (error) {
    console.error('Error fetching team rank:', error);
    return NextResponse.json(
      { error: 'Failed to fetch team rank' },
      { status: 500 }
    );
  }
}
