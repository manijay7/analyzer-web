import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Default password for admin resets
const DEFAULT_PASSWORD = "Welcome123!";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Check if user is authenticated and has admin privileges
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only allow admin users to reset passwords (case-insensitive check)
    const userRole = (session.user.role || "").toUpperCase();
    if (userRole !== "ADMIN") {
      console.log(
        "Password reset denied. User role:",
        session.user.role,
        "Normalized:",
        userRole
      );
      return NextResponse.json(
        { error: "Forbidden: Admin access required" },
        { status: 403 }
      );
    }

    const { id } = await params;
    const body = await request.json();

    // Use provided password or default password
    const newPassword = body.newPassword || DEFAULT_PASSWORD;
    const useDefaultPassword = !body.newPassword;

    // Validate input
    if (typeof newPassword !== "string") {
      return NextResponse.json(
        { error: "Invalid password format" },
        { status: 400 }
      );
    }

    if (newPassword.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters long" },
        { status: 400 }
      );
    }

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id },
      select: { id: true, name: true, email: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Hash the new password
    const hashedPassword = await bcrypt.hash(newPassword, 12);

    // Update user password and set mustChangePassword flag using raw SQL
    await prisma.$executeRaw`
      UPDATE User 
      SET 
        password = ${hashedPassword},
        passwordChangedAt = ${new Date().toISOString()},
        updatedAt = ${new Date().toISOString()},
        mustChangePassword = ${useDefaultPassword}
      WHERE id = ${id}
    `;

    // Log the password reset action
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        actionType: "PASSWORD_RESET",
        entityType: "USER",
        entityId: user.id,
        changeSummary: `Admin ${session.user.name} reset password for user ${
          user.name
        } (${user.email})${
          useDefaultPassword ? " - using default password" : ""
        }`,
      },
    });

    return NextResponse.json({
      message: useDefaultPassword
        ? `Password reset to default. User must change password on next login.`
        : "Password reset successfully",
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
      },
      useDefaultPassword,
    });
  } catch (error) {
    console.error("Password reset error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
