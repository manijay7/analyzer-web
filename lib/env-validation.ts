/**
 * Environment Configuration Validation
 * 
 * This module validates required environment variables at application startup
 * to ensure production deployments fail fast if misconfigured.
 * 
 * Banking Environment Compliance:
 * - All secrets must be externally managed
 * - Configuration errors should prevent application startup
 * - Validation results should be logged for audit purposes
 */

interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Validate required environment variables
 */
export function validateEnvironment(): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Required variables that must be set
  const required = {
    NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET,
    NEXTAUTH_URL: process.env.NEXTAUTH_URL,
    DATABASE_URL: process.env.DATABASE_URL,
  };

  // Check required variables
  Object.entries(required).forEach(([key, value]) => {
    if (!value || value.trim() === '') {
      errors.push(`${key} is not set`);
    }
  });

  // Validate NEXTAUTH_SECRET strength
  if (required.NEXTAUTH_SECRET) {
    if (required.NEXTAUTH_SECRET.length < 32) {
      errors.push('NEXTAUTH_SECRET must be at least 32 characters for production use');
    }
    
    // Check for placeholder/weak values
    const weakSecrets = [
      'your-secret-key-here',
      'change-me',
      'change-in-production',
      'dev-secret',
      'test-secret',
      'secret',
      '123456'
    ];
    
    if (weakSecrets.some(weak => required.NEXTAUTH_SECRET?.toLowerCase().includes(weak))) {
      errors.push('NEXTAUTH_SECRET appears to contain a placeholder or weak value. Generate a secure random secret.');
    }
  }

  // Validate NEXTAUTH_URL format
  if (required.NEXTAUTH_URL) {
    try {
      const url = new URL(required.NEXTAUTH_URL);
      
      // Warn if using HTTP in production
      if (process.env.NODE_ENV === 'production' && url.protocol === 'http:') {
        warnings.push('NEXTAUTH_URL uses HTTP in production. HTTPS is strongly recommended for banking environments.');
      }
      
      // Warn if using localhost in production
      if (process.env.NODE_ENV === 'production' && (url.hostname === 'localhost' || url.hostname === '127.0.0.1')) {
        warnings.push('NEXTAUTH_URL points to localhost in production environment.');
      }
    } catch (error) {
      errors.push('NEXTAUTH_URL is not a valid URL');
    }
  }

  // Validate DATABASE_URL
  if (required.DATABASE_URL) {
    if (!required.DATABASE_URL.startsWith('file:')) {
      warnings.push('DATABASE_URL does not use SQLite file protocol. Ensure your database provider is configured correctly.');
    }
    
    // Warn about development database names in production
    if (process.env.NODE_ENV === 'production') {
      const devDbPatterns = ['dev.db', 'test.db', 'local.db', 'development.db'];
      if (devDbPatterns.some(pattern => required.DATABASE_URL?.includes(pattern))) {
        warnings.push('DATABASE_URL appears to reference a development database in production environment.');
      }
    }
  }

  // Optional environment variable warnings
  const optionalVars = {
    MAX_FILE_SIZE_MB: process.env.MAX_FILE_SIZE_MB,
    UPLOAD_DIR: process.env.UPLOAD_DIR,
  };

  Object.entries(optionalVars).forEach(([key, value]) => {
    if (!value) {
      warnings.push(`${key} is not set. Using default value.`);
    }
  });

  // Validate NODE_ENV
  if (process.env.NODE_ENV !== 'production' && process.env.NODE_ENV !== 'development' && process.env.NODE_ENV !== 'test') {
    warnings.push(`NODE_ENV is set to "${process.env.NODE_ENV}". Expected: production, development, or test.`);
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Validate and enforce environment configuration at startup
 * Throws an error if validation fails
 */
export function enforceEnvironmentValidation(): void {
  const result = validateEnvironment();

  // Log warnings
  if (result.warnings.length > 0) {
    console.warn('⚠️  Environment Configuration Warnings:');
    result.warnings.forEach(warning => {
      console.warn(`   - ${warning}`);
    });
    console.warn('');
  }

  // Fail on errors
  if (!result.valid) {
    console.error('❌ Environment Configuration Errors:');
    result.errors.forEach(error => {
      console.error(`   - ${error}`);
    });
    console.error('');
    console.error('Application startup aborted due to configuration errors.');
    console.error('Please check .env.template for required configuration variables.');
    console.error('Generate NEXTAUTH_SECRET with: openssl rand -base64 32');
    
    throw new Error('Environment validation failed. See errors above.');
  }

  // Log success for production deployments
  if (process.env.NODE_ENV === 'production') {
    console.log('✅ Environment configuration validated successfully');
  }
}

/**
 * Get security configuration summary for audit logging
 */
export function getSecurityConfigSummary() {
  return {
    nodeEnv: process.env.NODE_ENV,
    nextAuthUrlSet: !!process.env.NEXTAUTH_URL,
    nextAuthSecretSet: !!process.env.NEXTAUTH_SECRET,
    nextAuthSecretLength: process.env.NEXTAUTH_SECRET?.length || 0,
    databaseUrlSet: !!process.env.DATABASE_URL,
    databaseProvider: process.env.DATABASE_URL?.split(':')[0] || 'unknown',
    httpsEnabled: process.env.NEXTAUTH_URL?.startsWith('https://') || false,
    validatedAt: new Date().toISOString(),
  };
}
