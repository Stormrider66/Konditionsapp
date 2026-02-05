/**
 * AI Save Program API
 *
 * POST /api/ai/save-program - Save an AI-generated training program to the database
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireCoach } from '@/lib/auth-utils';
import { prisma } from '@/lib/prisma';
import { parseAIProgram, convertToDbFormat, validateProgramCompleteness } from '@/lib/ai/program-parser';
import { rateLimitJsonResponse } from '@/lib/api/rate-limit';
import { logger } from '@/lib/logger'

type ProgramType = 'MAIN' | 'COMPLEMENTARY';
type ExistingProgramAction = 'KEEP' | 'DEACTIVATE' | 'REPLACE';

interface SaveProgramRequest {
  aiOutput: string;
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
    const user = await requireCoach();

    const rateLimited = await rateLimitJsonResponse('ai:save-program', user.id, {
      limit: 10,
      windowSeconds: 60,
    })
    if (rateLimited) return rateLimited

    const body: SaveProgramRequest = await request.json();
    const {
      aiOutput,
      clientId,
      conversationId,
      programType = 'MAIN',
      existingProgramAction,
      startDate: startDateStr,
      notifyAthlete = false,
    } = body;

    // Parse start date if provided
    const customStartDate = startDateStr ? new Date(startDateStr) : undefined;

    if (!aiOutput || !clientId) {
      return NextResponse.json(
        { error: 'Missing required fields: aiOutput, clientId' },
        { status: 400 }
      );
    }

    // Verify coach has access to this client
    const client = await prisma.client.findFirst({
      where: { id: clientId, userId: user.id },
    });

    if (!client) {
      return NextResponse.json(
        { error: 'Client not found or access denied' },
        { status: 404 }
      );
    }

    // Parse the AI output
    const parseResult = parseAIProgram(aiOutput);
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

    // Validate program completeness
    const validation = validateProgramCompleteness(parseResult.program);
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
      parseResult.program,
      clientId,
      user.id,
      customStartDate // Pass custom start date
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

      // Create the training program
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
        },
      });

      // Create weeks with days and workouts
      for (const weekData of weeksData) {
        const week = await tx.trainingWeek.create({
          data: {
            programId: program.id,
            weekNumber: weekData.weekNumber,
            startDate: weekData.startDate,
            endDate: weekData.endDate,
            phase: weekData.phase,
            focus: weekData.focus,
            notes: weekData.notes,
          },
        });

        for (const dayData of weekData.daysData) {
          const day = await tx.trainingDay.create({
            data: {
              weekId: week.id,
              dayNumber: dayData.dayNumber,
              date: dayData.date,
            },
          });

          // Create workouts for this day
          for (const workout of dayData.plannedWorkouts) {
            const createdWorkout = await tx.workout.create({
              data: {
                dayId: day.id,
                name: workout.name,
                type: workout.type,
                intensity: workout.intensity,
                duration: workout.duration,
                description: workout.description,
              },
            });

            // Create workout segments if any
            if (workout.segments) {
              for (const segment of workout.segments) {
                await tx.workoutSegment.create({
                  data: {
                    workoutId: createdWorkout.id,
                    order: segment.order,
                    type: segment.type,
                    duration: segment.duration,
                    zone: segment.zone,
                    description: segment.description,
                  },
                });
              }
            }
          }
        }
      }

      // Link to AI conversation if provided
      if (conversationId) {
        // Verify conversation exists before creating the link
        const conversation = await tx.aIConversation.findUnique({
          where: { id: conversationId },
          select: { id: true },
        });
        if (conversation) {
          await tx.aIGeneratedProgram.create({
            data: {
              conversationId,
              programId: program.id,
              programJson: (parseResult.rawJson ?? {}) as object,
              isSaved: true,
            },
          });
        }
      }

      return program;
    }, { timeout: 30000 });

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

    // Send notification to athlete if requested
    let notificationSent = false;
    if (notifyAthlete) {
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
              senderId: user.id,
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
