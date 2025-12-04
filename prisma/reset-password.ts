import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";
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

function promptPassword(question: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    let password = "";

    process.stdout.write(question);

    if (process.stdin.isTTY) {
      process.stdin.setRawMode(true);
    }

    process.stdin.on("data", (char) => {
      const charStr = char.toString();

      if (charStr === "\n" || charStr === "\r" || charStr === "\u0004") {
        if (process.stdin.isTTY) {
          process.stdin.setRawMode(false);
        }
        process.stdin.pause();
        process.stdout.write("\n");
        rl.close();
        resolve(password);
      } else if (charStr === "\u0003") {
        process.exit(0);
      } else if (charStr === "\u007f" || charStr === "\b") {
        if (password.length > 0) {
          password = password.slice(0, -1);
          process.stdout.write("\b \b");
        }
      } else {
        password += charStr;
        process.stdout.write("*");
      }
    });
  });
}

async function resetPassword() {
  try {
    console.log("\n=== Password Reset Tool ===\n");

    const email = await prompt("Enter user email: ");

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!user) {
      console.log("❌ User not found");
      return;
    }

    console.log(`✓ Found user: ${user.name} (${user.role})\n`);

    const newPassword = await promptPassword("Enter new password: ");
    const confirmPassword = await promptPassword("Confirm new password: ");

    if (newPassword !== confirmPassword) {
      console.log("\n❌ Passwords do not match!");
      return;
    }

    if (newPassword.length < 8) {
      console.log("\n❌ Password must be at least 8 characters long!");
      return;
    }

    console.log("\n⏳ Hashing password...");
    const hashedPassword = await hash(newPassword, 12);

    console.log("⏳ Updating user...");
    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        failedLoginAttempts: 0,
        status: "active",
        lockedUntil: null,
      },
    });

    console.log("\n✅ Password successfully reset!");
    console.log(`   User: ${user.email}`);
    console.log("   You can now log in with the new password.");
  } catch (error: any) {
    console.error("\n❌ Error:", error.message);
  } finally {
    await prisma.$disconnect();
  }
}

resetPassword();
