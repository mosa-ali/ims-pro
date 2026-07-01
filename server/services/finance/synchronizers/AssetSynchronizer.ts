import type { FinanceSynchronizationContext } from "../FinanceSynchronizationContext";
import { FinanceEventBus } from "../FinanceEventBus";
import { FinanceTransactionManager } from "../FinanceTransactionManager";
import { FinanceSynchronizationLogger } from "../FinanceSynchronizationLogger";
import { AssetAcquiredEvent, AssetDisposedEvent, AssetDepreciatedEvent, FinanceEvent } from "@shared/events/FinanceEventTypes";

import { eq, and, sql } from "drizzle-orm";
import { DB } from "../../../db/_scope";

export class AssetSynchronizer {
  private eventBus: FinanceEventBus;
  private transactionManager: FinanceTransactionManager;
  private logger: FinanceSynchronizationLogger;

  constructor(
    eventBus: FinanceEventBus,
    transactionManager: FinanceTransactionManager,
    logger: FinanceSynchronizationLogger
  ) {
    this.eventBus = eventBus;
    this.transactionManager = transactionManager;
    this.logger = logger;
  }

  public initialize() {
    this.eventBus.on(
      "AssetAcquired",
      this.handleAssetAcquired.bind(this)
    );
    this.eventBus.on(
      "AssetDisposed",
      this.handleAssetDisposed.bind(this)
    );
    this.eventBus.on(
      "AssetDepreciated",
      this.handleAssetDepreciated.bind(this)
    );
    this.logger.log("AssetSynchronizer initialized and subscribed to AssetAcquiredEvent, AssetDisposedEvent, and AssetDepreciatedEvent.");
  }

  private async handleAssetAcquired(event: FinanceEvent, context: FinanceSynchronizationContext, db: DB) {
    await this.transactionManager.runInTransaction(async (tx) => {
      const typedEvent = event as AssetAcquiredEvent;
      this.logger.log(`Processing AssetAcquiredEvent for Asset: ${typedEvent.payload.assetId}`);

      // Logic to record asset acquisition in a dedicated assets table or update relevant financial records
      // Example: Insert into a 'fixedAssets' table
      // await tx.insert(db.schema.fixedAssets).values({
      //   organizationId: typedEvent.organizationId,
      //   operatingUnitId: typedEvent.operatingUnitId,
      //   assetId: typedEvent.payload.assetId,
      //   name: typedEvent.payload.name,
      //   acquisitionDate: typedEvent.payload.acquisitionDate,
      //   cost: typedEvent.payload.cost,
      //   // ... other asset details
      // });

      this.logger.log(`Successfully processed AssetAcquiredEvent for Asset: ${typedEvent.payload.assetId}`);
    }, context);
  }

  private async handleAssetDisposed(event: FinanceEvent, context: FinanceSynchronizationContext, db: DB) {
    await this.transactionManager.runInTransaction(async (tx) => {
      const typedEvent = event as AssetDisposedEvent;
      this.logger.log(`Processing AssetDisposedEvent for Asset: ${typedEvent.payload.assetId}`);

      // Logic to record asset disposal and update depreciation records
      // Example: Update 'fixedAssets' status and record disposal details
      // await tx.update(db.schema.fixedAssets)
      //   .set({
      //     status: 'disposed',
      //     disposalDate: typedEvent.payload.disposalDate,
      //     disposalProceeds: typedEvent.payload.disposalProceeds,
      //   })
      //   .where(eq(db.schema.fixedAssets.assetId, typedEvent.payload.assetId));

      this.logger.log(`Successfully processed AssetDisposedEvent for Asset: ${typedEvent.payload.assetId}`);
    }, context);
  }

  private async handleAssetDepreciated(event: FinanceEvent, context: FinanceSynchronizationContext, db: DB) {
    await this.transactionManager.runInTransaction(async (tx) => {
      const typedEvent = event as AssetDepreciatedEvent;
      this.logger.log(`Processing AssetDepreciatedEvent for Asset: ${typedEvent.payload.assetId}`);

      // Logic to record depreciation expense and update asset's book value
      // Example: Insert into 'depreciationEntries' table or update 'fixedAssets' book value
      // await tx.insert(db.schema.depreciationEntries).values({
      //   organizationId: typedEvent.organizationId,
      //   operatingUnitId: typedEvent.operatingUnitId,
      //   assetId: typedEvent.payload.assetId,
      //   depreciationAmount: typedEvent.payload.depreciationAmount,
      //   depreciationDate: typedEvent.payload.depreciationDate,
      // });

      this.logger.log(`Successfully processed AssetDepreciatedEvent for Asset: ${typedEvent.payload.assetId}`);
    }, context);
  }
}
