import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting database seed...");

  const password = await hash("StrongestBold10!", 12);

  // Create users with comprehensive fields
  const users = [
    {
      email: "admin@analyzerweb.com",
      name: "System Admin",
      role: "ADMIN",
      avatar: "AD",
      status: "active",
    },
    {
      email: "manager@analyzerweb.com",
      name: "Manager User",
      role: "MANAGER",
      avatar: "MU",
      status: "active",
    },
    {
      email: "officer@analyzerweb.com",
      name: "Officer Analyst",
      role: "ANALYST",
      avatar: "RA",
      status: "active",
    },
  ];

  console.log("👥 Creating users...");
  for (const u of users) {
    const user = await prisma.user.upsert({
      where: { email: u.email },
      update: {},
      create: {
        email: u.email,
        name: u.name,
        password,
        role: u.role as any,
        avatar: u.avatar,
        status: u.status as any,
        mfaEnabled: false,
        failedLoginAttempts: 0,
      },
    });
    console.log(`   ✓ Created user: ${user.name} (${user.email})`);
  }

  // Create sample financial periods
  console.log("\n📅 Creating financial periods...");
  const periods = [
    {
      name: "Q4 2024",
      startDate: "2024-10-01",
      endDate: "2024-12-31",
      isClosed: false,
      notes: "Current active period",
    },
    {
      name: "Q3 2024",
      startDate: "2024-07-01",
      endDate: "2024-09-30",
      isClosed: true,
      closedAt: new Date("2024-10-05"),
      closedBy: "admin@analyzerweb.com",
      notes: "Closed period - all transactions locked",
    },
  ];

  for (const period of periods) {
    const created = await prisma.financialPeriod.upsert({
      where: { name: period.name },
      update: {},
      create: period,
    });
    console.log(
      `   ✓ Created period: ${created.name} (${
        created.isClosed ? "Closed" : "Open"
      })`
    );
  }

  // Create sample audit log entries
  console.log("\n📝 Creating initial audit log entries...");
  const adminUser = await prisma.user.findUnique({
    where: { email: "admin@analyzerweb.com" },
  });

  if (adminUser) {
    await prisma.auditLog.create({
      data: {
        userId: adminUser.id,
        actionType: "LOGIN",
        entityType: "USER",
        entityId: adminUser.id,
        changeSummary: "System initialization - Admin first login",
        ipAddress: "127.0.0.1",
        sessionId: "seed-session-001",
      },
    });
    console.log("   ✓ Created initial audit log entry");
  }

  console.log("\n✅ Seeding completed successfully!");
  console.log("\n📊 Summary:");
  console.log(`   - Users: ${users.length}`);
  console.log(`   - Financial Periods: ${periods.length}`);
  console.log("\n🔐 Login credentials:");
  console.log(
    "   Email: admin@analyzerweb.com, sarah@analyzerweb.com, john@analyzerweb.com, alex@analyzerweb.com"
  );
  console.log("   Password: password123");
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error("❌ Seeding failed:", e);
    await prisma.$disconnect();
    process.exit(1);
  });
