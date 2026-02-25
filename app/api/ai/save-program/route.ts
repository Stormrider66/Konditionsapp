/**
 * AI Save Program API
 *
 * POST /api/ai/save-program - Save an AI-generated training program to the database
 *
 * Supports both coach auth (requireCoach) and athlete auth (resolveAthleteClientId).
 * Athletes can pass `mergedProgram` directly (from the orchestrator) to skip re-parsing.
 */

import { NextRequest, NextResponse } from 'next/server';
import { canAccessClient, requireCoach, resolveAthleteClientId } from '@/lib/auth-utils';
import { prisma } from '@/lib/prisma';
import { parseAIProgram, convertToDbFormat, validateProgramCompleteness } from '@/lib/ai/program-parser';
import { generateProgramInfographic, parsedProgramToInfographicData } from '@/lib/ai/program-infographic';
import { rateLimitJsonResponse } from '@/lib/api/rate-limit';
import { logger } from '@/lib/logger'
import type { MergedProgram } from '@/lib/ai/program-generator'

type ProgramType = 'MAIN' | 'COMPLEMENTARY';
type ExistingProgramAction = 'KEEP' | 'DEACTIVATE' | 'REPLACE';

interface SaveProgramRequest {
  aiOutput?: string;
  mergedProgram?: MergedProgram;
  clientId: string;
  conversationId?: string;
  // New publish options
  programType?: ProgramType;
  existingProgramAction?: ExistingProgramAction;
  startDate?: string; // ISO date string
  notifyAthlete?: boolean;
}

export async function POST(request: NextRequest) {
  try {
    // Dual auth: try coach first, then athlete
    let coachUserId: string;
    let isAthleteAuth = false;
    let athleteClientId: string | undefined;

    try {
      const user = await requireCoach();
      coachUserId = user.id;
    } catch {
      // Fallback: try athlete auth
      const resolved = await resolveAthleteClientId();
      if (!resolved) {
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 401 }
        );
      }
      isAthleteAuth = true;
      athleteClientId = resolved.clientId;

      // Get the coach user ID from the client record
      const clientRecord = await prisma.client.findUnique({
        where: { id: resolved.clientId },
        select: { userId: true },
      });
      if (!clientRecord?.userId) {
        return NextResponse.json(
          { error: 'Athlete account not properly linked' },
          { status: 400 }
        );
      }
      coachUserId = clientRecord.userId;
    }

    const rateLimited = await rateLimitJsonResponse('ai:save-program', coachUserId, {
      limit: 10,
      windowSeconds: 60,
    })
    if (rateLimited) return rateLimited

    const body: SaveProgramRequest = await request.json();
    const {
      aiOutput,
      mergedProgram: mergedProgramInput,
      clientId,
      conversationId,
      programType = 'MAIN',
      existingProgramAction,
      startDate: startDateStr,
      notifyAthlete = false,
    } = body;

    // Parse start date if provided
    const customStartDate = startDateStr ? new Date(startDateStr) : undefined;

    // Athlete auth: verify clientId matches their own
    if (isAthleteAuth && clientId !== athleteClientId) {
      return NextResponse.json(
        { error: 'Access denied: clientId mismatch' },
        { status: 403 }
      );
    }

    // Need either aiOutput or mergedProgram
    if (!mergedProgramInput && !aiOutput) {
      return NextResponse.json(
        { error: 'Missing required fields: aiOutput or mergedProgram' },
        { status: 400 }
      );
    }

    if (!clientId) {
      return NextResponse.json(
        { error: 'Missing required field: clientId' },
        { status: 400 }
      );
    }

    // Coach auth: verify access to client
    if (!isAthleteAuth) {
      const hasAccess = await canAccessClient(coachUserId, clientId)
      if (!hasAccess) {
        return NextResponse.json(
          { error: 'Client not found or access denied' },
          { status: 404 }
        );
      }
    }

    // Build the parsed program — either from mergedProgram or by parsing aiOutput
    let parsedProgram: ReturnType<typeof parseAIProgram>['program'];
    let rawJson: object | undefined;

    if (mergedProgramInput) {
      // mergedProgram comes directly from the orchestrator — convert to ParsedProgram format
      parsedProgram = {
        name: mergedProgramInput.name,
        description: mergedProgramInput.description,
        totalWeeks: mergedProgramInput.totalWeeks,
        methodology: mergedProgramInput.methodology,
        weeklySchedule: mergedProgramInput.weeklySchedule
          ? {
              sessionsPerWeek: mergedProgramInput.weeklySchedule.sessionsPerWeek,
              restDays: mergedProgramInput.weeklySchedule.restDays?.map(Number).filter(n => !isNaN(n)) || [],
            }
          : undefined,
        phases: mergedProgramInput.phases.map(phase => ({
          name: phase.name,
          weeks: phase.weeks,
          focus: phase.focus,
          weeklyTemplate: phase.weeklyTemplate as Record<string, unknown>,
          keyWorkouts: phase.keyWorkouts,
          volumeGuidance: phase.volumeGuidance,
        })),
      };
      rawJson = mergedProgramInput as unknown as object;
    } else {
      // Parse the AI output text
      const parseResult = parseAIProgram(aiOutput!);
      if (!parseResult.success || !parseResult.program) {
        return NextResponse.json(
          {
            error: 'Failed to parse AI output',
            details: parseResult.error,
            rawJson: parseResult.rawJson
          },
          { status: 400 }
        );
      }
      parsedProgram = parseResult.program;
      rawJson = (parseResult.rawJson ?? {}) as object;
    }

    // Validate program completeness
    const validation = validateProgramCompleteness(parsedProgram!);
    if (!validation.valid) {
      return NextResponse.json(
        {
          error: 'Program validation failed',
          errors: validation.errors,
          warnings: validation.warnings
        },
        { status: 400 }
      );
    }

    // Convert to database format
    const { programData, weeksData } = convertToDbFormat(
      parsedProgram!,
      clientId,
      coachUserId,
      customStartDate
    );

    // Save to database in a transaction (large programs create many rows)
    const savedProgram = await prisma.$transaction(async (tx) => {
      // Handle existing programs based on action
      if (existingProgramAction && existingProgramAction !== 'KEEP') {
        const existingPrograms = await tx.trainingProgram.findMany({
          where: { clientId, isActive: true },
        });

        for (const existing of existingPrograms) {
          if (existingProgramAction === 'DEACTIVATE') {
            await tx.trainingProgram.update({
              where: { id: existing.id },
              data: { isActive: false },
            });
          } else if (existingProgramAction === 'REPLACE') {
            // Delete the existing program (cascade will handle weeks/days/workouts)
            await tx.trainingProgram.delete({
              where: { id: existing.id },
            });
          }
        }
      }

      // Prepare description with program type info
      const descriptionWithType = programType === 'COMPLEMENTARY'
        ? `[Kompletterande] ${programData.description || ''}`
        : programData.description;

      // Create the entire program hierarchy in a single nested create
      const program = await tx.trainingProgram.create({
        data: {
          name: programData.name,
          description: descriptionWithType,
          clientId: programData.clientId,
          coachId: programData.coachId,
          startDate: customStartDate || programData.startDate,
          endDate: programData.endDate,
          goalType: programData.goalType,
          generatedFromTest: false,
          isActive: true,
          weeks: {
            create: weeksData.map((weekData) => ({
              weekNumber: weekData.weekNumber,
              startDate: weekData.startDate,
              endDate: weekData.endDate,
              phase: weekData.phase,
              focus: weekData.focus,
              notes: weekData.notes,
              days: {
                create: weekData.daysData.map((dayData) => ({
                  dayNumber: dayData.dayNumber,
                  date: dayData.date,
                  workouts: {
                    create: dayData.plannedWorkouts.map((workout) => ({
                      name: workout.name,
                      type: workout.type,
                      intensity: workout.intensity,
                      duration: workout.duration,
                      description: workout.description,
                      segments: workout.segments ? {
                        create: workout.segments.map((segment) => ({
                          order: segment.order,
                          type: segment.type,
                          duration: segment.duration,
                          zone: segment.zone,
                          description: segment.description,
                        })),
                      } : undefined,
                    })),
                  },
                })),
              },
            })),
          },
        },
      });

      // Link to AI conversation if provided
      if (conversationId) {
        const conversation = await tx.aIConversation.findUnique({
          where: { id: conversationId },
          select: { id: true },
        });
        if (conversation) {
          await tx.aIGeneratedProgram.create({
            data: {
              conversationId,
              programId: program.id,
              programJson: rawJson ?? {},
              isSaved: true,
            },
          });
        }
      }

      return program;
    }, { timeout: 15000 });

    // Fire-and-forget infographic generation (don't await, don't block response)
    if (parsedProgram) {
      generateProgramInfographic({
        programId: savedProgram.id,
        programData: parsedProgramToInfographicData(parsedProgram),
        coachId: coachUserId,
        locale: request.headers.get('accept-language')?.startsWith('sv') ? 'sv' : 'en',
      }).catch((err) => {
        logger.warn('Background infographic generation failed', { programId: savedProgram.id }, err)
      })
    }

    // Return the saved program with summary
    const programWithDetails = await prisma.trainingProgram.findUnique({
      where: { id: savedProgram.id },
      include: {
        client: {
          select: {
            id: true,
            name: true,
          },
        },
        weeks: {
          select: {
            id: true,
            weekNumber: true,
            phase: true,
          },
          orderBy: {
            weekNumber: 'asc',
          },
        },
        _count: {
          select: {
            weeks: true,
          },
        },
      },
    });

    // Send notification to athlete if requested (only for coach flow)
    let notificationSent = false;
    if (notifyAthlete && !isAthleteAuth) {
      try {
        // Check if athlete has an account
        const athleteAccount = await prisma.athleteAccount.findFirst({
          where: { clientId },
          include: { user: true },
        });

        if (athleteAccount?.user?.email) {
          // Create an in-app message notification
          await prisma.message.create({
            data: {
              senderId: coachUserId,
              receiverId: athleteAccount.userId,
              content: `Ett nytt träningsprogram har publicerats: "${savedProgram.name}". Gå till din dashboard för att se det.`,
              isRead: false,
            },
          });
          notificationSent = true;
        }
      } catch (notifyError) {
        logger.warn('Failed to send notification', { clientId }, notifyError)
        // Don't fail the request if notification fails
      }
    }

    return NextResponse.json({
      success: true,
      program: programWithDetails,
      warnings: validation.warnings,
      notificationSent,
      message: `Program "${savedProgram.name}" saved successfully with ${weeksData.length} weeks${
        notificationSent ? ' och atlet har meddelats' : ''
      }`,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    const prismaCode = (error as { code?: string })?.code
    const prismaMeta = (error as { meta?: unknown })?.meta
    logger.error('Save program error', { errorMessage, prismaCode, prismaMeta }, error)

    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    return NextResponse.json(
      {
        error: 'Failed to save program',
        message:
          process.env.NODE_ENV === 'production'
            ? 'Internal server error'
            : errorMessage,
      },
      { status: 500 }
    );
  }
}
