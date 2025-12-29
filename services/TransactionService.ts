import { ApiClient } from "./ApiClient";
import { Transaction, CreateTransaction } from "@/lib/validation";

export interface TransactionQuery {
  fileId?: string;
  sheetId?: string;
  status?: "UNMATCHED" | "MATCHED";
  limit?: number;
  offset?: number;
  dateFrom?: string;
  dateTo?: string;
}

export interface TransactionStats {
  totalCount: number;
  unmatchedCount: number;
  matchedCount: number;
  totalValue: number;
  unmatchedValue: number;
  matchedValue: number;
}

export class TransactionService {
  constructor(private apiClient: ApiClient) {}

  /**
   * Get transactions with filtering and pagination
   */
  async getTransactions(query: TransactionQuery = {}): Promise<{
    transactions: Transaction[];
    totalCount: number;
    hasMore: boolean;
  }> {
    const params = {
      fileId: query.fileId,
      sheetId: query.sheetId,
      status: query.status,
      limit: query.limit || 100,
      offset: query.offset || 0,
      dateFrom: query.dateFrom,
      dateTo: query.dateTo,
    };

    const response = await this.apiClient.get<{
      transactions: Transaction[];
      totalCount: number;
      hasMore: boolean;
    }>("/api/transactions", params);

    return response;
  }

  /**
   * Get transaction by ID
   */
  async getTransactionById(id: string): Promise<Transaction> {
    return this.apiClient.get<Transaction>(`/api/transactions/${id}`);
  }

  /**
   * Create new transaction
   */
  async createTransaction(
    transaction: CreateTransaction
  ): Promise<Transaction> {
    return this.apiClient.post<Transaction>("/api/transactions", transaction);
  }

  /**
   * Bulk create transactions
   */
  async createTransactions(transactions: CreateTransaction[]): Promise<{
    created: Transaction[];
    failed: { data: CreateTransaction; error: string }[];
  }> {
    const response = await this.apiClient.post<{
      created: Transaction[];
      failed: { data: CreateTransaction; error: string }[];
    }>("/api/transactions/bulk", { transactions });

    return response;
  }

  /**
   * Update transaction
   */
  async updateTransaction(
    id: string,
    updates: Partial<Transaction>
  ): Promise<Transaction> {
    return this.apiClient.patch<Transaction>(
      `/api/transactions/${id}`,
      updates
    );
  }

  /**
   * Delete transaction
   */
  async deleteTransaction(id: string): Promise<void> {
    await this.apiClient.delete(`/api/transactions/${id}`);
  }

  /**
   * Bulk delete transactions
   */
  async deleteTransactions(ids: string[]): Promise<{
    deleted: string[];
    failed: { id: string; error: string }[];
  }> {
    const response = await this.apiClient.post<{
      deleted: string[];
      failed: { id: string; error: string }[];
    }>("/api/transactions/bulk-delete", { ids });

    return response;
  }

  /**
   * Get transaction statistics
   */
  async getTransactionStats(
    query: {
      fileId?: string;
      sheetId?: string;
      dateFrom?: string;
      dateTo?: string;
    } = {}
  ): Promise<TransactionStats> {
    const response = await this.apiClient.get<TransactionStats>(
      "/api/transactions/stats",
      query
    );
    return response;
  }

  /**
   * Search transactions
   */
  async searchTransactions(query: {
    searchTerm: string;
    fileId?: string;
    sheetId?: string;
    limit?: number;
    offset?: number;
  }): Promise<{
    transactions: Transaction[];
    totalCount: number;
    hasMore: boolean;
  }> {
    const params = {
      q: query.searchTerm,
      fileId: query.fileId,
      sheetId: query.sheetId,
      limit: query.limit || 50,
      offset: query.offset || 0,
    };

    const response = await this.apiClient.get<{
      transactions: Transaction[];
      totalCount: number;
      hasMore: boolean;
    }>("/api/transactions/search", params);

    return response;
  }

  /**
   * Import transactions from file
   */
  async importFromFile(
    fileId: string,
    options: {
      sheetId?: string;
      validateOnly?: boolean;
      skipDuplicates?: boolean;
    } = {}
  ): Promise<{
    imported: number;
    skipped: number;
    failed: number;
    errors: string[];
  }> {
    const response = await this.apiClient.post<{
      imported: number;
      skipped: number;
      failed: number;
      errors: string[];
    }>("/api/transactions/import", {
      fileId,
      ...options,
    });

    return response;
  }

  /**
   * Export transactions
   */
  async exportTransactions(
    query: TransactionQuery & {
      format: "csv" | "excel" | "json";
      includeMatches?: boolean;
    }
  ): Promise<Blob> {
    const params = {
      ...query,
      export: "true",
    };

    // For binary responses, we need to handle differently
    const url = this.apiClient["buildURL"]("/api/transactions/export", params);
    const response = await fetch(url, {
      headers: this.apiClient["defaultHeaders"],
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Export failed");
    }

    return response.blob();
  }

  /**
   * Validate transaction data
   */
  async validateTransaction(transaction: Partial<CreateTransaction>): Promise<{
    valid: boolean;
    errors: string[];
  }> {
    const response = await this.apiClient.post<{
      valid: boolean;
      errors: string[];
    }>("/api/transactions/validate", transaction);

    return response;
  }

  /**
   * Get duplicate transactions
   */
  async findDuplicates(
    criteria: {
      fileId?: string;
      sheetId?: string;
      checkFields?: ("date" | "description" | "amount")[];
    } = {}
  ): Promise<{
    duplicates: {
      original: Transaction;
      duplicates: Transaction[];
    }[];
    totalDuplicates: number;
  }> {
    const response = await this.apiClient.get<{
      duplicates: {
        original: Transaction;
        duplicates: Transaction[];
      }[];
      totalDuplicates: number;
    }>("/api/transactions/duplicates", criteria);

    return response;
  }

  /**
   * Get transactions by match group
   */
  async getTransactionsByMatch(matchId: string): Promise<Transaction[]> {
    return this.apiClient.get<Transaction[]>(
      `/api/matches/${matchId}/transactions`
    );
  }

  /**
   * Update transaction status
   */
  async updateTransactionStatus(
    id: string,
    status: "UNMATCHED" | "MATCHED",
    matchId?: string
  ): Promise<Transaction> {
    return this.apiClient.patch<Transaction>(`/api/transactions/${id}/status`, {
      status,
      matchId,
    });
  }

  /**
   * Bulk update transaction statuses
   */
  async bulkUpdateStatus(
    updates: {
      id: string;
      status: "UNMATCHED" | "MATCHED";
      matchId?: string;
    }[]
  ): Promise<{
    updated: Transaction[];
    failed: { id: string; error: string }[];
  }> {
    const response = await this.apiClient.post<{
      updated: Transaction[];
      failed: { id: string; error: string }[];
    }>("/api/transactions/bulk-status", { updates });

    return response;
  }
}
