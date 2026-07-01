import { FinanceEventBus } from "./FinanceEventBus";
import { FinanceTransactionManager } from "./FinanceTransactionManager";
import { FinanceSynchronizationLogger } from "./FinanceSynchronizationLogger";
import type { FinanceSynchronizationContext } from "./FinanceSynchronizationContext";
import { FinanceEvent } from "@shared/events/FinanceEventTypes";

export class FinanceSynchronizationEngine {
  private eventBus: FinanceEventBus;
  private transactionManager: FinanceTransactionManager;
  private logger: FinanceSynchronizationLogger;

  constructor(eventBus: FinanceEventBus, transactionManager: FinanceTransactionManager, logger: FinanceSynchronizationLogger) {
    this.eventBus = eventBus;
    this.transactionManager = transactionManager;
    this.logger = logger;
  }

  public async processEvent(event: FinanceEvent, context: FinanceSynchronizationContext): Promise<void> {
    this.logger.log(`Processing event: ${event.type} for Organization: ${context.organizationId}, Operating Unit: ${context.operatingUnitId}`);
    
    try {
      await this.transactionManager.runInTransaction(async (db) => {
        // Here, the event will be dispatched to specific synchronizers
        // For now, we'll just log it. Actual dispatching will be implemented in Phase 2.
        this.logger.log(`Event ${event.type} handled within transaction.`);
        // Example: this.eventBus.publish(event.type, event, context, db);
      }, context);
      this.logger.log(`Successfully processed event: ${event.type}`);
    } catch (error: any) {
      this.logger.error(`Failed to process event ${event.type}: ${error.message}`);
      throw error; // Re-throw to indicate failure
    }
  }
}
