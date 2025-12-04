

import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "@/lib/prisma";
import { compare } from "bcryptjs";
import { MAX_LOGIN_ATTEMPTS, LOCKOUT_TIME_MS } from "@/lib/constants";
import { UserRole } from "@/lib/types";
import { userService } from "@/services/UserService";
import { auditService } from "@/services/AuditService";
import crypto from "crypto";

// In-memory login attempts tracking
// WARNING: This implementation resets on server restart and doesn't work across multiple instances
// For production multi-instance deployments, replace with Redis or database-backed storage
const loginAttempts: Record<string, { count: number, lockUntil: number }> = {};

// Validate required environment variables
if (!process.env.NEXTAUTH_SECRET) {
  throw new Error(
    'NEXTAUTH_SECRET environment variable is not set. ' +
    'This is required for production deployment. ' +
    'Generate a secure secret with: openssl rand -base64 32'
  );
}

export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  session: {
    strategy: "jwt",
    maxAge: 24 * 60 * 60, // 24 hours
    updateAge: 60 * 60, // Update session every hour
  },
  pages: {
    signIn: "/login",
  },
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const email = credentials.email.toLowerCase();

        // Check Lockout
        const attempt = loginAttempts[email];
        if (attempt && attempt.lockUntil > Date.now()) {
            throw new Error(`Account locked. Try again in ${Math.ceil((attempt.lockUntil - Date.now()) / 60000)} minutes.`);
        }

        try {
          // 1. Find user in database
          const user = await prisma.user.findUnique({
            where: { email }
          });

          if (user) {
            // Check user status
            if (user.status === 'locked') {
              // Check if lock has expired
              if (user.lockedUntil && user.lockedUntil > new Date()) {
                throw new Error(`Account is locked until ${user.lockedUntil.toLocaleString()}.`);
              } else if (user.lockedUntil && user.lockedUntil <= new Date()) {
                // Unlock account if lock period expired
                await prisma.user.update({
                  where: { id: user.id },
                  data: { status: 'active', lockedUntil: null, failedLoginAttempts: 0 },
                });
              }
            }
            
            if (user.status === 'inactive') {
              throw new Error("Account is inactive. Please contact administrator.");
            }

            const isPasswordValid = await compare(credentials.password, user.password);
            
            if (!isPasswordValid) {
              // Record failed attempt in database
              const failedAttempts = await userService.incrementFailedLogins(user.id);
              
              // Lock account if max attempts reached
              if (failedAttempts >= MAX_LOGIN_ATTEMPTS) {
                const lockUntil = new Date(Date.now() + LOCKOUT_TIME_MS);
                await userService.lockUser(user.id, lockUntil);
                
                // Log failed login with lockout
                await auditService.createAuditLog({
                  userId: user.id,
                  actionType: 'LOGIN',
                  entityType: 'USER',
                  entityId: user.id,
                  changeSummary: `Failed login attempt - Account locked until ${lockUntil.toLocaleString()}`,
                  ipAddress: 'Unknown', // Will be added via middleware in Phase 1.4
                });
                
                throw new Error(`Too many failed attempts. Account locked until ${lockUntil.toLocaleString()}.`);
              }
              
              // Log failed attempt
              await auditService.createAuditLog({
                userId: user.id,
                actionType: 'LOGIN',
                entityType: 'USER',
                entityId: user.id,
                changeSummary: `Failed login attempt (${failedAttempts}/${MAX_LOGIN_ATTEMPTS})`,
              });
              
              return null;
            }

            // Success - Update last login and reset failed attempts
            await userService.updateLastLogin(user.id);
            
            // Create device session for tracking
            const sessionToken = crypto.randomBytes(32).toString('hex');
            const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
            
            await prisma.deviceSession.create({
              data: {
                userId: user.id,
                device: 'Web Browser', // Note: Enhanced device fingerprinting requires middleware context
                ip: 'API Context', // Note: IP address requires request context from API route
                token: sessionToken,
                expiresAt,
                isCurrent: true,
              },
            });
            
            // Log successful login
            await auditService.createAuditLog({
              userId: user.id,
              actionType: 'LOGIN',
              entityType: 'USER',
              entityId: user.id,
              changeSummary: 'Successful login',
              sessionId: sessionToken,
            });

            return {
              id: user.id,
              email: user.email,
              name: user.name,
              role: user.role as UserRole,
              avatar: user.avatar || 'U',
              image: user.avatar,
              sessionToken, // Pass session token for tracking
            };
          }
        } catch (error: any) {
          // If the error message is one of our custom ones, rethrow it
          if (error.message.includes("Account is") || error.message.includes("locked") || error.message.includes("Too many")) {
            throw error;
          }
          console.warn("Database auth error:", error);
        }

        // Failed to find user or verify password
        return null;
      }
    })
  ],
  callbacks: {
    async session({ session, token }) {
      if (token && session.user) {
        (session.user as any).id = token.id as string;
        (session.user as any).name = token.name as string;
        (session.user as any).email = token.email as string;
        (session.user as any).role = token.role as UserRole;
        (session.user as any).avatar = token.avatar as string;
        (session.user as any).sessionToken = token.sessionToken as string;
      }
      return session;
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.name = user.name;
        token.email = user.email;
        token.role = user.role;
        token.avatar = user.avatar;
        token.sessionToken = (user as any).sessionToken;
      }
      return token;
    },
  },
  events: {
    async signOut({ token }) {
      // Log logout event
      if (token?.id) {
        try {
          await auditService.createAuditLog({
            userId: token.id as string,
            actionType: 'LOGOUT',
            entityType: 'USER',
            entityId: token.id as string,
            changeSummary: 'User logged out',
            sessionId: token.sessionToken as string,
          });
          
          // Mark device session as inactive
          if (token.sessionToken) {
            await prisma.deviceSession.updateMany({
              where: {
                token: token.sessionToken as string,
              },
              data: {
                isCurrent: false,
              },
            });
          }
        } catch (error) {
          console.error('Error logging signOut:', error);
        }
      }
    },
  },
};
