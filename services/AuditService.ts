// Audit Service - Handles all audit logging operations
import { BaseService } from './BaseService';
import { Prisma } from '@prisma/client';
import crypto from 'crypto';

// Type definition for AuditLog entity
type AuditLog = Prisma.AuditLogGetPayload<{}>;

export interface CreateAuditLogInput {
  userId: string;
  sessionId?: string;
  ipAddress?: string;
  deviceFingerprint?: string;
  geolocation?: string;
  actionType: string; // CREATE, UPDATE, DELETE, APPROVE, IMPORT, EXPORT, LOGIN, LOGOUT, MATCH, UNMATCH
  entityType: string; // TRANSACTION, MATCH, USER, ROLE, PERIOD, SNAPSHOT, FILE_IMPORT
  entityId?: string;
  beforeState?: any;
  afterState?: any;
  changeSummary: string;
  justification?: string;
}

export interface AuditLogFilter {
  userId?: string;
  actionType?: string;
  entityType?: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
}

export class AuditService extends BaseService {
  /**
   * Create a new audit log entry with chain verification
   */
  async createAuditLog(input: CreateAuditLogInput): Promise<AuditLog> {
    try {
      // Get the last audit log entry for chain verification
      const lastLog = await this.prisma.auditLog.findFirst({
        orderBy: { timestamp: 'desc' },
        select: { currentHash: true },
      });
      
      // Calculate hashes for tamper detection
      const previousHash = lastLog?.currentHash || null;
      const currentHash = this.calculateHash(input, previousHash);
      
      const auditLog = await this.prisma.auditLog.create({
        data: {
          userId: input.userId,
          sessionId: input.sessionId,
          ipAddress: input.ipAddress,
          deviceFingerprint: input.deviceFingerprint,
          geolocation: input.geolocation,
          actionType: input.actionType,
          entityType: input.entityType,
          entityId: input.entityId,
          beforeState: input.beforeState ? JSON.stringify(input.beforeState) : null,
          afterState: input.afterState ? JSON.stringify(input.afterState) : null,
          changeSummary: input.changeSummary,
          justification: input.justification,
          previousHash,
          currentHash,
        },
      });
      
      return auditLog;
    } catch (error) {
      this.handleError(error, 'AuditService.createAuditLog');
    }
  }
  
  /**
   * Get audit logs with optional filtering
   */
  async getAuditLogs(filter: AuditLogFilter = {}): Promise<AuditLog[]> {
    try {
      const where: any = {};
      
      if (filter.userId) {
        where.userId = filter.userId;
      }
      
      if (filter.actionType) {
        where.actionType = filter.actionType;
      }
      
      if (filter.entityType) {
        where.entityType = filter.entityType;
      }
      
      if (filter.startDate || filter.endDate) {
        where.timestamp = {};
        if (filter.startDate) {
          where.timestamp.gte = filter.startDate;
        }
        if (filter.endDate) {
          where.timestamp.lte = filter.endDate;
        }
      }
      
      return await this.prisma.auditLog.findMany({
        where,
        orderBy: { timestamp: 'desc' },
        take: filter.limit || 100,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
            },
          },
        },
      });
    } catch (error) {
      this.handleError(error, 'AuditService.getAuditLogs');
    }
  }
  
  /**
   * Get audit trail for a specific entity
   */
  async getEntityAuditTrail(
    entityType: string,
    entityId: string
  ): Promise<AuditLog[]> {
    try {
      return await this.prisma.auditLog.findMany({
        where: {
          entityType,
          entityId,
        },
        orderBy: { timestamp: 'asc' },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });
    } catch (error) {
      this.handleError(error, 'AuditService.getEntityAuditTrail');
    }
  }
  
  /**
   * Verify the integrity of audit log chain
   */
  async verifyAuditChain(): Promise<{ valid: boolean; errors: string[] }> {
    try {
      const logs = await this.prisma.auditLog.findMany({
        orderBy: { timestamp: 'asc' },
      });
      
      const errors: string[] = [];
      
      for (let i = 1; i < logs.length; i++) {
        const currentLog = logs[i];
        const previousLog = logs[i - 1];
        
        // Check if previous hash matches
        if (currentLog.previousHash !== previousLog.currentHash) {
          errors.push(
            `Chain broken at log ${currentLog.id}: ` +
            `expected previous hash ${previousLog.currentHash}, ` +
            `got ${currentLog.previousHash}`
          );
        }
        
        // Recalculate and verify current hash
        const expectedHash = this.calculateHash(
          {
            userId: currentLog.userId,
            actionType: currentLog.actionType,
            entityType: currentLog.entityType,
            entityId: currentLog.entityId || undefined,
            changeSummary: currentLog.changeSummary,
          },
          currentLog.previousHash
        );
        
        if (currentLog.currentHash !== expectedHash) {
          errors.push(
            `Hash mismatch at log ${currentLog.id}: ` +
            `expected ${expectedHash}, got ${currentLog.currentHash}`
          );
        }
      }
      
      return {
        valid: errors.length === 0,
        errors,
      };
    } catch (error) {
      this.handleError(error, 'AuditService.verifyAuditChain');
    }
  }
  
  /**
   * Calculate hash for tamper detection
   */
  private calculateHash(input: any, previousHash: string | null): string {
    const data = JSON.stringify({
      userId: input.userId,
      actionType: input.actionType,
      entityType: input.entityType,
      entityId: input.entityId,
      changeSummary: input.changeSummary,
      previousHash,
      timestamp: Date.now(),
    });
    
    return crypto.createHash('sha256').update(data).digest('hex');
  }
  
  /**
   * Get user activity summary
   */
  async getUserActivitySummary(
    userId: string,
    startDate: Date,
    endDate: Date
  ): Promise<{
    totalActions: number;
    actionsByType: Record<string, number>;
    recentActions: AuditLog[];
  }> {
    try {
      const logs = await this.prisma.auditLog.findMany({
        where: {
          userId,
          timestamp: {
            gte: startDate,
            lte: endDate,
          },
        },
        orderBy: { timestamp: 'desc' },
      });
      
      const actionsByType: Record<string, number> = {};
      logs.forEach(log => {
        actionsByType[log.actionType] = (actionsByType[log.actionType] || 0) + 1;
      });
      
      return {
        totalActions: logs.length,
        actionsByType,
        recentActions: logs.slice(0, 10),
      };
    } catch (error) {
      this.handleError(error, 'AuditService.getUserActivitySummary');
    }
  }
}

// Export singleton instance
export const auditService = new AuditService();
