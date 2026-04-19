import { prisma } from './db'

type NotificationTypeEnum =
  | 'SCAN_COMPLETED'
  | 'ALERT_TRIGGERED'
  | 'COMPETITOR_APPEARED'
  | 'SCORE_DRIFT'
  | 'OBJECTIVE_REACHED'
  | 'CREDITS_LOW'
  | 'BILLING_ISSUE'
  | 'TEAM_INVITE'
  | 'REFERRAL_REWARD'
  | 'SYSTEM'

export interface NotificationInput {
  type: NotificationTypeEnum
  title: string
  body: string
  link?: string
  iconKey?: string
}

/**
 * Create an in-app notification. Fire-and-forget: errors logged, never re-thrown.
 * Also respects user preferences: if muted or digest mode, still creates row but skips real-time dispatch.
 */
export async function createNotification(
  userId: string,
  input: NotificationInput
): Promise<void> {
  try {
    await prisma.notification.create({
      data: {
        userId,
        type: input.type,
        title: input.title,
        body: input.body,
        link: input.link,
        iconKey: input.iconKey,
      },
    })
  } catch (err) {
    console.error('[notifications] Failed to create:', err)
  }
}

export async function markAllRead(userId: string): Promise<void> {
  await prisma.notification.updateMany({
    where: { userId, read: false },
    data: { read: true },
  })
}

export async function unreadCount(userId: string): Promise<number> {
  return prisma.notification.count({ where: { userId, read: false } })
}
