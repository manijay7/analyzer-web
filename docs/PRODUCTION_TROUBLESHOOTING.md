# Production Authentication Troubleshooting Guide

## 🚨 "Invalid Credentials" Error in Production

If you're getting "invalid credentials" after deploying to production, follow this systematic troubleshooting guide.

---

## Quick Diagnostic Steps

### Step 1: Run the Diagnostic Tool

```bash
npx ts-node -P tsconfig.scripts.json prisma/diagnose-production.ts
```

This will check:

- Environment variables
- Database connection
- User accounts
- Password verification
- Recent login attempts

### Step 2: Verify Environment Variables

**Critical Variables for Authentication:**

```bash
# Check if set (don't print the actual values in production!)
echo "NEXTAUTH_SECRET set: $([[ -n "$NEXTAUTH_SECRET" ]] && echo "YES" || echo "NO")"
echo "NEXTAUTH_URL: $NEXTAUTH_URL"
echo "NODE_ENV: $NODE_ENV"
```

**Common Issues:**

1. ❌ **NEXTAUTH_SECRET not set**

   ```bash
   # Generate a new secret
   openssl rand -base64 32

   # Add to .env file
   echo "NEXTAUTH_SECRET=<your-secret-here>" >> .env
   ```

2. ❌ **NEXTAUTH_SECRET different between build and runtime**

   - If you changed NEXTAUTH_SECRET after building, you MUST rebuild

   ```bash
   npm run build
   ```

3. ❌ **NEXTAUTH_URL doesn't match production domain**
   ```bash
   # Should be your actual production URL
   NEXTAUTH_URL=https://your-domain.com  # ✅ Correct
   NEXTAUTH_URL=http://localhost:3000    # ❌ Wrong in production
   ```

### Step 3: Check Database Users

```bash
npm run check-users
```

**Expected Output:**

```
Found 1 user(s):

1. admin@yourcompany.com
   Role: ADMIN
   Status: active
   Failed Attempts: 0
   Last Login: 2025-12-22T...
```

**Common Issues:**

1. ❌ **No users found**

   ```bash
   # Initialize admin user
   npm run init-admin
   ```

2. ❌ **Account is locked**

   ```bash
   # Reset password (this also unlocks)
   npm run reset-password
   ```

3. ❌ **Wrong email address**
   - Check the exact email from `npm run check-users`
   - Emails are case-insensitive but must match exactly

---

## Common Root Causes

### 1. Wrong Password

**Symptoms:**

- Works in development, fails in production
- "Invalid credentials" error

**Causes:**

- Using development password in production
- Password was changed but you're using old password
- Account was initialized with different password

**Solution:**

```bash
# Reset the password to a known value
npm run reset-password

# Enter the email
# Enter new password (12+ chars, mixed complexity)
# Confirm password
```

---

### 2. Environment Variable Issues

**Symptoms:**

- Login page loads but authentication fails
- Session doesn't persist
- Random logouts

**Causes:**

- NEXTAUTH_SECRET not set or changed after build
- NEXTAUTH_URL doesn't match production domain
- Environment variables not loaded

**Solution:**

```bash
# 1. Check your .env file exists in production
ls -la .env

# 2. Verify it's loaded (careful not to expose secrets!)
node -e "require('dotenv').config(); console.log('NEXTAUTH_SECRET:', process.env.NEXTAUTH_SECRET ? 'SET' : 'NOT SET')"

# 3. If using PM2 or systemd, ensure env vars are loaded
pm2 restart analyzer-web --update-env

# 4. Rebuild if NEXTAUTH_SECRET changed
npm run build
```

---

### 3. Database Not Initialized

**Symptoms:**

- "Invalid credentials" even with correct password
- No users in database

**Causes:**

- Migrations not run in production
- Using wrong database file
- Database file permissions

**Solution:**

```bash
# 1. Run migrations
npx prisma migrate deploy

# 2. Initialize admin user
npm run init-admin

# 3. Check database file exists and has correct path
# From .env: DATABASE_URL="file:./production.db"
ls -la prisma/production.db

# 4. Ensure proper permissions (read/write for app user)
chmod 644 prisma/production.db
```

---

### 4. Password Hash Corruption

**Symptoms:**

- Diagnostic tool shows password is invalid
- Password was never changed

**Causes:**

- Database corruption
- Migration issue
- Encoding problems during database copy

**Solution:**

```bash
# Reset the password
npm run reset-password

# If problem persists, check the hash format
npx ts-node -P tsconfig.scripts.json -e "
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
prisma.user.findFirst().then(user => {
  console.log('Hash starts with:', user.password.substring(0, 10));
  console.log('Is bcrypt:', user.password.startsWith('$2a$') || user.password.startsWith('$2b$'));
});
"
```

Expected output:

```
Hash starts with: $2b$12$...
Is bcrypt: true
```

---

### 5. Session/Cookie Issues

**Symptoms:**

- Login appears to work but immediately logs out
- Session doesn't persist
- Works in incognito but not in normal browser

**Causes:**

- Cookie domain mismatch
- HTTPS/HTTP mismatch
- Browser blocking cookies

**Solution:**

1. **Check NEXTAUTH_URL matches exactly:**

   ```bash
   # If you access via https://app.company.com
   NEXTAUTH_URL=https://app.company.com  # ✅ Must match exactly

   # Not:
   NEXTAUTH_URL=http://app.company.com   # ❌ Wrong protocol
   NEXTAUTH_URL=https://company.com      # ❌ Wrong domain
   ```

2. **Verify HTTPS in production:**

   - NextAuth requires HTTPS in production for secure cookies
   - Check your reverse proxy (nginx, Apache) is configured for HTTPS

3. **Clear browser cookies:**
   - Open DevTools → Application → Cookies
   - Delete `next-auth.session-token` cookie
   - Try logging in again

---

## Advanced Debugging

### Enable Detailed Logging

Add to your `.env`:

```bash
# Enable NextAuth debug logging
NEXTAUTH_DEBUG=true
```

Then check application logs for detailed auth flow.

### Check Network Requests

1. Open browser DevTools → Network tab
2. Try to log in
3. Look for `/api/auth/` requests
4. Check response status and body

**Expected flow:**

```
POST /api/auth/callback/credentials → 200 OK
GET  /api/auth/session → 200 OK (returns user data)
```

### Test Password Directly

```bash
# Test if password matches hash
npx ts-node -P tsconfig.scripts.json prisma/test-password.ts
```

---

## Prevention Checklist

Before deploying to production:

- [ ] Generate strong NEXTAUTH_SECRET (32+ chars)
- [ ] Set NEXTAUTH_URL to production domain (HTTPS)
- [ ] Run `npx prisma migrate deploy`
- [ ] Run `npm run init-admin` with strong password
- [ ] Document the admin email/password securely
- [ ] Test login BEFORE going live
- [ ] Verify environment variables are loaded
- [ ] Check database file permissions
- [ ] Enable HTTPS/TLS
- [ ] Test from different browsers

---

## Quick Fixes Summary

| Problem                 | Quick Fix                                 |
| ----------------------- | ----------------------------------------- |
| No users in database    | `npm run init-admin`                      |
| Account locked          | `npm run reset-password`                  |
| Wrong password          | `npm run reset-password`                  |
| NEXTAUTH_SECRET not set | Add to `.env`, then `npm run build`       |
| NEXTAUTH_URL wrong      | Update `.env`, restart app                |
| Session not persisting  | Check NEXTAUTH_URL matches domain exactly |
| Database not found      | Check DATABASE_URL path in `.env`         |

---

## Getting Help

If the issue persists after following this guide:

1. **Collect diagnostic information:**

   ```bash
   # Run diagnostic
   npx ts-node -P tsconfig.scripts.json prisma/diagnose-production.ts > diagnostic-output.txt

   # Check users (redact sensitive info before sharing)
   npm run check-users > users-output.txt

   # Check application logs
   pm2 logs analyzer-web --lines 100 > app-logs.txt
   ```

2. **Check for common patterns in logs:**

   - "NEXTAUTH_SECRET environment variable is not set"
   - "Database connection failed"
   - "Account is locked"
   - "Too many failed attempts"

3. **Verify your production environment:**
   - Node.js version: `node --version` (should be 18+)
   - Package versions: `npm list next next-auth @prisma/client`
   - System: `uname -a` (Linux) or `systeminfo` (Windows)

---

## Additional Resources

- [Production Deployment Checklist](./PRODUCTION_DEPLOYMENT_CHECKLIST.md)
- [Login Credentials Guide](./LOGIN_CREDENTIALS.md)
- [NextAuth.js Documentation](https://next-auth.js.org/)
- [Prisma Documentation](https://www.prisma.io/docs/)
