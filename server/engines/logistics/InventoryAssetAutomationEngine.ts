/**
 * InventoryAssetAutomationEngine.ts
 * ────────────────────────────────────────────────────────────────────────────
 * Post-GRN Inventory & Asset Automation (#9)
 *
 * After GRN acceptance:
 *   Inventory Item? → Update Stock
 *   Asset Candidate? → Create Asset Automatically → Notify Asset Team
 *
 * Configurable rules determine whether a received item is:
 *   - Consumable inventory (update warehouse stock)
 *   - Fixed asset (create asset record, assign tag, notify)
 *   - Neither (pass through to requesting department)
 */

import { v4 as uuidv4 } from 'uuid';
import type { ILogger, IConfigService, RepositoryScope } from '../../engines/finance/PlatformInterfaces';

// ────────────────────────────────────────────────────────────────────────────
// TYPES
// ────────────────────────────────────────────────────────────────────────────

export type ItemDisposition = 'inventory' | 'asset' | 'direct_use' | 'manual_review';

export interface GRNAcceptedItem {
  grnId: number;
  grnLineId: number;
  poId: number;
  poLineId: number;
  itemDescription: string;
  category: string;
  quantity: number;
  unitCost: number;
  totalCost: number;
  currency: string;
  unitOfMeasure: string;
  serialNumbers?: string[];
  warrantyEndDate?: string;
}

export interface DispositionRule {
  ruleId: string;
  name: string;
  priority: number;
  conditions: {
    categories?: string[];
    minUnitCost?: number;
    maxUnitCost?: number;
    hasSerialNumber?: boolean;
    usefulLifeYears?: number;
  };
  disposition: ItemDisposition;
  /** For assets: which asset category to assign */
  assetCategoryId?: number;
  /** For inventory: which warehouse/location to default */
  defaultWarehouseId?: number;
  defaultLocation?: string;
  isActive: boolean;
  organizationId: number;
}

export interface DispositionResult {
  grnId: number;
  items: Array<{
    grnLineId: number;
    itemDescription: string;
    disposition: ItemDisposition;
    ruleApplied: string;
    inventoryRecordId?: number;
    assetRecordId?: number;
    assetTagNumber?: string;
    warehouseId?: number;
    location?: string;
    notificationSent: boolean;
  }>;
  inventoryUpdated: number;
  assetsCreated: number;
  directUse: number;
  manualReview: number;
  processedAt: string;
}

// ────────────────────────────────────────────────────────────────────────────
// REPOSITORIES
// ────────────────────────────────────────────────────────────────────────────

export interface IDispositionRuleRepository {
  getActiveRules(scope: RepositoryScope): Promise<DispositionRule[]>;
  saveRule(rule: DispositionRule): Promise<void>;
}

export interface IInventoryService {
  updateStock(
    itemDescription: string,
    quantity: number,
    unitCost: number,
    warehouseId: number,
    location: string,
    grnId: number,
    scope: RepositoryScope,
  ): Promise<{ inventoryRecordId: number }>;
}

export interface IAssetService {
  createAsset(
    description: string,
    cost: number,
    currency: string,
    categoryId: number,
    serialNumber: string | undefined,
    warrantyEndDate: string | undefined,
    poId: number,
    grnId: number,
    scope: RepositoryScope,
  ): Promise<{ assetRecordId: number; assetTagNumber: string }>;
}

export interface INotificationService {
  notify(
    recipientRole: string,
    subject: string,
    message: string,
    scope: RepositoryScope,
  ): Promise<void>;
}

export interface AutomationDependencies {
  ruleRepo: IDispositionRuleRepository;
  inventoryService: IInventoryService;
  assetService: IAssetService;
  notificationService: INotificationService;
  logger: ILogger;
  config: IConfigService;
}

// ────────────────────────────────────────────────────────────────────────────
// ENGINE
// ────────────────────────────────────────────────────────────────────────────

export class InventoryAssetAutomationEngine {
  private ruleRepo: IDispositionRuleRepository;
  private inventoryService: IInventoryService;
  private assetService: IAssetService;
  private notifier: INotificationService;
  private logger: ILogger;
  private config: IConfigService;

  constructor(deps: AutomationDependencies) {
    this.ruleRepo = deps.ruleRepo;
    this.inventoryService = deps.inventoryService;
    this.assetService = deps.assetService;
    this.notifier = deps.notificationService;
    this.logger = deps.logger.child({ service: 'InventoryAssetAutomation' });
    this.config = deps.config;
  }

  /**
   * Process accepted GRN items through disposition rules.
   * Called automatically when GRN status changes to 'complete'.
   */
  async processGRN(
    grnId: number,
    acceptedItems: GRNAcceptedItem[],
    scope: RepositoryScope,
  ): Promise<DispositionResult> {
    const rules = await this.ruleRepo.getActiveRules(scope);
    const sortedRules = rules.sort((a, b) => a.priority - b.priority);

    const result: DispositionResult = {
      grnId,
      items: [],
      inventoryUpdated: 0,
      assetsCreated: 0,
      directUse: 0,
      manualReview: 0,
      processedAt: new Date().toISOString(),
    };

    for (const item of acceptedItems) {
      const matchedRule = sortedRules.find(r => this.matchesRule(r, item));
      const disposition = matchedRule?.disposition || 'manual_review';

      const itemResult: DispositionResult['items'][number] = {
        grnLineId: item.grnLineId,
        itemDescription: item.itemDescription,
        disposition,
        ruleApplied: matchedRule?.name || 'No rule matched — manual review',
        notificationSent: false,
      };

      switch (disposition) {
        case 'inventory': {
          const warehouseId = matchedRule?.defaultWarehouseId || this.config.getNumber('procurement.defaultWarehouseId', 1);
          const location = matchedRule?.defaultLocation || 'Receiving';
          const inv = await this.inventoryService.updateStock(
            item.itemDescription, item.quantity, item.unitCost,
            warehouseId, location, grnId, scope,
          );
          itemResult.inventoryRecordId = inv.inventoryRecordId;
          itemResult.warehouseId = warehouseId;
          itemResult.location = location;
          result.inventoryUpdated++;
          break;
        }

        case 'asset': {
          for (let i = 0; i < item.quantity; i++) {
            const serialNumber = item.serialNumbers?.[i];
            const asset = await this.assetService.createAsset(
              item.itemDescription, item.unitCost, item.currency,
              matchedRule?.assetCategoryId || 1,
              serialNumber, item.warrantyEndDate,
              item.poId, grnId, scope,
            );
            itemResult.assetRecordId = asset.assetRecordId;
            itemResult.assetTagNumber = asset.assetTagNumber;
          }

          // Notify asset team
          await this.notifier.notify(
            'Asset Manager',
            `New Asset(s) Created from GRN #${grnId}`,
            `${item.quantity}x ${item.itemDescription} (${item.totalCost} ${item.currency}) registered as fixed asset(s).`,
            scope,
          );
          itemResult.notificationSent = true;
          result.assetsCreated += item.quantity;
          break;
        }

        case 'direct_use':
          result.directUse++;
          break;

        case 'manual_review':
          result.manualReview++;
          await this.notifier.notify(
            'Procurement Manager',
            `GRN Item Needs Classification: ${item.itemDescription}`,
            `Item from GRN #${grnId} could not be auto-classified. Please review and assign disposition.`,
            scope,
          );
          itemResult.notificationSent = true;
          break;
      }

      result.items.push(itemResult);
    }

    this.logger.info('GRN disposition processed', {
      grnId,
      total: acceptedItems.length,
      inventory: result.inventoryUpdated,
      assets: result.assetsCreated,
      directUse: result.directUse,
      manualReview: result.manualReview,
    });

    return result;
  }

  private matchesRule(rule: DispositionRule, item: GRNAcceptedItem): boolean {
    const c = rule.conditions;
    if (c.categories && c.categories.length > 0 && !c.categories.includes(item.category)) return false;
    if (c.minUnitCost !== undefined && item.unitCost < c.minUnitCost) return false;
    if (c.maxUnitCost !== undefined && item.unitCost > c.maxUnitCost) return false;
    if (c.hasSerialNumber !== undefined && c.hasSerialNumber !== (!!item.serialNumbers && item.serialNumbers.length > 0)) return false;
    return true;
  }
}
