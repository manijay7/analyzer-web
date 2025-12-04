import { PrismaClient } from "@prisma/client";
import { compare } from "bcryptjs";

const prisma = new PrismaClient();

async function checkUsers() {
  try {
    console.log("\n=== Checking Database Users ===\n");

    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        status: true,
        password: true,
        failedLoginAttempts: true,
        lockedUntil: true,
      },
    });

    if (users.length === 0) {
      console.log("❌ No users found in database!");
      console.log("   Run: npm run init-admin");
      return;
    }

    console.log(`Found ${users.length} user(s):\n`);

    for (const user of users) {
      console.log(`📧 Email: ${user.email}`);
      console.log(`   Name: ${user.name}`);
      console.log(`   Role: ${user.role}`);
      console.log(`   Status: ${user.status}`);
      console.log(`   Failed Attempts: ${user.failedLoginAttempts}`);
      console.log(`   Locked Until: ${user.lockedUntil || "Not locked"}`);
      console.log(`   Password Hash: ${user.password.substring(0, 20)}...`);
      console.log("");
    }

    // Test password verification for first user
    if (users.length > 0) {
      const testUser = users[0];
      console.log("\n=== Password Hash Analysis ===");
      console.log(`Testing user: ${testUser.email}`);
      console.log(`Hash length: ${testUser.password.length} characters`);
      console.log(
        `Hash format: ${testUser.password.substring(
          0,
          4
        )} (should start with $2a$ or $2b$)`
      );

      // Check if it looks like a bcrypt hash
      const isBcryptHash =
        testUser.password.startsWith("$2a$") ||
        testUser.password.startsWith("$2b$");
      console.log(`Is valid bcrypt format: ${isBcryptHash ? "✅" : "❌"}`);

      if (!isBcryptHash) {
        console.log(
          "\n⚠️  WARNING: Password does not appear to be a bcrypt hash!"
        );
        console.log("   This could be why authentication is failing.");
      }
    }
  } catch (error: any) {
    console.error("❌ Error:", error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkUsers();
