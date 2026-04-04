import { NextRequest, NextResponse } from 'next/server'
import { requireCoach } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'
import { sendBroadcast } from '@/lib/broadcast/send-broadcast'

export async function GET() {
  try {
    const user = await requireCoach()

    const membership = await prisma.businessMember.findFirst({
      where: { userId: user.id, isActive: true },
      select: { businessId: true },
    })

    if (!membership) {
      return NextResponse.json({ posts: [] })
    }

    const posts = await prisma.communityPost.findMany({
      where: { businessId: membership.businessId },
      select: {
        id: true,
        content: true,
        mediaUrl: true,
        type: true,
        isPinned: true,
        likesCount: true,
        commentsCount: true,
        createdAt: true,
        author: { select: { id: true, name: true } },
        comments: {
          select: {
            id: true,
            content: true,
            createdAt: true,
            author: { select: { id: true, name: true } },
          },
          orderBy: { createdAt: 'asc' },
          take: 5,
        },
      },
      orderBy: [{ isPinned: 'desc' }, { createdAt: 'desc' }],
      take: 30,
    })

    return NextResponse.json({ posts, currentUserId: user.id })
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireCoach()
    const body = await request.json()

    const membership = await prisma.businessMember.findFirst({
      where: { userId: user.id, isActive: true },
      select: { businessId: true },
    })

    if (!membership) {
      return NextResponse.json({ error: 'No business' }, { status: 400 })
    }

    if (body.action === 'comment') {
      const comment = await prisma.communityComment.create({
        data: {
          postId: body.postId,
          authorId: user.id,
          content: body.content,
        },
      })

      // Update comment count
      await prisma.communityPost.update({
        where: { id: body.postId },
        data: { commentsCount: { increment: 1 } },
      })

      return NextResponse.json({ comment })
    }

    if (body.action === 'like') {
      const existing = await prisma.communityLike.findUnique({
        where: { postId_userId: { postId: body.postId, userId: user.id } },
      })

      if (existing) {
        await prisma.communityLike.delete({ where: { id: existing.id } })
        await prisma.communityPost.update({
          where: { id: body.postId },
          data: { likesCount: { decrement: 1 } },
        })
        return NextResponse.json({ liked: false })
      } else {
        await prisma.communityLike.create({
          data: { postId: body.postId, userId: user.id },
        })
        await prisma.communityPost.update({
          where: { id: body.postId },
          data: { likesCount: { increment: 1 } },
        })
        return NextResponse.json({ liked: true })
      }
    }

    // Default: create post
    const notifyInApp = body.notifyInApp || false
    const notifyEmail = body.notifyEmail || false
    const notifySMS = body.notifySMS || false

    const post = await prisma.communityPost.create({
      data: {
        businessId: membership.businessId,
        authorId: user.id,
        content: body.content,
        mediaUrl: body.mediaUrl || null,
        type: body.type || 'GENERAL',
        isPinned: body.isPinned || false,
        teamId: body.teamId || null,
        notifyInApp,
        notifyEmail,
        notifySMS,
      },
      select: {
        id: true,
        content: true,
        type: true,
        createdAt: true,
        author: { select: { name: true } },
      },
    })

    // Send broadcast notifications if any delivery method is enabled
    if (notifyInApp || notifyEmail || notifySMS) {
      // Fire and forget - don't block the response
      sendBroadcast({
        postId: post.id,
        businessId: membership.businessId,
        teamId: body.teamId || null,
        authorName: post.author.name || 'Coach',
        title: body.type === 'ANNOUNCEMENT' ? 'Nytt meddelande' : '',
        message: body.content,
        type: body.type || 'GENERAL',
        notifyInApp,
        notifyEmail,
        notifySMS,
      }).catch((err) => console.error('Broadcast error:', err))
    }

    return NextResponse.json({ post })
  } catch {
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
