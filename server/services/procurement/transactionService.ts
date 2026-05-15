/**
 * Transaction Service
 * Provides transaction support for atomic operations
 * Ensures data consistency across multiple database operations
 */

import { getDb, getDbPool } from '../../db';
import { TRPCError } from '@trpc/server';

export interface TransactionResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Executes a function within a database transaction
 * Automatically rolls back on error
 */
export async function withTransaction<T>(
  callback: (db: any) => Promise<T>
): Promise<TransactionResult<T>> {
  const pool = await getDbPool();

  if (!pool) {
    return {
      success: false,
      error: 'Database pool not available',
    };
  }

  let connection;

  try {
    // Get a connection from the pool
    connection = await pool.getConnection();

    // Start transaction
    await connection.beginTransaction();

    // Create a drizzle instance for this connection
    const { drizzle } = await import('drizzle-orm/mysql2');
    const db = drizzle(connection);

    // Execute the callback
    const result = await callback(db);

    // Commit transaction
    await connection.commit();

    return {
      success: true,
      data: result,
    };
  } catch (error) {
    // Rollback on error
    if (connection) {
      try {
        await connection.rollback();
      } catch (rollbackError) {
        console.error('[Transaction] Rollback failed:', rollbackError);
      }
    }

    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    return {
      success: false,
      error: `Transaction failed: ${errorMessage}`,
    };
  } finally {
    // Release connection back to pool
    if (connection) {
      await connection.release();
    }
  }
}

/**
 * Executes a function within a transaction and throws on error
 * Use this when you want automatic error handling
 */
export async function executeInTransaction<T>(
  callback: (db: any) => Promise<T>,
  errorMessage?: string
): Promise<T> {
  const result = await withTransaction(callback);

  if (!result.success) {
    throw new TRPCError({
      code: 'INTERNAL_SERVER_ERROR',
      message: errorMessage || result.error || 'Transaction failed',
    });
  }

  return result.data as T;
}

/**
 * Batch operation wrapper
 * Executes multiple operations in a single transaction
 */
export async function batchOperation<T>(
  operations: Array<(db: any) => Promise<void>>,
  finalOperation: (db: any) => Promise<T>
): Promise<T> {
  return executeInTransaction(async (db) => {
    // Execute all operations in sequence
    for (const operation of operations) {
      await operation(db);
    }

    // Execute final operation and return result
    return finalOperation(db);
  }, 'Batch operation failed');
}

/**
 * Retry logic for transient failures
 * Useful for handling temporary database connection issues
 */
export async function retryTransaction<T>(
  callback: (db: any) => Promise<T>,
  maxRetries: number = 3,
  delayMs: number = 1000
): Promise<T> {
  let lastError: Error | undefined;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await executeInTransaction(callback);
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (attempt < maxRetries) {
        // Wait before retrying
        await new Promise((resolve) => setTimeout(resolve, delayMs * attempt));
      }
    }
  }

  throw lastError || new Error('Transaction failed after retries');
}
