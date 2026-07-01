import { FinanceSynchronizationLogger } from "./FinanceSynchronizationLogger";
import { FinanceTransactionManager } from "./FinanceTransactionManager";
import { FinanceEventBus } from "./FinanceEventBus";
import { FinanceSynchronizationEngine } from "./FinanceSynchronizationEngine";
import { BudgetSynchronizer } from "./synchronizers/BudgetSynchronizer";
import { CommitmentSynchronizer } from "./synchronizers/CommitmentSynchronizer";
import { ExpenditureSynchronizer } from "./synchronizers/ExpenditureSynchronizer";
import { AssetSynchronizer } from "./synchronizers/AssetSynchronizer";
import { TreasurySynchronizer } from "./synchronizers/TreasurySynchronizer";
import { HRSynchronizer } from "./synchronizers/HRSynchronizer";
import { MultiCurrencySynchronizer } from "./synchronizers/MultiCurrencySynchronizer";
import { DonorSynchronizer } from "./synchronizers/DonorSynchronizer";
import { WorkflowSynchronizer } from "./synchronizers/WorkflowSynchronizer";
import { ExecutiveReportingSynchronizer } from "./synchronizers/ExecutiveReportingSynchronizer";

const financeLogger = new FinanceSynchronizationLogger();
const financeTransactionManager = new FinanceTransactionManager(financeLogger);
const financeEventBus = new FinanceEventBus(financeLogger);
const financeSynchronizationEngine = new FinanceSynchronizationEngine(financeEventBus, financeTransactionManager, financeLogger);

// Create a default synchronization context (will be overridden at runtime with actual org/ou data)
const defaultContext = {
  organizationId: 0,
  operatingUnitId: 0,
  userId: undefined,
  correlationId: undefined,
};

const budgetSynchronizer = new BudgetSynchronizer(financeEventBus, financeTransactionManager, financeLogger);
budgetSynchronizer.initialize();

const commitmentSynchronizer = new CommitmentSynchronizer(financeEventBus, financeTransactionManager, financeLogger);
commitmentSynchronizer.initialize();

const expenditureSynchronizer = new ExpenditureSynchronizer(financeEventBus, financeTransactionManager, financeLogger);
expenditureSynchronizer.initialize();

const assetSynchronizer = new AssetSynchronizer(financeEventBus, financeTransactionManager, financeLogger);
assetSynchronizer.initialize();

const treasurySynchronizer = new TreasurySynchronizer(financeEventBus, financeTransactionManager, financeLogger);
treasurySynchronizer.initialize();

const hrSynchronizer = new HRSynchronizer(financeEventBus, financeTransactionManager, financeLogger);
hrSynchronizer.initialize();

const multiCurrencySynchronizer = new MultiCurrencySynchronizer(financeEventBus, financeTransactionManager, defaultContext);
multiCurrencySynchronizer.initialize();

const donorSynchronizer = new DonorSynchronizer(financeEventBus, financeTransactionManager, defaultContext);
donorSynchronizer.initialize();

const workflowSynchronizer = new WorkflowSynchronizer(financeEventBus, financeTransactionManager, defaultContext);
workflowSynchronizer.initialize();

const executiveReportingSynchronizer = new ExecutiveReportingSynchronizer(financeEventBus, financeTransactionManager, defaultContext);
executiveReportingSynchronizer.initialize();

// Export instances for use in other parts of the application
export { financeLogger, financeTransactionManager, financeEventBus, financeSynchronizationEngine, budgetSynchronizer, commitmentSynchronizer, expenditureSynchronizer, assetSynchronizer, treasurySynchronizer, hrSynchronizer, multiCurrencySynchronizer, donorSynchronizer, workflowSynchronizer, executiveReportingSynchronizer };

// Optionally, register initial synchronizers here (will be done in later phases)
// financeEventBus.registerHandler("PurchaseOrderApproved", commitmentSynchronizer.handlePurchaseOrderApproved);
