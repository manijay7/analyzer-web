# 🚨 QUICK FIX: Invalid Credentials in Production

## Immediate Steps to Fix

### 1. Run the Diagnostic Tool (2 minutes)

```bash
npm run diagnose
```

**This will tell you exactly what's wrong.** Follow the prompts to:

- Check environment variables
- Verify database connection
- Test password verification
- Review recent login attempts

---

### 2. Most Likely Causes & Fixes

#### ❌ Cause #1: NEXTAUTH_SECRET Not Set or Changed

**Check:**

```bash
# In your production server
echo $NEXTAUTH_SECRET
```

**If empty or different from build time:**

```bash
# 1. Generate a new secret
openssl rand -base64 32

# 2. Add to .env file
nano .env
# Add: NEXTAUTH_SECRET=<paste-your-secret-here>

# 3. IMPORTANT: Rebuild the application
npm run build

# 4. Restart the server
pm2 restart analyzer-web
# OR
npm start
```

---

#### ❌ Cause #2: Wrong NEXTAUTH_URL

**Check:**

```bash
# Should match your production domain exactly
echo $NEXTAUTH_URL
```

**Fix:**

```bash
# Edit .env
nano .env

# Set to your actual domain (HTTPS in production)
NEXTAUTH_URL=https://your-production-domain.com

# Restart (no rebuild needed for this)
pm2 restart analyzer-web
```

---

#### ❌ Cause #3: No Users in Database

**Check:**

```bash
npm run check-users
```

**If you see "No users found":**

```bash
# Initialize admin user
npm run init-admin

# Follow prompts to create admin account
# Password must be 12+ characters with complexity
```

---

#### ❌ Cause #4: Account Locked

**Check:**

```bash
npm run check-users
```

**If you see "Locked Until" status:**

```bash
# Reset password (this also unlocks)
npm run reset-password

# Enter the locked user's email
# Set a new password
```

---

#### ❌ Cause #5: Wrong Password

**If diagnostic shows "PASSWORD IS INVALID":**

```bash
# Reset the password
npm run reset-password

# Enter the user's email
# Set a new password
# Try logging in with the new password
```

---

### 3. Verify Environment File Exists

```bash
# Check .env exists in production directory
ls -la .env

# If missing, create from template
cp .env.template .env

# Edit with your values
nano .env
```

**Required variables:**

```env
NODE_ENV=production
NEXTAUTH_SECRET=<your-32-char-secret>
NEXTAUTH_URL=https://your-domain.com
DATABASE_URL=file:./prisma/production.db
```

---

### 4. Verify Database

```bash
# Check database file exists
ls -la prisma/*.db

# If missing, run migrations and init
npx prisma migrate deploy
npm run init-admin
```

---

## Complete Fix Workflow

If you're still stuck, follow this complete workflow:

```bash
# 1. Stop the application
pm2 stop analyzer-web

# 2. Generate new secret
SECRET=$(openssl rand -base64 32)
echo "NEXTAUTH_SECRET=$SECRET"

# 3. Update .env file
cat > .env << EOF
NODE_ENV=production
NEXTAUTH_SECRET=$SECRET
NEXTAUTH_URL=https://your-actual-domain.com
DATABASE_URL=file:./prisma/production.db
EOF

# 4. Run migrations
npx prisma migrate deploy

# 5. Initialize admin (or reset password)
npm run reset-password
# OR
npm run init-admin

# 6. Rebuild
npm run build

# 7. Start
pm2 start npm --name "analyzer-web" -- start

# 8. Test
npm run diagnose
```

---

## Quick Test Commands

```bash
# Test 1: Check environment is loaded
node -e "require('dotenv').config(); console.log('Secret set:', !!process.env.NEXTAUTH_SECRET)"

# Test 2: Check database connection
npx prisma db push

# Test 3: List users
npm run check-users

# Test 4: Full diagnostic
npm run diagnose
```

---

## Common Mistakes

1. ❌ **Changing NEXTAUTH_SECRET without rebuilding**

   - **Fix:** Always run `npm run build` after changing NEXTAUTH_SECRET

2. ❌ **Using http:// in NEXTAUTH_URL when accessing via https://**

   - **Fix:** Match the protocol exactly

3. ❌ **Using localhost in NEXTAUTH_URL in production**

   - **Fix:** Use actual domain name

4. ❌ **Database file doesn't exist or wrong path**

   - **Fix:** Check DATABASE_URL path, run `npx prisma migrate deploy`

5. ❌ **Trying development password in production**
   - **Fix:** Reset password for production environment

---

## Still Not Working?

1. **Enable debug mode:**

   ```bash
   # Add to .env
   echo "NEXTAUTH_DEBUG=true" >> .env
   pm2 restart analyzer-web

   # Check logs
   pm2 logs analyzer-web
   ```

2. **Check browser console:**

   - Open DevTools (F12)
   - Go to Console tab
   - Try to log in
   - Look for errors

3. **Check network requests:**

   - Open DevTools → Network tab
   - Try to log in
   - Check `/api/auth/` requests
   - Look for 401/403/500 errors

4. **Read detailed guide:**
   - See: [PRODUCTION_TROUBLESHOOTING.md](./docs/PRODUCTION_TROUBLESHOOTING.md)

---

## Need Help?

Run this command and send the output (redact sensitive info):

```bash
npm run diagnose 2>&1 | tee diagnostic-output.txt
```
