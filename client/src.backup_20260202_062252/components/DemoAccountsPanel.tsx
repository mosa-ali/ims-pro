import { ChevronRight } from "lucide-react";
import { useTranslation } from "@/i18n/useTranslation";

interface DemoAccount {
  email: string;
  name: string;
  role: string;
  roleDescription: string;
}

const demoAccounts: DemoAccount[] = [
  {
    email: "sarah.johnson@relief-intl.org",
    name: "Sarah Johnson",
    role: "Org Admin",
    roleDescription: "Full system access"
  },
  {
    email: "ahmad.hassan@relief-intl.org",
    name: "Ahmad Hassan",
    role: "Program Manager",
    roleDescription: "Grants & Projects management"
  },
  {
    email: "maria.garcia@relief-intl.org",
    name: "Maria Garcia",
    role: "Finance Manager",
    roleDescription: "Finance & Budget management"
  },
  {
    email: "fatima.alsayed@ijpn.org.jo",
    name: "Fatima Al-Sayed",
    role: "MEAL Officer",
    roleDescription: "M&E and Indicators"
  },
  {
    email: "john.smith@relief-intl.org",
    name: "John Smith",
    role: "Case Worker",
    roleDescription: "Cases & Beneficiaries"
  },
  {
    email: "laura.martinez@iom.int",
    name: "Laura Martinez",
    role: "Viewer",
    roleDescription: "Read-only access"
  }
];

interface DemoAccountsPanelProps {
  onSelectAccount: (email: string) => void;
}

export default function DemoAccountsPanel({ onSelectAccount }: DemoAccountsPanelProps) {
  const { t } = useTranslation();

  return (
    <div className="w-full max-w-md bg-white rounded-lg shadow-lg p-8">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          {t.auth.demoAccounts}
        </h2>
        <p className="text-sm text-gray-600">
          {t.auth.demoAccountsInstructions}
          <span className="font-mono font-semibold text-gray-900 ml-1">
            demo123
          </span>
        </p>
      </div>

      <div className="space-y-3">
        {demoAccounts.map((account) => (
          <button
            key={account.email}
            onClick={() => onSelectAccount(account.email)}
            className="w-full flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all duration-200 text-left group"
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm text-gray-600">
                  {account.roleDescription}
                </span>
                <span className="text-sm font-semibold text-gray-900">
                  {account.role}
                </span>
              </div>
              <p className="text-sm text-gray-700 truncate">
                {account.email}
              </p>
            </div>
            <ChevronRight className="ml-3 h-5 w-5 text-gray-400 group-hover:text-blue-600 transition-colors flex-shrink-0" />
          </button>
        ))}
      </div>

      <div className="mt-8 p-4 bg-blue-50 rounded-lg border border-blue-200">
        <h3 className="text-sm font-semibold text-blue-900 mb-2">
          {t.auth.roleBasedAccessControl}
        </h3>
        <ul className="text-xs text-blue-800 space-y-1">
          <li>
            <span className="font-semibold">{t.auth.orgAdmin}:</span>{" "}
            {t.auth.orgAdminDescription}
          </li>
          <li>
            <span className="font-semibold">{t.auth.programManager}:</span>{" "}
            {t.auth.programManagerDescription}
          </li>
          <li>
            <span className="font-semibold">{t.auth.financeManager}:</span>{" "}
            {t.auth.financeManagerDescription}
          </li>
          <li>
            <span className="font-semibold">{t.auth.mealOfficer}:</span>{" "}
            {t.auth.mealOfficerDescription}
          </li>
          <li>
            <span className="font-semibold">{t.auth.caseWorker}:</span>{" "}
            {t.auth.caseWorkerDescription}
          </li>
          <li>
            <span className="font-semibold">{t.auth.viewer}:</span>{" "}
            {t.auth.viewerDescription}
          </li>
        </ul>
      </div>
    </div>
  );
}
