import { PrismaClient } from "@prisma/client";
import { compare } from "bcryptjs";
import * as readline from "readline";

const prisma = new PrismaClient();

function prompt(question: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

async function testPassword() {
  try {
    console.log("\n=== Password Verification Test ===\n");

    const email = await prompt("Enter email: ");
    const password = await prompt("Enter password: ");

    console.log(`\nTesting login for: ${email}`);

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!user) {
      console.log("❌ User not found");
      return;
    }

    console.log(`✓ User found: ${user.name}`);
    console.log(`  Status: ${user.status}`);
    console.log(`  Role: ${user.role}`);

    const isValid = await compare(password, user.password);

    if (isValid) {
      console.log("\n✅ PASSWORD IS CORRECT - Login should work!");
    } else {
      console.log("\n❌ PASSWORD IS INCORRECT - This is why login is failing!");
      console.log(
        "\nIf this user was created via seed script, try: password123"
      );
      console.log(
        "If created via init-admin script, use the password you entered during setup."
      );
    }
  } catch (error: any) {
    console.error("❌ Error:", error.message);
  } finally {
    await prisma.$disconnect();
  }
}

testPassword();
