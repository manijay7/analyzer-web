import { z } from "zod";

// ============================================================================
// PRIMITIVE SCHEMAS
// ============================================================================

// Common validation patterns
const emailSchema = z.string().email("Invalid email format");
const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .regex(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
    "Password must contain at least one lowercase letter, one uppercase letter, and one number"
  );

const uuidSchema = z.string().uuid("Invalid UUID format");
const positiveNumber = z.number().positive("Must be positive");
const nonEmptyString = z.string().min(1, "Required field");

// Date validation (YYYY-MM-DD format)
const dateStringSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format")
  .refine((date) => {
    const parsed = new Date(date);
    return !isNaN(parsed.getTime()) && parsed.toISOString().startsWith(date);
  }, "Invalid date");

// ============================================================================
// USER MANAGEMENT SCHEMAS
// ============================================================================

export const UserRoleSchema = z.enum([
  "ADMIN",
  "MANAGER",
  "ANALYST",
  "AUDITOR",
]);

export const PermissionSchema = z.enum([
  "manage_users",
  "view_admin_panel",
  "unmatch_transactions",
  "view_all_logs",
  "export_data",
  "perform_matching",
  "manage_periods",
  "approve_adjustments",
]);

export const UserSchema = z.object({
  id: uuidSchema,
  email: emailSchema,
  name: nonEmptyString
    .min(2, "Name must be at least 2 characters")
    .max(100, "Name too long"),
  role: UserRoleSchema,
  avatar: z.string().optional(),
  status: z.enum(["active", "inactive", "locked"]).default("active"),
  lastLogin: z.number().optional(),
  failedLoginAttempts: z.number().min(0).default(0),
  createdAt: z.number().optional(),
  updatedAt: z.number().optional(),
});

export const CreateUserSchema = z.object({
  email: emailSchema,
  name: nonEmptyString.min(2).max(100),
  role: UserRoleSchema,
  password: passwordSchema,
});

export const UpdateUserSchema = UserSchema.partial().omit({ id: true });

export const LoginCredentialsSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Password is required"),
});

// ============================================================================
// TRANSACTION SCHEMAS
// ============================================================================

export const TransactionStatusSchema = z.enum(["UNMATCHED", "MATCHED"]);

export const SideSchema = z.enum(["LEFT", "RIGHT"]);

export const TransactionSchema = z.object({
  id: uuidSchema,
  // Excel columns
  sn: z.string().optional(),
  date: dateStringSchema,
  description: nonEmptyString.max(255, "Description too long"),
  amount: z.number().finite("Amount must be a valid number"),
  glRefNo: z.string().optional(),
  aging: z.number().int().min(0).optional(),
  recon: z.string().optional(),

  // Legacy fields
  reference: z.string().default(""),
  side: SideSchema,
  status: TransactionStatusSchema,
  matchId: uuidSchema.optional(),

  // Metadata
  importedBy: z.string().optional(),
  createdAt: z.number().optional(),
  updatedAt: z.number().optional(),
});

export const CreateTransactionSchema = TransactionSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// ============================================================================
// MATCHING SCHEMAS
// ============================================================================

export const MatchStatusSchema = z.enum(["APPROVED", "PENDING_APPROVAL"]);

export const MatchGroupSchema = z.object({
  id: uuidSchema,
  timestamp: z.number().positive(),
  leftTransactions: z.array(TransactionSchema),
  rightTransactions: z.array(TransactionSchema),
  totalLeft: positiveNumber,
  totalRight: positiveNumber,
  difference: z.number().finite(),
  adjustment: z.number().optional(),
  comment: z.string().max(500, "Comment too long").optional(),
  matchByUserId: uuidSchema.optional(),
  status: MatchStatusSchema,
  approvedBy: z.string().optional(),
  approvedAt: z.number().optional(),
  createdAt: z.number().optional(),
  updatedAt: z.number().optional(),
});

export const CreateMatchSchema = z
  .object({
    leftTransactionIds: z
      .array(uuidSchema)
      .min(1, "At least one left transaction required"),
    rightTransactionIds: z
      .array(uuidSchema)
      .min(1, "At least one right transaction required"),
    totalLeft: positiveNumber,
    totalRight: positiveNumber,
    comment: z.string().max(500).optional(),
  })
  .refine(
    (data) => Math.abs(data.totalLeft - data.totalRight) <= 0.01,
    "Transaction totals must match (within 0.01 tolerance)"
  );

// ============================================================================
// AUDIT & LOGGING SCHEMAS
// ============================================================================

export const AuditLogEntrySchema = z.object({
  id: uuidSchema,
  timestamp: z.number().positive(),
  action: nonEmptyString.max(100),
  details: nonEmptyString.max(1000),
  userId: uuidSchema,
  userName: nonEmptyString,
  entityType: z.string().optional(),
  entityId: uuidSchema.optional(),
});

// ============================================================================
// FILE IMPORT SCHEMAS
// ============================================================================

export const FileImportSchema = z.object({
  id: uuidSchema,
  filename: nonEmptyString.max(255),
  mimeType: z
    .string()
    .regex(/^application\/vnd\.openxmlformats/, "Must be Excel file"),
  fileSize: z
    .number()
    .int()
    .positive()
    .max(50 * 1024 * 1024, "File too large (max 50MB)"),
  checksum: z.string().min(1),
  status: z.enum(["PENDING", "PROCESSING", "COMPLETED", "FAILED"]),
  processedCount: z.number().int().min(0).default(0),
  acceptedCount: z.number().int().min(0).default(0),
  rejectedCount: z.number().int().min(0).default(0),
  errorDetails: z.string().optional(),
  uploadedById: uuidSchema,
  uploadedAt: z.number(),
  processedAt: z.number().optional(),
});

// ============================================================================
// API REQUEST/RESPONSE SCHEMAS
// ============================================================================

// Authentication APIs
export const LoginRequestSchema = z.object({
  email: emailSchema,
  password: z.string().min(1),
});

export const AuthResponseSchema = z.object({
  user: UserSchema,
  token: z.string().min(1),
  expiresAt: z.number().positive(),
});

// Transaction APIs
export const TransactionQuerySchema = z.object({
  fileId: uuidSchema,
  sheetId: uuidSchema.optional(),
  status: TransactionStatusSchema.optional(),
  limit: z.number().int().min(1).max(1000).default(100),
  offset: z.number().int().min(0).default(0),
});

export const BulkTransactionImportSchema = z.object({
  fileId: uuidSchema,
  sheetId: uuidSchema,
  transactions: z.array(CreateTransactionSchema).min(1).max(10000),
});

// Export APIs
export const ExportRequestSchema = z.object({
  fileId: uuidSchema,
  sheetId: uuidSchema.optional(),
  scope: z.enum(["current", "workbook"]),
  format: z.enum(["csv", "excel", "reconciliation"]),
  filters: z
    .object({
      dateFrom: dateStringSchema.optional(),
      dateTo: dateStringSchema.optional(),
      status: TransactionStatusSchema.optional(),
      amountMin: positiveNumber.optional(),
      amountMax: positiveNumber.optional(),
    })
    .optional(),
});

// ============================================================================
// VALIDATION HELPERS
// ============================================================================

/**
 * Type-safe validation helper
 */
export function validateData<T>(schema: z.ZodSchema<T>, data: unknown): T {
  try {
    return schema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const formattedErrors = error.issues
        .map((err: any) => `${err.path.join(".")}: ${err.message}`)
        .join(", ");
      throw new Error(`Validation failed: ${formattedErrors}`);
    }
    throw error;
  }
}

/**
 * Safe validation that returns null on failure
 */
export function safeValidateData<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): T | null {
  try {
    return schema.parse(data);
  } catch {
    return null;
  }
}

/**
 * Sanitize HTML input to prevent XSS
 */
export function sanitizeHtml(input: string): string {
  // Basic HTML sanitization - remove script tags and dangerous attributes
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/<[^>]*>/g, (match) => {
      // Allow only safe tags
      const safeTags = ["p", "br", "strong", "em", "u", "ul", "ol", "li"];
      const tagMatch = match.match(/^<(\w+)/);
      if (tagMatch && safeTags.includes(tagMatch[1])) {
        return match;
      }
      return "";
    });
}

/**
 * Validate file upload
 */
export function validateFileUpload(file: File): {
  valid: boolean;
  error?: string;
} {
  // Check file type
  const allowedTypes = [
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/vnd.ms-excel",
  ];

  if (!allowedTypes.includes(file.type)) {
    return {
      valid: false,
      error: "Only Excel files (.xlsx, .xls) are allowed",
    };
  }

  // Check file size (50MB limit)
  const maxSize = 50 * 1024 * 1024;
  if (file.size > maxSize) {
    return { valid: false, error: "File size must be less than 50MB" };
  }

  return { valid: true };
}

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type User = z.infer<typeof UserSchema>;
export type CreateUser = z.infer<typeof CreateUserSchema>;
export type UpdateUser = z.infer<typeof UpdateUserSchema>;
export type LoginCredentials = z.infer<typeof LoginCredentialsSchema>;

export type Transaction = z.infer<typeof TransactionSchema>;
export type CreateTransaction = z.infer<typeof CreateTransactionSchema>;

export type MatchGroup = z.infer<typeof MatchGroupSchema>;
export type CreateMatch = z.infer<typeof CreateMatchSchema>;

export type AuditLogEntry = z.infer<typeof AuditLogEntrySchema>;
export type FileImport = z.infer<typeof FileImportSchema>;

export type LoginRequest = z.infer<typeof LoginRequestSchema>;
export type AuthResponse = z.infer<typeof AuthResponseSchema>;
export type ExportRequest = z.infer<typeof ExportRequestSchema>;
