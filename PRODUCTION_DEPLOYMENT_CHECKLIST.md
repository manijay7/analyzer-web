# Production Deployment Checklist - Banking Environment

## Pre-Deployment Security Verification

### ✅ Environment Configuration

- [ ] **NEXTAUTH_SECRET** is set to a secure random value (minimum 32 characters)
  ```bash
  # Generate with:
  openssl rand -base64 32
  ```
- [ ] **NEXTAUTH_URL** points to the production domain (HTTPS)
- [ ] **DATABASE_URL** points to production SQLite database path
- [ ] **NODE_ENV** is set to `production`
- [ ] All environment variables are managed through secure vault/secrets manager
- [ ] No hardcoded secrets in codebase or version control

### ✅ Database Initialization

- [ ] Production database initialized with secure admin account
  ```bash
  npm run init-admin
  ```
- [ ] Admin password meets complexity requirements (12+ chars, mixed case, numbers, special chars)
- [ ] No demo/test data in production database
- [ ] Database file has appropriate file system permissions (600 or 640)
- [ ] Database file is stored outside web-accessible directory

### ✅ Code Quality

- [ ] All mock data generators removed or isolated to test directory
- [ ] No MOCK_USERS or demo credentials in codebase
- [ ] No TODO/FIXME comments related to security features
- [ ] No duplicate file definitions (types, constants)
- [ ] Vite artifacts removed (using Next.js only)
- [ ] All imports resolve correctly to consolidated locations

### ✅ Security Headers

- [ ] Content Security Policy (CSP) configured and tested
- [ ] HSTS (HTTP Strict Transport Security) enabled for HTTPS
- [ ] X-Frame-Options set to DENY
- [ ] X-Content-Type-Options set to nosniff
- [ ] Referrer-Policy configured appropriately
- [ ] Permissions-Policy restricts unnecessary browser features

### ✅ Authentication & Authorization

- [ ] NextAuth CSRF protection active
- [ ] Session timeout configured (24 hours default)
- [ ] Failed login attempt tracking operational
- [ ] Account lockout mechanism tested (5 attempts, 15-minute lockout)
- [ ] Role-based permissions enforced
- [ ] No demo user switching functionality in production build

### ✅ Audit & Compliance

- [ ] All user actions logged to audit trail
- [ ] Audit logs include real user identities (no seed data)
- [ ] IP addresses and device information captured accurately
- [ ] Session tracking includes proper metadata
- [ ] Audit log chain verification operational

### ✅ Rate Limiting

- [ ] In-memory rate limiting active (single-instance deployment)
- [ ] Rate limits configured appropriately:
  - Login attempts: 5 per 15 minutes
  - API requests: 100 per minute (default)
- [ ] Note: Multi-instance deployment requires Redis (documented)

## Deployment Steps

### 1. Environment Setup

```bash
# Copy template and configure
cp .env.template .env

# Edit .env with production values
# NEVER commit .env to version control
```

### 2. Database Setup

```bash
# Run Prisma migrations
npx prisma migrate deploy

# Initialize admin user
npm run init-admin

# Verify database permissions
chmod 600 /path/to/production.db
```

### 3. Build Application

```bash
# Install dependencies
npm ci --only=production

# Build Next.js application
npm run build
```

### 4. Start Application

```bash
# Start production server
npm start

# Or with PM2 for process management
pm2 start npm --name "analyzer-web" -- start
```

### 5. Verify Deployment

- [ ] Application starts without errors
- [ ] Environment validation passes
- [ ] Login with admin account successful
- [ ] Security headers present in HTTP responses
- [ ] HTTPS redirect working (if applicable)
- [ ] Audit logging captures actions
- [ ] File upload functionality works
- [ ] Transaction import tested with sample data

## Post-Deployment Verification

### Security Testing

```bash
# Run npm audit
npm audit

# Check for security headers
curl -I https://your-domain.com

# Verify HSTS header present
# Verify CSP header present
# Verify X-Frame-Options: DENY
```

### Functional Testing

- [ ] Login/logout flow
- [ ] User creation (Admin Dashboard)
- [ ] Transaction import
- [ ] Matching operations
- [ ] Audit log viewing
- [ ] File upload (within size limits)
- [ ] Session timeout behavior
- [ ] Failed login lockout

### Performance Testing

- [ ] Response time under load
- [ ] Database query performance
- [ ] File upload for max size
- [ ] Concurrent user sessions (SQLite limitations)

## Monitoring & Maintenance

### Regular Tasks

- [ ] Monitor audit logs for suspicious activity
- [ ] Review failed login attempts
- [ ] Check database size and performance
- [ ] Rotate NEXTAUTH_SECRET quarterly
- [ ] Update dependencies monthly
- [ ] Review and test backups weekly

### Incident Response

- [ ] Audit logs preserved for compliance period
- [ ] Backup and restore procedures tested
- [ ] Emergency admin access procedure documented
- [ ] Security incident contact list maintained

## Rollback Procedure

If issues occur during deployment:

```bash
# Stop application
pm2 stop analyzer-web

# Restore previous version
git checkout <previous-tag>
npm ci
npm run build

# Restore database backup
cp /backups/production.db.backup /path/to/production.db

# Restart application
pm2 start analyzer-web
```

## Banking Compliance Notes

### Data Protection

- [ ] No sensitive data in logs
- [ ] Database encryption at rest (file system level)
- [ ] HTTPS encryption in transit
- [ ] Session data not persisted in browser localStorage (server-side only)

### Access Control

- [ ] Principle of least privilege enforced
- [ ] Administrative actions require proper authentication
- [ ] Role-based access control implemented
- [ ] User access reviewed quarterly

### Audit Trail

- [ ] All financial transactions logged
- [ ] User actions timestamped
- [ ] Log integrity verification (hash chain)
- [ ] Logs retained per compliance requirements

## Known Limitations (Document for Compliance)

### In-Memory Components

⚠️ **Login Attempt Tracking**: In-memory, resets on server restart
- **Impact**: Failed login counters reset
- **Mitigation**: Monitor application restarts, consider database persistence

⚠️ **Rate Limiting**: In-memory, single-instance only
- **Impact**: Not effective across multiple instances
- **Mitigation**: Deploy behind WAF/API Gateway or implement Redis

### SQLite Limitations

⚠️ **Concurrent Writes**: Limited compared to PostgreSQL/MySQL
- **Impact**: High concurrent write operations may queue
- **Mitigation**: Monitor performance, consider migration if needed

⚠️ **Multi-Instance**: File-based, not suitable for horizontal scaling
- **Impact**: Cannot run multiple application instances
- **Mitigation**: Single-instance deployment or migrate to client-server database

## Support Contacts

- **Security Team**: security@yourbank.com
- **Infrastructure Team**: infra@yourbank.com  
- **Compliance Team**: compliance@yourbank.com
- **Application Support**: support@yourbank.com

## Approval Sign-Off

- [ ] Security Review Completed: _________________ Date: _______
- [ ] Compliance Review Completed: _________________ Date: _______
- [ ] IT Operations Approved: _________________ Date: _______
- [ ] Business Owner Approved: _________________ Date: _______
