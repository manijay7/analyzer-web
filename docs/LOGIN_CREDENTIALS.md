# Login Credentials & User Management

## Current Database Users

The database was initialized with the seed script. All users share the same default password.

### Default Login Credentials

**Admin User:**

```
Email: admin@analyzerweb.com
Password: password123
Role: ADMIN
```

**Other Available Users:**

```
Email: sarah@analyzerweb.com
Password: password123
Role: MANAGER

Email: john@analyzerweb.com
Password: password123
Role: ANALYST

Email: alex@analyzerweb.com
Password: password123
Role: AUDITOR
```

## Password Management Scripts

### Check Database Users

View all users and their status:

```bash
npm run check-users
```

### Reset Password

Reset password for any user:

```bash
npm run reset-password
```

Follow the prompts to:

1. Enter the user's email
2. Enter new password
3. Confirm password

The script will:

- Hash the password securely with bcrypt
- Reset failed login attempts to 0
- Unlock the account if locked
- Set status to active

## Troubleshooting Login Issues

If you're getting "Invalid credentials" errors:

1. **Verify the correct password is being used**

   - Seed script users: `password123`
   - Init-admin users: Password you entered during setup

2. **Check if account is locked**

   ```bash
   npm run check-users
   ```

   Look for "Locked Until" status

3. **Reset the password**

   ```bash
   npm run reset-password
   ```

4. **Test password verification**
   Run the test script:
   ```bash
   npx ts-node -P tsconfig.scripts.json prisma/test-password.ts
   ```

## Security Notes

⚠️ **IMPORTANT for Production:**

- Change all default passwords immediately
- Never use `password123` in production
- Use strong passwords (12+ characters, mixed case, numbers, symbols)
- Enable MFA for admin accounts
- Regularly rotate passwords
- Monitor failed login attempts in audit logs

## Creating New Admin Users

To create additional admin users with secure passwords:

```bash
npm run init-admin
```

Note: This will fail if an admin user already exists. To create additional admins, use Prisma Studio or create a user management interface.
