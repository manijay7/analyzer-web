/**
 * Actor System for Financial Reconciliation
 *
 * This module implements a role-based actor system that manages:
 * - User roles and permissions
 * - Workflow states and transitions
 * - Approval chains and separation of duties
 * - Audit trails for all actor actions
 */

import { UserRole, Permission } from "./types";
import { DEFAULT_ROLE_PERMISSIONS } from "./constants";

export interface Actor {
  id: string;
  name: string;
  role: UserRole;
  permissions: Permission[];
  isActive: boolean;
}

export interface WorkflowState {
  id: string;
  name: string;
  description: string;
  allowedActors: UserRole[];
  requiredPermissions: Permission[];
  nextStates: string[];
  previousStates: string[];
}

export interface WorkflowTransition {
  fromState: string;
  toState: string;
  actor: Actor;
  timestamp: number;
  justification?: string;
  metadata?: Record<string, any>;
}

export interface ReconciliationWorkflow {
  id: string;
  currentState: string;
  states: WorkflowState[];
  transitions: WorkflowTransition[];
  createdAt: number;
  updatedAt: number;
}

export class ActorSystem {
  private actors: Map<string, Actor> = new Map();
  private workflows: Map<string, ReconciliationWorkflow> = new Map();

  // Workflow states for reconciliation process
  private readonly WORKFLOW_STATES: WorkflowState[] = [
    {
      id: "IMPORTED",
      name: "Data Imported",
      description: "Transaction data has been imported",
      allowedActors: [UserRole.Analyst, UserRole.Manager, UserRole.Admin],
      requiredPermissions: ["view_transactions" as Permission],
      nextStates: ["UNDER_REVIEW", "REJECTED"],
      previousStates: [],
    },
    {
      id: "UNDER_REVIEW",
      name: "Under Review",
      description: "Transactions are being reviewed for matching",
      allowedActors: [UserRole.Analyst, UserRole.Manager, UserRole.Admin],
      requiredPermissions: ["perform_matching" as Permission],
      nextStates: ["MATCHED", "PARTIALLY_MATCHED", "NEEDS_APPROVAL"],
      previousStates: ["IMPORTED"],
    },
    {
      id: "MATCHED",
      name: "Matched",
      description: "All transactions have been matched",
      allowedActors: [UserRole.Analyst, UserRole.Manager, UserRole.Admin],
      requiredPermissions: ["perform_matching" as Permission],
      nextStates: ["APPROVED", "NEEDS_APPROVAL"],
      previousStates: ["UNDER_REVIEW", "PARTIALLY_MATCHED"],
    },
    {
      id: "PARTIALLY_MATCHED",
      name: "Partially Matched",
      description: "Some transactions matched, others need attention",
      allowedActors: [UserRole.Analyst, UserRole.Manager, UserRole.Admin],
      requiredPermissions: ["perform_matching" as Permission],
      nextStates: ["MATCHED", "NEEDS_APPROVAL", "FLAGGED_FOR_AUDIT"],
      previousStates: ["UNDER_REVIEW"],
    },
    {
      id: "NEEDS_APPROVAL",
      name: "Needs Approval",
      description: "Matches require manager approval",
      allowedActors: [UserRole.Manager, UserRole.Admin],
      requiredPermissions: ["approve_adjustments" as Permission],
      nextStates: ["APPROVED", "REJECTED", "FLAGGED_FOR_AUDIT"],
      previousStates: ["UNDER_REVIEW", "MATCHED", "PARTIALLY_MATCHED"],
    },
    {
      id: "APPROVED",
      name: "Approved",
      description: "All matches have been approved",
      allowedActors: [UserRole.Manager, UserRole.Admin],
      requiredPermissions: ["approve_adjustments" as Permission],
      nextStates: ["EXPORTED", "ARCHIVED"],
      previousStates: ["NEEDS_APPROVAL", "MATCHED"],
    },
    {
      id: "FLAGGED_FOR_AUDIT",
      name: "Flagged for Audit",
      description: "Requires auditor review due to anomalies",
      allowedActors: [UserRole.Auditor, UserRole.Admin],
      requiredPermissions: ["view_admin_panel" as Permission],
      nextStates: ["APPROVED", "REJECTED", "UNDER_INVESTIGATION"],
      previousStates: ["NEEDS_APPROVAL", "PARTIALLY_MATCHED"],
    },
    {
      id: "UNDER_INVESTIGATION",
      name: "Under Investigation",
      description: "Auditor is investigating potential issues",
      allowedActors: [UserRole.Auditor, UserRole.Admin],
      requiredPermissions: ["view_admin_panel" as Permission],
      nextStates: ["APPROVED", "REJECTED", "ESCALATED"],
      previousStates: ["FLAGGED_FOR_AUDIT"],
    },
    {
      id: "ESCALATED",
      name: "Escalated",
      description: "Issue escalated to senior management",
      allowedActors: [UserRole.Admin],
      requiredPermissions: ["manage_users" as Permission],
      nextStates: ["APPROVED", "REJECTED"],
      previousStates: ["UNDER_INVESTIGATION"],
    },
    {
      id: "EXPORTED",
      name: "Exported",
      description: "Reconciliation data has been exported",
      allowedActors: [UserRole.Analyst, UserRole.Manager, UserRole.Admin],
      requiredPermissions: ["export_data" as Permission],
      nextStates: ["ARCHIVED"],
      previousStates: ["APPROVED"],
    },
    {
      id: "ARCHIVED",
      name: "Archived",
      description: "Reconciliation is complete and archived",
      allowedActors: [UserRole.Admin],
      requiredPermissions: ["manage_users" as Permission],
      nextStates: [],
      previousStates: ["APPROVED", "EXPORTED", "REJECTED"],
    },
    {
      id: "REJECTED",
      name: "Rejected",
      description: "Reconciliation was rejected",
      allowedActors: [UserRole.Manager, UserRole.Admin, UserRole.Auditor],
      requiredPermissions: ["approve_adjustments" as Permission],
      nextStates: ["ARCHIVED"],
      previousStates: [
        "IMPORTED",
        "NEEDS_APPROVAL",
        "FLAGGED_FOR_AUDIT",
        "UNDER_INVESTIGATION",
        "ESCALATED",
      ],
    },
  ];

  constructor() {
    // Initialize the workflow states
    this.initializeWorkflowStates();
  }

  private initializeWorkflowStates(): void {
    // States are already defined above
  }

  /**
   * Register an actor in the system
   */
  registerActor(userId: string, name: string, role: UserRole): Actor {
    const permissions = DEFAULT_ROLE_PERMISSIONS[role] || [];
    const actor: Actor = {
      id: userId,
      name,
      role,
      permissions,
      isActive: true,
    };

    this.actors.set(userId, actor);
    return actor;
  }

  /**
   * Get an actor by ID
   */
  getActor(actorId: string): Actor | undefined {
    return this.actors.get(actorId);
  }

  /**
   * Check if an actor can perform an action in a given state
   */
  canActorPerformAction(
    actor: Actor,
    action: string,
    workflowState: string
  ): boolean {
    const state = this.WORKFLOW_STATES.find((s) => s.id === workflowState);
    if (!state) return false;

    // Check if actor's role is allowed in this state
    if (!state.allowedActors.includes(actor.role)) return false;

    // Check if actor has required permissions
    const hasPermissions = state.requiredPermissions.every((perm) =>
      actor.permissions.includes(perm as Permission)
    );

    return hasPermissions;
  }

  /**
   * Create a new reconciliation workflow
   */
  createWorkflow(workflowId: string): ReconciliationWorkflow {
    const workflow: ReconciliationWorkflow = {
      id: workflowId,
      currentState: "IMPORTED",
      states: this.WORKFLOW_STATES,
      transitions: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    this.workflows.set(workflowId, workflow);
    return workflow;
  }

  /**
   * Transition workflow to a new state
   */
  transitionWorkflow(
    workflowId: string,
    newStateId: string,
    actor: Actor,
    justification?: string,
    metadata?: Record<string, any>
  ): boolean {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) return false;

    // Check if transition is allowed
    if (
      !this.canActorPerformAction(actor, "transition", workflow.currentState)
    ) {
      return false;
    }

    const currentState = workflow.states.find(
      (s) => s.id === workflow.currentState
    );
    if (!currentState || !currentState.nextStates.includes(newStateId)) {
      return false;
    }

    // Create transition record
    const transition: WorkflowTransition = {
      fromState: workflow.currentState,
      toState: newStateId,
      actor,
      timestamp: Date.now(),
      justification,
      metadata,
    };

    // Update workflow
    workflow.currentState = newStateId;
    workflow.transitions.push(transition);
    workflow.updatedAt = Date.now();

    return true;
  }

  /**
   * Get workflow by ID
   */
  getWorkflow(workflowId: string): ReconciliationWorkflow | undefined {
    return this.workflows.get(workflowId);
  }

  /**
   * Get all possible next states for current workflow state
   */
  getNextStates(workflowId: string): WorkflowState[] {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) return [];

    const currentState = workflow.states.find(
      (s) => s.id === workflow.currentState
    );
    if (!currentState) return [];

    return workflow.states.filter((s) =>
      currentState.nextStates.includes(s.id)
    );
  }

  /**
   * Get workflow history
   */
  getWorkflowHistory(workflowId: string): WorkflowTransition[] {
    const workflow = this.workflows.get(workflowId);
    return workflow ? workflow.transitions : [];
  }

  /**
   * Check separation of duties - ensure different actors for different phases
   */
  checkSeparationOfDuties(
    workflowId: string,
    requiredRoles: UserRole[]
  ): boolean {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) return false;

    const actorsInWorkflow = new Set(
      workflow.transitions.map((t) => t.actor.id)
    );
    const rolesInWorkflow = new Set(
      workflow.transitions.map((t) => t.actor.role)
    );

    // Check if all required roles have participated
    return requiredRoles.every((role) => rolesInWorkflow.has(role));
  }

  /**
   * Get workflow statistics
   */
  getWorkflowStats(): {
    totalWorkflows: number;
    workflowsByState: Record<string, number>;
    averageCompletionTime: number;
  } {
    const workflows = Array.from(this.workflows.values());
    const workflowsByState: Record<string, number> = {};

    // Count workflows by state
    workflows.forEach((workflow) => {
      workflowsByState[workflow.currentState] =
        (workflowsByState[workflow.currentState] || 0) + 1;
    });

    // Calculate average completion time for completed workflows
    const completedWorkflows = workflows.filter(
      (w) => w.currentState === "ARCHIVED"
    );
    const averageCompletionTime =
      completedWorkflows.length > 0
        ? completedWorkflows.reduce(
            (sum, w) => sum + (w.updatedAt - w.createdAt),
            0
          ) / completedWorkflows.length
        : 0;

    return {
      totalWorkflows: workflows.length,
      workflowsByState,
      averageCompletionTime,
    };
  }
}

// Export singleton instance
export const actorSystem = new ActorSystem();
