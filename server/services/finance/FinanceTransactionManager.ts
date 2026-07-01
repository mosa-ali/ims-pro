import { getDb } from "../../db";
import { DB } from "../../db/_scope";
import { FinanceSynchronizationContext } from "./FinanceSynchronizationContext";
import { FinanceSynchronizationLogger } from "./FinanceSynchronizationLogger";

export class FinanceTransactionManager {
  private logger: FinanceSynchronizationLogger;

  constructor(logger: FinanceSynchronizationLogger) {
    this.logger = logger;
  }

  public async runInTransaction<T>(callback: (db: DB) => Promise<T>, context: FinanceSynchronizationContext): Promise<T> {
    const db = await getDb();
    if (!db) {
      throw new Error("Database not available for transaction.");
    }

    this.logger.log(`Starting transaction for Organization: ${context.organizationId}, Operating Unit: ${context.operatingUnitId}`);

    // Drizzle-orm handles transactions using the `transaction` method
    // This ensures atomicity: all operations within the callback succeed or all are rolled back.
    try {
      const result = await db.transaction(async (tx) => {
        // Pass the transactional DB instance to the callback
        return callback(tx as DB);
      });
      this.logger.log(`Transaction committed successfully for Organization: ${context.organizationId}, Operating Unit: ${context.operatingUnitId}`);
      return result;
    } catch (error: unknown) {
        const message =
            error instanceof Error
                ? error.message
                : String(error);
        this.logger.error(
            `Transaction failed for Organization: ${context.organizationId}, Operating Unit: ${context.operatingUnitId}. Error: ${message}`
        );
        throw error;
        }
      }
    }
