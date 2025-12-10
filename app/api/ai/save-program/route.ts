/**
 * AI Save Program API
 *
 * POST /api/ai/save-program - Save an AI-generated training program to the database
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireCoach } from '@/lib/auth-utils';
import { prisma } from '@/lib/prisma';
import { parseAIProgram, convertToDbFormat, validateProgramCompleteness } from '@/lib/ai/program-parser';

interface SaveProgramRequest {
  aiOutput: string;
  clientId: string;
  conversationId?: string;
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireCoach();

    const body: SaveProgramRequest = await request.json();
    const { aiOutput, clientId, conversationId } = body;

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
      user.id
    );

    // Save to database in a transaction
    const savedProgram = await prisma.$transaction(async (tx) => {
      // Create the training program
      const program = await tx.trainingProgram.create({
        data: {
          name: programData.name,
          description: programData.description,
          clientId: programData.clientId,
          coachId: programData.coachId,
          startDate: programData.startDate,
          endDate: programData.endDate,
          goalType: programData.goalType,
          generatedFromTest: false,
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
        await tx.aIGeneratedProgram.create({
          data: {
            conversationId,
            programId: program.id,
            programJson: parseResult.rawJson as object,
            isSaved: true,
          },
        });
      }

      return program;
    });

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

    return NextResponse.json({
      success: true,
      program: programWithDetails,
      warnings: validation.warnings,
      message: `Program "${savedProgram.name}" saved successfully with ${weeksData.length} weeks`,
    });
  } catch (error) {
    console.error('Save program error:', error);

    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    return NextResponse.json(
      {
        error: 'Failed to save program',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
