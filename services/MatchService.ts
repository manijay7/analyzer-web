// Match Service - Handles matching and reconciliation operations
import { BaseService } from './BaseService';
import { Prisma } from '@prisma/client';

// Type definitions
type MatchGroup = Prisma.MatchGroupGetPayload<{}>;

export interface CreateMatchInput {
  leftTransactionIds: string[];
  rightTransactionIds: string[];
  comment?: string;
  matchByUserId: string;
  adjustmentLimit: number;
}

export class MatchService extends BaseService {
  /**
   * Create a new match group
   */
  async createMatch(input: CreateMatchInput): Promise<MatchGroup> {
    try {
      return await this.executeInTransaction(async () => {
        // Fetch transactions to calculate totals
        const allTransactionIds = [
          ...input.leftTransactionIds,
          ...input.rightTransactionIds,
        ];
        
        const transactions = await this.prisma.transaction.findMany({
          where: {
            id: { in: allTransactionIds },
          },
        });
        
        const leftTxs = transactions.filter(t =>
          input.leftTransactionIds.includes(t.id)
        );
        const rightTxs = transactions.filter(t =>
          input.rightTransactionIds.includes(t.id)
        );
        
        const totalLeft = leftTxs.reduce((sum, t) => sum + t.amount, 0);
        const totalRight = rightTxs.reduce((sum, t) => sum + t.amount, 0);
        const difference = Math.abs(totalLeft - totalRight);
        const adjustment = difference > 0 ? difference : undefined;
        
        // Determine status based on adjustment amount
        const status =
          adjustment && adjustment > input.adjustmentLimit
            ? 'PENDING_APPROVAL'
            : 'APPROVED';
        
        // Create match group
        const matchGroup = await this.prisma.matchGroup.create({
          data: {
            leftTransactionIds: JSON.stringify(input.leftTransactionIds),
            rightTransactionIds: JSON.stringify(input.rightTransactionIds),
            totalLeft,
            totalRight,
            difference,
            adjustment,
            comment: input.comment,
            status,
            matchByUserId: input.matchByUserId,
          },
        });
        
        // Update transaction statuses
        await this.prisma.transaction.updateMany({
          where: {
            id: { in: allTransactionIds },
          },
          data: {
            status: 'MATCHED',
            matchId: matchGroup.id,
          },
        });
        
        return matchGroup;
      });
    } catch (error) {
      this.handleError(error, 'MatchService.createMatch');
    }
  }
  
  /**
   * Get all matches
   */
  async getMatches(filter: { status?: string } = {}): Promise<MatchGroup[]> {
    try {
      const where: any = {};
      
      if (filter.status) {
        where.status = filter.status;
      }
      
      return await this.prisma.matchGroup.findMany({
        where,
        orderBy: { timestamp: 'desc' },
        include: {
          matchByUser: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          approvedBy: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });
    } catch (error) {
      this.handleError(error, 'MatchService.getMatches');
    }
  }
  
  /**
   * Approve a match
   */
  async approveMatch(
    matchId: string,
    approvedById: string
  ): Promise<MatchGroup> {
    try {
      return await this.prisma.matchGroup.update({
        where: { id: matchId },
        data: {
          status: 'APPROVED',
          approvedById,
          approvedAt: new Date(),
          version: { increment: 1 },
        },
      });
    } catch (error) {
      this.handleError(error, 'MatchService.approveMatch');
    }
  }
  
  /**
   * Unmatch (delete) a match group
   */
  async unmatch(matchId: string): Promise<void> {
    try {
      await this.executeInTransaction(async () => {
        // Update transaction statuses back to unmatched
        await this.prisma.transaction.updateMany({
          where: { matchId },
          data: {
            status: 'UNMATCHED',
            matchId: null,
          },
        });
        
        // Delete the match group
        await this.prisma.matchGroup.delete({
          where: { id: matchId },
        });
      });
    } catch (error) {
      this.handleError(error, 'MatchService.unmatch');
    }
  }
}

// Export singleton instance
export const matchService = new MatchService();
