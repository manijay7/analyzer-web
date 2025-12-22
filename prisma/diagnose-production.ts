/**
 * Production Authentication Diagnostic Tool
 *
 * Run with: npx ts-node -P tsconfig.scripts.json prisma/diagnose-production.ts
 *
 * This script helps diagnose authentication issues in production
 */

import { PrismaClient } from "@prisma/client";
import { compare, hash } from "bcryptjs";
import * as readline from "readline";

const prisma = new PrismaClient();

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function question(query: string): Promise<string> {
  return new Promise((resolve) => rl.question(query, resolve));
}

async function main() {
  console.log("\n=================================================");
  console.log("🔍 PRODUCTION AUTHENTICATION DIAGNOSTIC TOOL");
  console.log("=================================================\n");

  // 1. Check environment variables
  console.log("📋 STEP 1: Environment Configuration Check\n");

  const envChecks = {
    NODE_ENV: process.env.NODE_ENV,
    NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET ? "✅ Set" : "❌ NOT SET",
    NEXTAUTH_URL: process.env.NEXTAUTH_URL,
    DATABASE_URL: process.env.DATABASE_URL ? "✅ Set" : "❌ NOT SET",
  };

  for (const [key, value] of Object.entries(envChecks)) {
    console.log(`  ${key}: ${value}`);
  }

  if (!process.env.NEXTAUTH_SECRET) {
    console.log("\n❌ CRITICAL: NEXTAUTH_SECRET is not set!");
    console.log("   Generate with: openssl rand -base64 32\n");
    process.exit(1);
  }

  if (process.env.NEXTAUTH_SECRET.length < 32) {
    console.log(
      "\n⚠️  WARNING: NEXTAUTH_SECRET is too short (less than 32 chars)"
    );
  }

  // 2. Check database connection
  console.log("\n📋 STEP 2: Database Connection Check\n");

  try {
    await prisma.$connect();
    console.log("  ✅ Database connection successful\n");
  } catch (error) {
    console.log("  ❌ Database connection failed:", error);
    process.exit(1);
  }

  // 3. List all users
  console.log("📋 STEP 3: User Account Check\n");

  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      status: true,
      failedLoginAttempts: true,
      lockedUntil: true,
      lastLogin: true,
      createdAt: true,
    },
    orderBy: {
      createdAt: "asc",
    },
  });

  if (users.length === 0) {
    console.log("  ❌ NO USERS FOUND IN DATABASE!");
    console.log("  ⚡ Run: npm run init-admin\n");
    process.exit(1);
  }

  console.log(`  Found ${users.length} user(s):\n`);

  users.forEach((user, index) => {
    console.log(`  ${index + 1}. ${user.email}`);
    console.log(`     Name: ${user.name}`);
    console.log(`     Role: ${user.role}`);
    console.log(`     Status: ${user.status}`);
    console.log(`     Failed Attempts: ${user.failedLoginAttempts}`);
    if (user.lockedUntil) {
      const isLocked = user.lockedUntil > new Date();
      console.log(
        `     Locked Until: ${user.lockedUntil.toISOString()} ${
          isLocked ? "🔒 LOCKED" : "(expired)"
        }`
      );
    }
    console.log(
      `     Last Login: ${
        user.lastLogin ? user.lastLogin.toISOString() : "Never"
      }`
    );
    console.log(`     Created: ${user.createdAt.toISOString()}`);
    console.log("");
  });

  // 4. Test password verification
  console.log("📋 STEP 4: Password Verification Test\n");

  const email = await question("  Enter email to test: ");
  const password = await question("  Enter password to test: ");

  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase().trim() },
  });

  if (!user) {
    console.log(`\n  ❌ User not found: ${email}`);
    console.log("  Available emails:");
    users.forEach((u) => console.log(`    - ${u.email}`));
    rl.close();
    await prisma.$disconnect();
    return;
  }

  console.log(`\n  ✅ User found: ${user.name} (${user.email})`);
  console.log(`  Status: ${user.status}`);

  // Check account status
  if (user.status === "locked") {
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      console.log(
        `  ❌ Account is LOCKED until ${user.lockedUntil.toISOString()}`
      );
      console.log(`  ⚡ To unlock, run: npm run reset-password\n`);
      rl.close();
      await prisma.$disconnect();
      return;
    }
  }

  if (user.status === "inactive") {
    console.log("  ❌ Account is INACTIVE");
    rl.close();
    await prisma.$disconnect();
    return;
  }

  // Test password
  console.log("\n  Testing password...");
  const isValid = await compare(password, user.password);

  if (isValid) {
    console.log("\n  ✅✅✅ PASSWORD IS VALID! ✅✅✅");
    console.log("\n  The password matches the hash in the database.");
    console.log("  If you still cannot log in, check:");
    console.log("    1. NEXTAUTH_SECRET is the same during build and runtime");
    console.log("    2. NEXTAUTH_URL matches your production domain");
    console.log("    3. Browser cookies are enabled");
    console.log("    4. Check browser console for errors\n");
  } else {
    console.log("\n  ❌❌❌ PASSWORD IS INVALID! ❌❌❌");
    console.log("\n  The password does NOT match the hash in the database.");
    console.log("  To reset the password, run: npm run reset-password\n");

    // Show hash info for debugging
    console.log("  Hash Info (for debugging):");
    console.log(`    Hash in DB: ${user.password.substring(0, 30)}...`);
    console.log(`    Hash length: ${user.password.length}`);
    console.log(
      `    Is bcrypt: ${
        user.password.startsWith("$2a$") || user.password.startsWith("$2b$")
      }`
    );
  }

  // 5. Check recent audit logs
  console.log("\n📋 STEP 5: Recent Login Attempts\n");

  const recentLogs = await prisma.auditLog.findMany({
    where: {
      userId: user.id,
      actionType: "LOGIN",
    },
    orderBy: {
      timestamp: "desc",
    },
    take: 5,
  });

  if (recentLogs.length > 0) {
    console.log(`  Last ${recentLogs.length} login attempt(s):\n`);
    recentLogs.forEach((log, i) => {
      console.log(`  ${i + 1}. ${log.timestamp.toISOString()}`);
      console.log(`     ${log.changeSummary}`);
      console.log("");
    });
  } else {
    console.log("  No login attempts found in audit log\n");
  }

  rl.close();
  await prisma.$disconnect();
}

main().catch((error) => {
  console.error("\n❌ Diagnostic failed:", error);
  process.exit(1);
});
