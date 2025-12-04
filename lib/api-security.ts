import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { UserRole, Permission } from "@/lib/types";
import { DEFAULT_ROLE_PERMISSIONS } from "@/lib/constants";
import { auditService } from "@/services/AuditService";
import { NextRequest } from "next/server";

/**
 * Extract client IP address from request
 */
export function getClientIp(request: NextRequest | Request): string {
  // Try various headers for IP address
  const forwarded = (request.headers as any).get?.('x-forwarded-for');
  const realIp = (request.headers as any).get?.('x-real-ip');
  const cfConnectingIp = (request.headers as any).get?.('cf-connecting-ip');
  
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  
  if (realIp) {
    return realIp;
  }
  
  if (cfConnectingIp) {
    return cfConnectingIp;
  }
  
  return 'unknown';
}

/**
 * Extract user agent from request
 */
export function getUserAgent(request: NextRequest | Request): string {
  return (request.headers as any).get?.('user-agent') || 'unknown';
}

/**
 * Generate device fingerprint from request metadata
 */
export function generateDeviceFingerprint(request: NextRequest | Request): string {
  const userAgent = getUserAgent(request);
  const acceptLanguage = (request.headers as any).get?.('accept-language') || '';
  const acceptEncoding = (request.headers as any).get?.('accept-encoding') || '';
  
  const crypto = require('crypto');
  const data = `${userAgent}|${acceptLanguage}|${acceptEncoding}`;
  return crypto.createHash('sha256').update(data).digest('hex').substring(0, 16);
}

interface ValidationOptions {
  requiredPermission?: Permission;
  logAction?: boolean;
  actionType?: string;
  entityType?: string;
  entityId?: string;
}

interface ValidationResult {
  error?: string;
  status?: number;
  user?: any;
  ipAddress?: string;
  deviceFingerprint?: string;
}

/**
 * Enhanced request validation with audit logging and metadata extraction
 */
export async function validateRequest(
  requiredPermission?: Permission,
  request?: NextRequest | Request
): Promise<ValidationResult> {
  const session = await getServerSession(authOptions);

  if (!session || !session.user) {
    return { error: "Unauthorized", status: 401 };
  }

  // Extract request metadata if provided
  const ipAddress = request ? getClientIp(request) : undefined;
  const deviceFingerprint = request ? generateDeviceFingerprint(request) : undefined;

  // Check permission if required
  if (requiredPermission) {
    const userRole = session.user.role as UserRole;
    const permissions = DEFAULT_ROLE_PERMISSIONS[userRole] || [];
    
    if (!permissions.includes(requiredPermission)) {
      // Log unauthorized access attempt
      if (session.user.id) {
        try {
          await auditService.createAuditLog({
            userId: session.user.id,
            actionType: 'UPDATE',
            entityType: 'USER',
            entityId: session.user.id,
            changeSummary: `Unauthorized access attempt - Required permission: ${requiredPermission}`,
            ipAddress,
            deviceFingerprint,
          });
        } catch (error) {
          console.error('Failed to log unauthorized access:', error);
        }
      }
      return { error: "Forbidden: Insufficient Permissions", status: 403 };
    }
  }

  return {
    user: session.user,
    ipAddress,
    deviceFingerprint,
  };
}

/**
 * Validate and log API action
 */
export async function validateAndLogAction(
  requiredPermission: Permission,
  actionType: string,
  entityType: string,
  entityId: string,
  changeSummary: string,
  request?: NextRequest | Request,
  beforeState?: any,
  afterState?: any
): Promise<ValidationResult> {
  const validation = await validateRequest(requiredPermission, request);
  
  if (validation.error) {
    return validation;
  }
  
  // Log the action
  try {
    await auditService.createAuditLog({
      userId: validation.user.id,
      sessionId: (validation.user as any).sessionToken,
      ipAddress: validation.ipAddress,
      deviceFingerprint: validation.deviceFingerprint,
      actionType,
      entityType,
      entityId,
      changeSummary,
      beforeState,
      afterState,
    });
  } catch (error) {
    console.error('Failed to log action:', error);
  }
  
  return validation;
}

/**
 * Check if user has specific permission
 */
export function hasPermission(userRole: UserRole, permission: Permission): boolean {
  const permissions = DEFAULT_ROLE_PERMISSIONS[userRole] || [];
  return permissions.includes(permission);
}

/**
 * Get all permissions for a role
 */
export function getRolePermissions(userRole: UserRole): Permission[] {
  return DEFAULT_ROLE_PERMISSIONS[userRole] || [];
}

/**
 * CSRF Protection Note:
 * NextAuth automatically handles CSRF protection for authentication routes.
 * For additional API routes, consider implementing CSRF tokens if needed.
 * 
 * Current Implementation: Relies on NextAuth's built-in CSRF protection
 * Future Enhancement: Add custom CSRF middleware if required for non-auth routes
 */

// Simple in-memory rate limiting (single-instance deployment only)
// For multi-instance deployments, replace with Redis-backed implementation
const rateLimitStore: Record<string, { count: number; resetTime: number }> = {};

/**
 * Basic rate limiting implementation
 * 
 * WARNING: This is an in-memory implementation suitable for single-instance deployments only.
 * For production deployments with multiple instances, replace with Redis or equivalent.
 * 
 * @param identifier - Unique identifier (e.g., user ID, IP address)
 * @param limit - Maximum number of requests allowed in window
 * @param windowMs - Time window in milliseconds
 * @returns Object indicating if request is allowed and remaining quota
 */
export async function checkRateLimit(
  identifier: string,
  limit: number = 100,
  windowMs: number = 60000
): Promise<{ allowed: boolean; remaining: number }> {
  const now = Date.now();
  const key = `ratelimit:${identifier}`;
  
  // Get or initialize rate limit record
  let record = rateLimitStore[key];
  
  // Reset if window has expired
  if (!record || now > record.resetTime) {
    record = {
      count: 0,
      resetTime: now + windowMs
    };
    rateLimitStore[key] = record;
  }
  
  // Increment counter
  record.count++;
  
  // Check if limit exceeded
  const allowed = record.count <= limit;
  const remaining = Math.max(0, limit - record.count);
  
  return { allowed, remaining };
}

/**
 * Clean up expired rate limit records (should be called periodically)
 * Call this from a cron job or scheduled task
 */
export function cleanupExpiredRateLimits(): void {
  const now = Date.now();
  Object.keys(rateLimitStore).forEach(key => {
    if (rateLimitStore[key].resetTime < now) {
      delete rateLimitStore[key];
    }
  });
}