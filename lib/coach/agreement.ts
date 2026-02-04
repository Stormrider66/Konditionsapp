// lib/coach/agreement.ts
// Coach marketplace agreement handling logic

import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'

/**
 * Accept a coach request and create a coaching agreement
 * This is called when a coach accepts an athlete's connection request
 */
export async function acceptCoachRequest(
  requestId: string,
  coachUserId: string,
  options?: {
    response?: string
    programAction?: 'KEPT' | 'MODIFIED' | 'REPLACED'
  }
) {
  // Get the request and verify ownership
  const request = await prisma.coachRequest.findUnique({
    where: { id: requestId },
    include: {
      athlete: {
        include: {
          athleteSubscription: true,
        },
      },
    },
  })

  if (!request) {
    throw new Error('Coach request not found')
  }

  if (request.coachUserId !== coachUserId) {
    throw new Error('Unauthorized: not your request')
  }

  if (request.status !== 'PENDING') {
    throw new Error(`Cannot accept request with status: ${request.status}`)
  }

  // Check if request has expired
  if (request.expiresAt < new Date()) {
    await prisma.coachRequest.update({
      where: { id: requestId },
      data: { status: 'EXPIRED' },
    })
    throw new Error('Request has expired')
  }

  // Calculate revenue share start date (next billing cycle)
  // For now, we default to the start of next month
  const now = new Date()
  const revenueShareStartDate = new Date(now.getFullYear(), now.getMonth() + 1, 1)

  // Use a transaction to ensure data consistency
  const result = await prisma.$transaction(async (tx) => {
    // 1. Update request status
    const updatedRequest = await tx.coachRequest.update({
      where: { id: requestId },
      data: {
        status: 'ACCEPTED',
        coachResponse: options?.response,
        respondedAt: new Date(),
      },
    })

    // 2. Create coaching agreement
    const agreement = await tx.coachAgreement.create({
      data: {
        athleteClientId: request.athleteClientId,
        coachUserId: coachUserId,
        status: 'ACTIVE',
        revenueSharePercent: 75, // Coach gets 75%
        revenueShareStartDate,
        programAction: options?.programAction,
      },
    })

    // 3. Update the Client.userId to the new coach
    // This is the key step that "assigns" the athlete to this coach
    await tx.client.update({
      where: { id: request.athleteClientId },
      data: {
        userId: coachUserId,
      },
    })

    // 4. Update AthleteSubscription with assigned coach info
    if (request.athlete.athleteSubscription) {
      await tx.athleteSubscription.update({
        where: { clientId: request.athleteClientId },
        data: {
          assignedCoachId: coachUserId,
          coachRevenueSharePercent: 75,
          coachRevenueShareStartDate: revenueShareStartDate,
        },
      })
    }

    return { request: updatedRequest, agreement }
  })

  logger.info('Coach request accepted', {
    requestId,
    coachUserId,
    athleteClientId: request.athleteClientId,
  })

  return result
}

/**
 * Reject a coach request
 */
export async function rejectCoachRequest(
  requestId: string,
  coachUserId: string,
  response?: string
) {
  const request = await prisma.coachRequest.findUnique({
    where: { id: requestId },
  })

  if (!request) {
    throw new Error('Coach request not found')
  }

  if (request.coachUserId !== coachUserId) {
    throw new Error('Unauthorized: not your request')
  }

  if (request.status !== 'PENDING') {
    throw new Error(`Cannot reject request with status: ${request.status}`)
  }

  const updatedRequest = await prisma.coachRequest.update({
    where: { id: requestId },
    data: {
      status: 'REJECTED',
      coachResponse: response,
      respondedAt: new Date(),
    },
  })

  logger.info('Coach request rejected', { requestId, coachUserId })

  return updatedRequest
}

/**
 * End a coaching agreement
 */
export async function endCoachAgreement(
  agreementId: string,
  endedByUserId: string,
  reason?: string
) {
  const agreement = await prisma.coachAgreement.findUnique({
    where: { id: agreementId },
    include: {
      athlete: {
        include: {
          athleteSubscription: true,
        },
      },
    },
  })

  if (!agreement) {
    throw new Error('Agreement not found')
  }

  // Allow either the coach or the athlete (via their account) to end it
  // For now, we just check that it's active
  if (agreement.status !== 'ACTIVE') {
    throw new Error(`Cannot end agreement with status: ${agreement.status}`)
  }

  const result = await prisma.$transaction(async (tx) => {
    // 1. End the agreement
    const endedAgreement = await tx.coachAgreement.update({
      where: { id: agreementId },
      data: {
        status: 'ENDED',
        endedAt: new Date(),
        endReason: reason,
      },
    })

    // 2. Clear the assigned coach from the subscription
    if (agreement.athlete.athleteSubscription) {
      await tx.athleteSubscription.update({
        where: { clientId: agreement.athleteClientId },
        data: {
          assignedCoachId: null,
          coachRevenueSharePercent: null,
          coachRevenueShareStartDate: null,
        },
      })
    }

    // Note: We don't change Client.userId here - the athlete may want to
    // keep their data with the coach or transfer it elsewhere.
    // This is a business decision that should be handled separately.

    return endedAgreement
  })

  logger.info('Coach agreement ended', { agreementId, endedByUserId, reason })

  return result
}

/**
 * Create a coach request from an athlete to a coach
 */
export async function createCoachRequest(
  athleteClientId: string,
  coachUserId: string,
  message?: string
) {
  // Check if athlete already has a pending request to this coach
  const existingRequest = await prisma.coachRequest.findUnique({
    where: {
      athleteClientId_coachUserId: {
        athleteClientId,
        coachUserId,
      },
    },
  })

  if (existingRequest) {
    if (existingRequest.status === 'PENDING') {
      throw new Error('You already have a pending request to this coach')
    }
    if (existingRequest.status === 'ACCEPTED') {
      throw new Error('You are already connected with this coach')
    }
  }

  // Check if athlete already has an active agreement with any coach
  const activeAgreement = await prisma.coachAgreement.findFirst({
    where: {
      athleteClientId,
      status: 'ACTIVE',
    },
  })

  if (activeAgreement) {
    throw new Error('You already have an active coach. End that agreement first.')
  }

  // Check if coach is accepting clients
  const coachProfile = await prisma.coachProfile.findUnique({
    where: { userId: coachUserId },
  })

  if (!coachProfile?.isAcceptingClients) {
    throw new Error('This coach is not currently accepting new clients')
  }

  // Create the request with 14-day expiration
  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + 14)

  // Upsert to handle the case where there was a previous rejected/expired request
  const request = await prisma.coachRequest.upsert({
    where: {
      athleteClientId_coachUserId: {
        athleteClientId,
        coachUserId,
      },
    },
    create: {
      athleteClientId,
      coachUserId,
      message,
      expiresAt,
      status: 'PENDING',
    },
    update: {
      message,
      expiresAt,
      status: 'PENDING',
      coachResponse: null,
      respondedAt: null,
      requestedAt: new Date(),
    },
  })

  logger.info('Coach request created', { athleteClientId, coachUserId })

  return request
}

/**
 * Cancel a coach request (by athlete)
 */
export async function cancelCoachRequest(
  requestId: string,
  athleteClientId: string
) {
  const request = await prisma.coachRequest.findUnique({
    where: { id: requestId },
  })

  if (!request) {
    throw new Error('Request not found')
  }

  if (request.athleteClientId !== athleteClientId) {
    throw new Error('Unauthorized: not your request')
  }

  if (request.status !== 'PENDING') {
    throw new Error('Can only cancel pending requests')
  }

  return prisma.coachRequest.update({
    where: { id: requestId },
    data: { status: 'CANCELLED' },
  })
}

/**
 * Update coach profile statistics
 * Should be called when clients are added/removed or reviews are submitted
 */
export async function updateCoachProfileStats(coachUserId: string) {
  const profile = await prisma.coachProfile.findUnique({
    where: { userId: coachUserId },
  })

  if (!profile) return

  // Count active agreements
  const activeClients = await prisma.coachAgreement.count({
    where: {
      coachUserId,
      status: 'ACTIVE',
    },
  })

  // Count total clients (all time)
  const totalClients = await prisma.coachAgreement.count({
    where: {
      coachUserId,
    },
  })

  // Calculate average rating
  const reviews = await prisma.coachReview.aggregate({
    where: {
      coachProfileId: profile.id,
      isPublic: true,
    },
    _avg: {
      rating: true,
    },
    _count: true,
  })

  await prisma.coachProfile.update({
    where: { id: profile.id },
    data: {
      activeClients,
      totalClients,
      averageRating: reviews._avg.rating,
      reviewCount: reviews._count,
    },
  })
}
