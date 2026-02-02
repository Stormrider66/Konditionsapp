/**
 * Audit Logging System
 *
 * Provides structured audit logging for security-sensitive operations.
 * Logs are stored in the database for compliance and security review.
 */

import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'

export type AuditAction =
  // User management
  | 'USER_ROLE_CHANGE'
  | 'USER_CREATE'
  | 'USER_DELETE'
  | 'USER_DEACTIVATE'
  | 'USER_REACTIVATE'
  // Authentication
  | 'LOGIN_SUCCESS'
  | 'LOGIN_FAILED'
  | 'LOGOUT'
  | 'PASSWORD_CHANGE'
  | 'PASSWORD_RESET_REQUEST'
  | 'MFA_ENABLED'
  | 'MFA_DISABLED'
  // Data access
  | 'DATA_EXPORT'
  | 'DATA_DELETE'
  | 'BULK_OPERATION'
  // Admin actions
  | 'ADMIN_ACCESS'
  | 'SETTINGS_CHANGE'
  | 'API_KEY_CREATE'
  | 'API_KEY_DELETE'
  | 'API_KEY_REGENERATE'
  // Business management
  | 'BUSINESS_CREATE'
  | 'BUSINESS_UPDATE'
  | 'BUSINESS_DELETE'
  | 'MEMBER_ADD'
  | 'MEMBER_REMOVE'
  | 'MEMBER_ROLE_CHANGE'
  // Subscription
  | 'SUBSCRIPTION_CHANGE'
  | 'PAYMENT_PROCESSED'
  | 'PAYMENT_FAILED'

export interface AuditLogEntry {
  action: AuditAction
  userId: string
  targetId?: string
  targetType?: string
  oldValue?: Record<string, unknown>
  newValue?: Record<string, unknown>
  metadata?: Record<string, unknown>
  ipAddress?: string
  userAgent?: string
}

/**
 * Log an audit event
 *
 * @param entry - The audit log entry
 * @returns The created audit log record
 */
export async function logAuditEvent(entry: AuditLogEntry): Promise<void> {
  try {
    // Log to structured logger first (immediate, non-blocking for observability)
    logger.info(`Audit: ${entry.action}`, {
      action: entry.action,
      userId: entry.userId,
      targetId: entry.targetId,
      targetType: entry.targetType,
      ipAddress: entry.ipAddress,
    })

    // Store in database for compliance
    await prisma.auditLog.create({
      data: {
        action: entry.action,
        userId: entry.userId,
        targetId: entry.targetId,
        targetType: entry.targetType,
        oldValue: entry.oldValue ?? undefined,
        newValue: entry.newValue ?? undefined,
        metadata: entry.metadata ?? undefined,
        ipAddress: entry.ipAddress,
        userAgent: entry.userAgent,
      },
    })
  } catch (error) {
    // Log error but don't throw - audit logging should not break operations
    logger.error('Failed to create audit log', {
      action: entry.action,
      userId: entry.userId,
    }, error)
  }
}

/**
 * Extract IP address from request headers
 */
export function getIpFromRequest(request: Request): string | undefined {
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) {
    return forwarded.split(',')[0].trim()
  }

  const realIp = request.headers.get('x-real-ip')
  if (realIp) {
    return realIp
  }

  return undefined
}

/**
 * Extract user agent from request headers
 */
export function getUserAgentFromRequest(request: Request): string | undefined {
  return request.headers.get('user-agent') ?? undefined
}

/**
 * Log a user role change
 */
export async function logRoleChange(
  userId: string,
  targetUserId: string,
  oldRole: string,
  newRole: string,
  request?: Request
): Promise<void> {
  await logAuditEvent({
    action: 'USER_ROLE_CHANGE',
    userId,
    targetId: targetUserId,
    targetType: 'User',
    oldValue: { role: oldRole },
    newValue: { role: newRole },
    ipAddress: request ? getIpFromRequest(request) : undefined,
    userAgent: request ? getUserAgentFromRequest(request) : undefined,
  })
}

/**
 * Log a data deletion
 */
export async function logDataDeletion(
  userId: string,
  targetId: string,
  targetType: string,
  deletedCounts: Record<string, number>,
  request?: Request
): Promise<void> {
  await logAuditEvent({
    action: 'DATA_DELETE',
    userId,
    targetId,
    targetType,
    metadata: { deletedCounts },
    ipAddress: request ? getIpFromRequest(request) : undefined,
    userAgent: request ? getUserAgentFromRequest(request) : undefined,
  })
}

/**
 * Log an admin access event
 */
export async function logAdminAccess(
  userId: string,
  resource: string,
  operation: string,
  request?: Request
): Promise<void> {
  await logAuditEvent({
    action: 'ADMIN_ACCESS',
    userId,
    targetType: resource,
    metadata: { operation },
    ipAddress: request ? getIpFromRequest(request) : undefined,
    userAgent: request ? getUserAgentFromRequest(request) : undefined,
  })
}

/**
 * Log a settings change
 */
export async function logSettingsChange(
  userId: string,
  settingsKey: string,
  oldValue: unknown,
  newValue: unknown,
  request?: Request
): Promise<void> {
  await logAuditEvent({
    action: 'SETTINGS_CHANGE',
    userId,
    targetType: 'Settings',
    targetId: settingsKey,
    oldValue: { value: oldValue },
    newValue: { value: newValue },
    ipAddress: request ? getIpFromRequest(request) : undefined,
    userAgent: request ? getUserAgentFromRequest(request) : undefined,
  })
}

/**
 * Log a member role change in a business
 */
export async function logMemberRoleChange(
  userId: string,
  businessId: string,
  targetUserId: string,
  oldRole: string,
  newRole: string,
  request?: Request
): Promise<void> {
  await logAuditEvent({
    action: 'MEMBER_ROLE_CHANGE',
    userId,
    targetId: targetUserId,
    targetType: 'BusinessMember',
    oldValue: { role: oldRole, businessId },
    newValue: { role: newRole, businessId },
    ipAddress: request ? getIpFromRequest(request) : undefined,
    userAgent: request ? getUserAgentFromRequest(request) : undefined,
  })
}

/**
 * Log an API key operation
 */
export async function logApiKeyOperation(
  userId: string,
  operation: 'API_KEY_CREATE' | 'API_KEY_DELETE' | 'API_KEY_REGENERATE',
  apiKeyId: string,
  businessId: string,
  request?: Request
): Promise<void> {
  await logAuditEvent({
    action: operation,
    userId,
    targetId: apiKeyId,
    targetType: 'BusinessApiKey',
    metadata: { businessId },
    ipAddress: request ? getIpFromRequest(request) : undefined,
    userAgent: request ? getUserAgentFromRequest(request) : undefined,
  })
}
