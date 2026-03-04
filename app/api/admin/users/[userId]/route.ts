// app/api/admin/users/[userId]/route.ts
// Admin API for deleting a user and all associated data

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth-utils';
import { createAdminSupabaseClient } from '@/lib/supabase/admin';
import { logger } from '@/lib/logger';
import { logAuditEvent, getIpFromRequest, getUserAgentFromRequest } from '@/lib/audit/log';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const adminUser = await requireAdmin();
    const { userId } = await params;

    // Prevent self-deletion
    if (userId === adminUser.id) {
      return NextResponse.json(
        { success: false, error: 'Du kan inte ta bort ditt eget konto' },
        { status: 400 }
      );
    }

    // Verify target user exists
    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, name: true, role: true },
    });

    if (!targetUser) {
      return NextResponse.json(
        { success: false, error: 'Användaren hittades inte' },
        { status: 404 }
      );
    }

    // Delete all non-cascading relations in a transaction, then the user
    await prisma.$transaction(async (tx) => {
      // Leaf-level relations first
      await tx.careTeamMessage.deleteMany({ where: { senderId: userId } });
      await tx.careTeamParticipant.deleteMany({ where: { userId } });
      await tx.careTeamThread.deleteMany({ where: { createdById: userId } });
      await tx.teamWorkoutBroadcast.deleteMany({ where: { coachId: userId } });
      await tx.sportTest.deleteMany({ where: { userId } });
      await tx.acuteInjuryReport.deleteMany({ where: { reporterId: userId } });
      await tx.message.deleteMany({
        where: { OR: [{ senderId: userId }, { receiverId: userId }] },
      });
      await tx.videoAnalysis.deleteMany({ where: { coachId: userId } });
      await tx.strengthTemplate.deleteMany({ where: { coachId: userId } });
      await tx.trainingRestriction.deleteMany({ where: { createdById: userId } });

      // Mid-level: programs and tests created by this user
      await tx.trainingProgram.deleteMany({ where: { coachId: userId } });
      await tx.test.deleteMany({ where: { userId } });

      // Top-level: clients, teams, organizations
      await tx.client.deleteMany({ where: { userId } });
      await tx.team.deleteMany({ where: { userId } });
      await tx.organization.deleteMany({ where: { userId } });

      // Delete the user record (cascading relations handle the rest)
      await tx.user.delete({ where: { id: userId } });
    });

    // Delete Supabase Auth user (after DB cleanup so we don't orphan DB records on auth failure)
    try {
      const supabaseAdmin = createAdminSupabaseClient();
      await supabaseAdmin.auth.admin.deleteUser(userId);
    } catch (authError) {
      // Log but don't fail - DB records are already cleaned up
      logger.error('Failed to delete Supabase auth user (DB records already removed)', { userId }, authError);
    }

    // Audit log
    await logAuditEvent({
      action: 'USER_DELETED',
      userId: adminUser.id,
      targetId: userId,
      targetType: 'User',
      oldValue: { email: targetUser.email, name: targetUser.name, role: targetUser.role },
      newValue: null,
      ipAddress: getIpFromRequest(request),
      userAgent: getUserAgentFromRequest(request),
    });

    return NextResponse.json({
      success: true,
      message: `Användaren ${targetUser.email} har tagits bort`,
    });
  } catch (error) {
    logger.error('Error deleting user', {}, error);
    return NextResponse.json(
      { success: false, error: 'Kunde inte ta bort användaren. Kontrollera att inga beroenden blockerar.' },
      { status: 500 }
    );
  }
}
