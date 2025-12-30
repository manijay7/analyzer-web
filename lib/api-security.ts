import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { UserRole, Permission } from "@/lib/types";
import { z } from "zod";
import {
  validateData,
  sanitizeHtml,
  validateFileUpload,
  UserSchema,
  LoginRequestSchema,
  CreateMatchSchema,
  ExportRequestSchema,
} from "@/lib/validation";

// ============================================================================
// PERMISSION MATRIX
// ============================================================================

const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  ADMIN: [
    "manage_users",
    "view_admin_panel",
    "unmatch_transactions",
    "view_all_logs",
    "export_data",
    "perform_matching",
    "manage_periods",
    "approve_adjustments",
  ],
  MANAGER: [
    "unmatch_transactions",
    "view_all_logs",
    "export_data",
    "perform_matching",
    "approve_adjustments",
  ],
  ANALYST: ["export_data", "perform_matching"],
  AUDITOR: ["view_all_logs", "export_data"],
};

// ============================================================================
// AUTHENTICATION HELPERS
// ============================================================================

/**
 * Get authenticated user from session
 */
export async function getAuthenticatedUser() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    throw new Error("Unauthorized");
  }

  // In a real implementation, you'd fetch the full user from database
  // For now, we'll assume the session user has the required fields
  return {
    id: session.user.id,
    email: session.user.email,
    name: session.user.name || "Unknown",
    role: session.user.role as UserRole,
    permissions: ROLE_PERMISSIONS[session.user.role as UserRole] || [],
  };
}

/**
 * Check if user has required permission
 */
export function hasPermission(
  userRole: UserRole,
  permission: Permission
): boolean {
  return ROLE_PERMISSIONS[userRole]?.includes(permission) ?? false;
}

/**
 * Check if user has any of the required permissions
 */
export function hasAnyPermission(
  userRole: UserRole,
  permissions: Permission[]
): boolean {
  return permissions.some((perm) => hasPermission(userRole, perm));
}

/**
 * Check if user has all required permissions
 */
export function hasAllPermissions(
  userRole: UserRole,
  permissions: Permission[]
): boolean {
  return permissions.every((perm) => hasPermission(userRole, perm));
}

// ============================================================================
// MIDDLEWARE FUNCTIONS
// ============================================================================

/**
 * Authentication middleware
 */
export async function requireAuth(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    return { user };
  } catch (error) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 }
    );
  }
}

/**
 * Permission middleware
 */
export async function requirePermission(
  request: NextRequest,
  permission: Permission
) {
  const authResult = await requireAuth(request);
  if (authResult instanceof NextResponse) return authResult;

  const { user } = authResult;
  if (!hasPermission(user.role, permission)) {
    return NextResponse.json(
      { success: false, error: "Insufficient permissions" },
      { status: 403 }
    );
  }

  return { user };
}

/**
 * Validate request with permission check (for backward compatibility)
 */
export async function validateRequest(permission: Permission) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return { error: "Unauthorized", status: 401 };
    }

    const userRole = session.user.role as UserRole;
    if (!hasPermission(userRole, permission)) {
      return { error: "Insufficient permissions", status: 403 };
    }

    return {
      user: {
        id: session.user.id,
        email: session.user.email,
        name: session.user.name || "Unknown",
        role: userRole,
        permissions: ROLE_PERMISSIONS[userRole] || [],
      },
    };
  } catch (error) {
    return { error: "Authentication failed", status: 401 };
  }
}

/**
 * Multiple permissions middleware (OR condition)
 */
export async function requireAnyPermission(
  request: NextRequest,
  permissions: Permission[]
) {
  const authResult = await requireAuth(request);
  if (authResult instanceof NextResponse) return authResult;

  const { user } = authResult;
  if (!hasAnyPermission(user.role, permissions)) {
    return NextResponse.json(
      { success: false, error: "Insufficient permissions" },
      { status: 403 }
    );
  }

  return { user };
}

// ============================================================================
// INPUT VALIDATION MIDDLEWARE
// ============================================================================

/**
 * Validate request body against Zod schema
 */
export async function validateRequestBody<T>(
  request: NextRequest,
  schema: z.ZodSchema<T>
): Promise<{ data: T } | NextResponse> {
  try {
    const body = await request.json();
    const validatedData = validateData(schema, body);
    return { data: validatedData };
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: "Invalid request data",
        details: error instanceof Error ? error.message : "Validation failed",
      },
      { status: 400 }
    );
  }
}

/**
 * Validate query parameters
 */
export function validateQueryParams(
  request: NextRequest,
  requiredParams: string[] = [],
  optionalParams: string[] = []
): { params: Record<string, string> } | NextResponse {
  const { searchParams } = new URL(request.url);
  const params: Record<string, string> = {};

  // Check required parameters
  for (const param of requiredParams) {
    const value = searchParams.get(param);
    if (!value) {
      return NextResponse.json(
        { success: false, error: `Missing required parameter: ${param}` },
        { status: 400 }
      );
    }
    params[param] = value;
  }

  // Get optional parameters
  for (const param of optionalParams) {
    const value = searchParams.get(param);
    if (value) params[param] = value;
  }

  return { params };
}

// ============================================================================
// SECURITY HEADERS & SANITIZATION
// ============================================================================

/**
 * Add security headers to response
 */
export function addSecurityHeaders(response: NextResponse) {
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-XSS-Protection", "1; mode=block");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");

  // Content Security Policy - Bank Intranet Compatible
  const cspDirectives = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline'",
    "style-src 'self'",
    "font-src 'self'",
    "img-src 'self'",
    "connect-src 'self'",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'",
    "frame-src 'none'",
  ];
  response.headers.set("Content-Security-Policy", cspDirectives.join("; "));

  return response;
}

/**
 * Sanitize user input to prevent XSS
 */
export function sanitizeInput(input: any): any {
  if (typeof input === "string") {
    return sanitizeHtml(input);
  }

  if (Array.isArray(input)) {
    return input.map(sanitizeInput);
  }

  if (input && typeof input === "object") {
    const sanitized: any = {};
    for (const [key, value] of Object.entries(input)) {
      sanitized[key] = sanitizeInput(value);
    }
    return sanitized;
  }

  return input;
}

// ============================================================================
// RATE LIMITING (SIMPLE IN-MEMORY IMPLEMENTATION)
// ============================================================================

const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

/**
 * Simple rate limiting middleware
 */
export function rateLimit(
  request: NextRequest,
  maxRequests: number = 100,
  windowMs: number = 15 * 60 * 1000 // 15 minutes
): NextResponse | null {
  const ip = request.ip || "unknown";
  const key = `${ip}:${request.nextUrl.pathname}`;
  const now = Date.now();

  const current = rateLimitStore.get(key);
  if (!current || now > current.resetTime) {
    rateLimitStore.set(key, { count: 1, resetTime: now + windowMs });
    return null;
  }

  if (current.count >= maxRequests) {
    return NextResponse.json(
      { success: false, error: "Too many requests" },
      { status: 429 }
    );
  }

  current.count++;
  return null;
}

// ============================================================================
// COMBINED MIDDLEWARE
// ============================================================================

/**
 * Combined middleware for API routes
 */
export async function apiMiddleware(
  request: NextRequest,
  options: {
    requireAuth?: boolean;
    permission?: Permission;
    permissions?: Permission[];
    rateLimit?: { maxRequests?: number; windowMs?: number };
    validateBody?: any;
  } = {}
) {
  // Rate limiting
  if (options.rateLimit) {
    const rateLimitResult = rateLimit(
      request,
      options.rateLimit.maxRequests,
      options.rateLimit.windowMs
    );
    if (rateLimitResult) return rateLimitResult;
  }

  // Authentication
  let user: any = null;
  if (options.requireAuth !== false) {
    const authResult = await requireAuth(request);
    if (authResult instanceof NextResponse) return authResult;
    user = authResult.user;
  }

  // Permissions
  if (options.permission) {
    const permResult = await requirePermission(request, options.permission);
    if (permResult instanceof NextResponse) return permResult;
  }

  if (options.permissions) {
    const permResult = await requireAnyPermission(request, options.permissions);
    if (permResult instanceof NextResponse) return permResult;
  }

  // Body validation
  let validatedData: any = null;
  if (options.validateBody) {
    const validationResult = await validateRequestBody(
      request,
      options.validateBody
    );
    if (validationResult instanceof NextResponse) return validationResult;
    validatedData = validationResult.data;
  }

  return { user, data: validatedData };
}

// ============================================================================
// ERROR HANDLING
// ============================================================================

/**
 * Standardized API error response
 */
export function apiError(message: string, status: number = 500, details?: any) {
  return NextResponse.json(
    {
      success: false,
      error: message,
      ...(details && { details }),
    },
    { status }
  );
}

/**
 * Standardized API success response
 */
export function apiSuccess(data: any, status: number = 200) {
  return NextResponse.json({ success: true, data }, { status });
}
