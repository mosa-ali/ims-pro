import { EventEmitter } from "events";
import { FinanceEvent } from "@shared/events/FinanceEventTypes";
import type { FinanceSynchronizationContext } from "./FinanceSynchronizationContext";
import { FinanceSynchronizationLogger } from "./FinanceSynchronizationLogger";
import { DB } from "../../db/_scope";

interface EventHandlers {
  [eventType: string]: ((event: FinanceEvent, context: FinanceSynchronizationContext, db: DB) => Promise<void>)[];
}

export class FinanceEventBus {
  private emitter: EventEmitter;
  private handlers: EventHandlers = {};
  private logger: FinanceSynchronizationLogger;

  constructor(logger: FinanceSynchronizationLogger) {
    this.emitter = new EventEmitter();
    this.logger = logger;
  }

  public on(eventType: string, handler: (event: FinanceEvent, context: FinanceSynchronizationContext, db: DB) => Promise<void>): void {
    if (!this.handlers[eventType]) {
      this.handlers[eventType] = [];
    }
    this.handlers[eventType].push(handler);
    this.emitter.on(eventType, handler);
    this.logger.log(`Registered handler for event type: ${eventType}`);
  }

  public async publish(eventType: string, event: FinanceEvent, context: FinanceSynchronizationContext, db: DB): Promise<void> {
    this.logger.log(`Publishing event: ${eventType}`);
    const handlers = this.handlers[eventType];
    if (handlers && handlers.length > 0) {
      for (const handler of handlers) {
        try {
          await handler(event, context, db);
          this.logger.log(`Handler for ${eventType} executed successfully.`);
        } catch (error) {
    const message =
        error instanceof Error
            ? error.message
            : String(error);
            this.logger.error(
                `Error executing handler for ${eventType}: ${message}`
            );
          // Depending on requirements, we might want to re-throw or handle partial failures
          throw error; 
        }
      }
    } else {
      this.logger.warn(`No handlers registered for event type: ${eventType}`);
    }
  }
}
