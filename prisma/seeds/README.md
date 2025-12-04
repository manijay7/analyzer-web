# Test/Development Seeds

This directory contains seed scripts for **testing and development purposes only**.

## ⚠️ WARNING

**DO NOT run these seed scripts in production environments.**

These scripts create:
- Demo users with weak passwords
- Sample financial period data
- Test audit log entries

## Usage

### Development/Testing Environments Only

```bash
# Run the test seed script
npx ts-node --compiler-options {\"module\":\"CommonJS\"} prisma/seeds/seed.ts
```

### Production Environment

For production, use the secure admin initialization script:

```bash
npm run init-admin
```

This will:
- Prompt for secure credentials
- Validate password strength
- Create a single admin user
- Prevent re-initialization if admin exists

## Files

- `seed.ts` - Original seed script with demo data (development/testing only)
