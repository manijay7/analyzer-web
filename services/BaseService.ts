// Base Service Class for common database operations
import { prisma } from '@/lib/prisma';

export class BaseService {
  protected prisma = prisma;
  
  protected async executeInTransaction<T>(
    operation: () => Promise<T>
  ): Promise<T> {
    return await this.prisma.$transaction(async () => {
      return await operation();
    });
  }
  
  protected handleError(error: any, context: string): never {
    console.error(`[${context}] Error:`, error);
    throw new Error(`${context} failed: ${error.message || 'Unknown error'}`);
  }
}
