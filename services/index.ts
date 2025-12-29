// Central export for all service classes
export { ApiClient } from "./ApiClient";
export { TransactionService } from "./TransactionService";
export { MatchService } from "./MatchService";
export { UserService } from "./UserService";
export { AuditService } from "./AuditService";

// Singleton instances for convenience
import { ApiClient } from "./ApiClient";
import { TransactionService } from "./TransactionService";
import { MatchService } from "./MatchService";
import { UserService } from "./UserService";
import { AuditService } from "./AuditService";

export const apiClient = new ApiClient();
export const transactionService = new TransactionService(apiClient);
export const matchService = new MatchService();
export const userService = new UserService();
export const auditService = new AuditService();
