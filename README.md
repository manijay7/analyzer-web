# Analyzer Web - Financial Reconciliation System

Enterprise-grade financial transaction reconciliation and matching platform designed for banking environments.

## 🏦 Banking Environment Ready

This application has been hardened for production deployment in banking and financial services environments:

- ✅ No hardcoded credentials or demo accounts
- ✅ Secure authentication with NextAuth
- ✅ Comprehensive audit logging
- ✅ Role-based access control (RBAC)
- ✅ Production-grade security headers
- ✅ Environment validation at startup
- ✅ SQLite database with data persistence

## 📋 Features

- **Transaction Matching**: Manual and automated reconciliation
- **Multi-Sheet Excel Import**: Import complex workbooks with account validation
- **Audit Trail**: Complete logging of all user actions
- **Role-Based Security**: Admin, Manager, Analyst, and Auditor roles
- **Session Management**: Secure session handling with device tracking
- **Version Control**: Snapshot history for data rollback
- **Batch Operations**: Bulk matching and approval workflows

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and npm
- OpenSSL (for generating secrets)

### Installation

```bash
# Clone repository
git clone <repository-url>
cd analyzer-web

# Install dependencies
npm install

# Configure environment
cp .env.template .env
# Edit .env with your production values

# Generate secure secret
openssl rand -base64 32
# Add to .env as NEXTAUTH_SECRET

# Initialize database
npx prisma migrate deploy

# Create admin user
npm run init-admin
```

### Running in Development

```bash
npm run dev
```

Access at: http://localhost:3000

### Building for Production

```bash
npm run build
npm start
```

## 🔐 Security Configuration

### Required Environment Variables

See [`.env.template`](.env.template) for complete configuration reference.

**Critical Variables:**
- `NEXTAUTH_SECRET` - Authentication secret (min 32 chars)
- `NEXTAUTH_URL` - Production URL (HTTPS recommended)
- `DATABASE_URL` - SQLite database path
- `NODE_ENV` - Set to `production` for deployment

### Initial Admin Setup

```bash
npm run init-admin
```

This script will:
- Prompt for secure admin credentials
- Validate password strength (12+ characters, mixed complexity)
- Create the admin user in the database
- Generate an initial audit log entry

**Password Requirements:**
- Minimum 12 characters
- Uppercase and lowercase letters
- Numbers and special characters
- No common patterns or dictionary words

## 📊 Database

### Technology

- **Prisma ORM** for type-safe database operations
- **SQLite** for embedded database storage

### Migrations

```bash
# Apply migrations to database
npx prisma migrate deploy

# Generate Prisma client
npx prisma generate
```

### Seeding (Development/Test Only)

```bash
# DO NOT run in production
npx prisma db seed
```

See [`prisma/seeds/README.md`](prisma/seeds/README.md) for details.

## 🏗️ Architecture

### Tech Stack

- **Frontend**: React 18 with Next.js 14
- **Backend**: Next.js API Routes
- **Database**: SQLite with Prisma ORM
- **Authentication**: NextAuth.js
- **Styling**: Tailwind CSS
- **File Parsing**: xlsx, papaparse

### Project Structure

```
analyzer-web/
├── app/                    # Next.js app directory
│   ├── api/               # API routes
│   ├── login/             # Login page
│   └── page.tsx           # Main application page
├── components/            # React components
├── lib/                   # Shared utilities
│   ├── auth.ts           # Authentication configuration
│   ├── api-security.ts   # Security utilities
│   ├── env-validation.ts # Environment validation
│   └── types.ts          # TypeScript definitions
├── prisma/               # Database schema and migrations
│   ├── schema.prisma     # Database schema
│   ├── init-admin.ts     # Admin initialization script
│   └── seeds/            # Test data (dev/test only)
├── services/             # Business logic layer
└── types/                # TypeScript type definitions
```

## 🛡️ Security Features

### Authentication
- Secure password hashing (bcrypt, cost factor 12)
- Failed login attempt tracking (5 attempts, 15-minute lockout)
- Session management with device tracking
- NextAuth CSRF protection

### Authorization
- Role-based permissions (Admin, Manager, Analyst, Auditor)
- Fine-grained access control for operations
- Permission validation on all protected routes

### Audit Logging
- All user actions logged with timestamps
- IP address and device fingerprinting
- Session tracking throughout lifecycle
- Tamper detection via hash chain

### Security Headers
- Content Security Policy (CSP)
- HTTP Strict Transport Security (HSTS)
- X-Frame-Options: DENY
- X-Content-Type-Options: nosniff
- Referrer-Policy
- Permissions-Policy

### Rate Limiting
- In-memory rate limiting for single-instance deployments
- Configurable limits per endpoint
- IP-based and user-based throttling

**Note**: For multi-instance deployments, implement Redis-backed rate limiting.

## 📦 Deployment

### Production Checklist

See [PRODUCTION_DEPLOYMENT_CHECKLIST.md](PRODUCTION_DEPLOYMENT_CHECKLIST.md) for comprehensive deployment guide.

**Key Steps:**
1. ✅ Configure environment variables securely
2. ✅ Generate strong NEXTAUTH_SECRET
3. ✅ Initialize production database
4. ✅ Create secure admin account
5. ✅ Build application for production
6. ✅ Verify security headers
7. ✅ Test authentication flow
8. ✅ Enable HTTPS in production

### Known Limitations

#### Single-Instance Deployment
- In-memory rate limiting resets on restart
- Login attempt tracking resets on restart
- For multi-instance, implement Redis

#### SQLite Limitations
- Limited concurrent write performance
- Single database file (not horizontally scalable)
- Consider PostgreSQL/MySQL for high-volume deployments

## 🧪 Testing

```bash
# Run linter
npm run lint

# Type checking
npx tsc --noEmit
```

For development/testing seed data:
```bash
npx prisma db seed
```

## 📄 License

[Add your license information]

## 🤝 Support

For security issues or banking compliance questions, contact:
- Security Team: [security contact]
- Compliance Team: [compliance contact]

---

**⚠️ Security Notice**: This application handles sensitive financial data. Ensure all deployment follows your organization's security policies and banking compliance requirements.
