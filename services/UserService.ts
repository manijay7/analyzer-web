// User Service - Handles all user-related database operations
import { BaseService } from './BaseService';
import { Prisma } from '@prisma/client';
import { hash, compare } from 'bcryptjs';

// Type definitions for User entity
type User = Prisma.UserGetPayload<{}>;
type UserWithoutPassword = Omit<User, 'password'>;

export interface CreateUserInput {
  email: string;
  name: string;
  password: string;
  role?: string;
  status?: string;
  avatar?: string;
}

export interface UpdateUserInput {
  name?: string;
  email?: string;
  role?: string;
  status?: string;
  avatar?: string;
}

export class UserService extends BaseService {
  /**
   * Create a new user with hashed password
   */
  async createUser(input: CreateUserInput): Promise<User> {
    try {
      const hashedPassword = await hash(input.password, 12);
      
      const user = await this.prisma.user.create({
        data: {
          email: input.email.toLowerCase(),
          name: input.name,
          password: hashedPassword,
          role: input.role || 'ANALYST',
          status: input.status || 'active',
          avatar: input.avatar || this.generateAvatar(input.name),
        },
      });
      
      return user;
    } catch (error) {
      this.handleError(error, 'UserService.createUser');
    }
  }
  
  /**
   * Find user by email
   */
  async findUserByEmail(email: string): Promise<User | null> {
    try {
      return await this.prisma.user.findUnique({
        where: { email: email.toLowerCase() },
      });
    } catch (error) {
      this.handleError(error, 'UserService.findUserByEmail');
    }
  }
  
  /**
   * Find user by ID
   */
  async findUserById(id: string): Promise<User | null> {
    try {
      return await this.prisma.user.findUnique({
        where: { id },
      });
    } catch (error) {
      this.handleError(error, 'UserService.findUserById');
    }
  }
  
  /**
   * Get all users (excluding password)
   */
  async getAllUsers(): Promise<UserWithoutPassword[]> {
    try {
      const users = await this.prisma.user.findMany({
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          status: true,
          avatar: true,
          mfaEnabled: true,
          mfaSecret: true,
          lastLogin: true,
          failedLoginAttempts: true,
          lockedUntil: true,
          passwordChangedAt: true,
          createdAt: true,
          updatedAt: true,
        },
        orderBy: { name: 'asc' },
      });
      
      return users as UserWithoutPassword[];
    } catch (error) {
      this.handleError(error, 'UserService.getAllUsers');
    }
  }
  
  /**
   * Update user details
   */
  async updateUser(id: string, input: UpdateUserInput): Promise<User> {
    try {
      return await this.prisma.user.update({
        where: { id },
        data: input,
      });
    } catch (error) {
      this.handleError(error, 'UserService.updateUser');
    }
  }
  
  /**
   * Delete user
   */
  async deleteUser(id: string): Promise<User> {
    try {
      return await this.prisma.user.delete({
        where: { id },
      });
    } catch (error) {
      this.handleError(error, 'UserService.deleteUser');
    }
  }
  
  /**
   * Verify user password
   */
  async verifyPassword(user: User, password: string): Promise<boolean> {
    try {
      return await compare(password, user.password);
    } catch (error) {
      this.handleError(error, 'UserService.verifyPassword');
    }
  }
  
  /**
   * Update user's last login timestamp
   */
  async updateLastLogin(userId: string): Promise<void> {
    try {
      await this.prisma.user.update({
        where: { id: userId },
        data: {
          lastLogin: new Date(),
          failedLoginAttempts: 0,
        },
      });
    } catch (error) {
      this.handleError(error, 'UserService.updateLastLogin');
    }
  }
  
  /**
   * Increment failed login attempts
   */
  async incrementFailedLogins(userId: string): Promise<number> {
    try {
      const user = await this.prisma.user.update({
        where: { id: userId },
        data: {
          failedLoginAttempts: { increment: 1 },
        },
      });
      return user.failedLoginAttempts;
    } catch (error) {
      this.handleError(error, 'UserService.incrementFailedLogins');
    }
  }
  
  /**
   * Lock user account
   */
  async lockUser(userId: string, lockUntil: Date): Promise<void> {
    try {
      await this.prisma.user.update({
        where: { id: userId },
        data: {
          status: 'locked',
          lockedUntil: lockUntil,
        },
      });
    } catch (error) {
      this.handleError(error, 'UserService.lockUser');
    }
  }
  
  /**
   * Generate avatar initials from name
   */
  private generateAvatar(name: string): string {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .substring(0, 2)
      .toUpperCase();
  }
}

// Export singleton instance
export const userService = new UserService();
