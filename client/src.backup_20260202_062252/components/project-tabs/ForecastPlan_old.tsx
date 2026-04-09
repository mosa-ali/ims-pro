import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useAuth } from "@/_core/hooks/useAuth";
import { ArrowLeft, Save, AlertCircle } from "lucide-react";

interface ForecastPlanProps {
  projectId: number;
}

export function ForecastPlan({ projectId }: ForecastPlanProps) {
  // Using toast from sonner
  const { user } = useAuth();
  const [editMode, setEditMode] = useState(false);

  // Fetch budgets for this project
  const { data: budgets = [], isLoading: budgetsLoading } = trpc.finance.getBudgetsByProject.useQuery({ projectId });
  
  // Fetch expenditures for actual spent
  const { data: expenditures = [] } = trpc.finance.getExpendituresByProject.useQuery({ projectId });
  
  // Fetch forecast plans
  const { data: forecastPlans = [], refetch } = trpc.forecastPlans.list.useQuery({ projectId });

  const [forecastData, setForecastData] = useState<Record<number, Record<string, string>>>({});

  const updateForecastMutation = trpc.forecastPlans.update.useMutation({
    onSuccess: () => {
      toast.success("Forecast plan saved successfully");
      refetch();
      setEditMode(false);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  // Calculate totals
  const summary = useMemo(() => {
    let totalBudget = 0;
    let totalForecast = 0;
    let totalActual = 0;

    budgets.forEach((budget) => {
      if (budget.status === "approved") {
        totalBudget += parseFloat(budget.budgetedAmount || "0");
      }
    });

    expenditures.forEach((exp) => {
      if (exp.status === "approved") {
        totalActual += parseFloat(exp.amount || "0");
      }
    });

    forecastPlans.forEach((plan) => {
      for (let i = 1; i <= 12; i++) {
        const monthKey = `month${i}` as keyof typeof plan;
        totalForecast += parseFloat((plan[monthKey] as string) || "0");
      }
    });

    return {
      totalBudget,
      totalForecast,
      totalActual,
      balance: totalBudget - totalActual,
    };
  }, [budgets, expenditures, forecastPlans]);

  const canEdit = user?.role === "admin" || user?.role === "manager";

  const handleMonthChange = (budgetId: number, month: string, value: string) => {
    setForecastData((prev) => ({
      ...prev,
      [budgetId]: {
        ...(prev[budgetId] || {}),
        [month]: value,
      },
    }));
  };

  const handleSave = async () => {
    // Save all forecast data
    for (const [budgetId, months] of Object.entries(forecastData)) {
      const forecastPlan = forecastPlans.find((fp) => fp.budgetId === parseInt(budgetId));
      
      if (forecastPlan) {
        await updateForecastMutation.mutateAsync({
          id: forecastPlan.id,
          ...months,
        });
      }
    }
  };

  const getMonthValue = (budgetId: number, month: string): string => {
    // Check local state first
    if (forecastData[budgetId]?.[month]) {
      return forecastData[budgetId][month];
    }
    
    // Otherwise get from server data
    const plan = forecastPlans.find((fp) => fp.budgetId === budgetId);
    if (plan) {
      const monthKey = month as keyof typeof plan;
      return (plan[monthKey] as string) || "0";
    }
    
    return "0";
  };

  const calculateRowForecast = (budgetId: number): number => {
    let total = 0;
    for (let i = 1; i <= 12; i++) {
      const value = getMonthValue(budgetId, `month${i}`);
      total += parseFloat(value || "0");
    }
    return total;
  };

  const calculateActualSpent = (budgetId: number): number => {
    return expenditures
      .filter((exp) => exp.budgetId === budgetId && exp.status === "approved")
      .reduce((sum, exp) => sum + parseFloat(exp.amount || "0"), 0);
  };

  if (budgetsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Loading forecast plan...</div>
      </div>
    );
  }

  const approvedBudgets = budgets.filter((b) => b.status === "approved");

  if (approvedBudgets.length === 0) {
    return (
      <Card className="p-8">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No Approved Budget</h3>
          <p className="text-muted-foreground">
            You need to have approved budget lines in the Financial Overview tab before creating a forecast plan.
          </p>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Forecast Plan</h2>
          <p className="text-muted-foreground">Monthly financial forecasting and planning</p>
        </div>
        <div className="flex gap-2">
          {canEdit && !editMode && (
            <Button onClick={() => setEditMode(true)}>Edit Forecast</Button>
          )}
          {editMode && (
            <>
              <Button variant="outline" onClick={() => {
                setEditMode(false);
                setForecastData({});
              }}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={updateForecastMutation.isPending}>
                <Save className="h-4 w-4 mr-2" />
                Save Changes
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Excel-like Grid */}
      <div className="border rounded-lg overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted">
            <tr>
              <th className="px-4 py-3 text-left font-semibold border-r sticky left-0 bg-muted z-10 min-w-[200px]">
                Budget Line / Activity
              </th>
              <th className="px-4 py-3 text-right font-semibold border-r min-w-[120px]">Total Budget</th>
              <th className="px-4 py-3 text-right font-semibold border-r min-w-[80px]">M1</th>
              <th className="px-4 py-3 text-right font-semibold border-r min-w-[80px]">M2</th>
              <th className="px-4 py-3 text-right font-semibold border-r min-w-[80px]">M3</th>
              <th className="px-4 py-3 text-right font-semibold border-r min-w-[80px]">M4</th>
              <th className="px-4 py-3 text-right font-semibold border-r min-w-[80px]">M5</th>
              <th className="px-4 py-3 text-right font-semibold border-r min-w-[80px]">M6</th>
              <th className="px-4 py-3 text-right font-semibold border-r min-w-[80px]">M7</th>
              <th className="px-4 py-3 text-right font-semibold border-r min-w-[80px]">M8</th>
              <th className="px-4 py-3 text-right font-semibold border-r min-w-[80px]">M9</th>
              <th className="px-4 py-3 text-right font-semibold border-r min-w-[80px]">M10</th>
              <th className="px-4 py-3 text-right font-semibold border-r min-w-[80px]">M11</th>
              <th className="px-4 py-3 text-right font-semibold border-r min-w-[80px]">M12</th>
              <th className="px-4 py-3 text-right font-semibold border-r min-w-[120px]">Total Forecast</th>
              <th className="px-4 py-3 text-right font-semibold border-r min-w-[120px]">Actual Spent</th>
              <th className="px-4 py-3 text-right font-semibold min-w-[120px]">Balance</th>
            </tr>
          </thead>
          <tbody>
            {approvedBudgets.map((budget, idx) => {
              const rowForecast = calculateRowForecast(budget.id);
              const actualSpent = calculateActualSpent(budget.id);
              const balance = rowForecast - actualSpent;
              const budgetAmount = parseFloat(budget.budgetedAmount || "0");
              const exceedsBudget = rowForecast > budgetAmount;

              return (
                <tr key={budget.id} className={idx % 2 === 0 ? "bg-background" : "bg-muted/30"}>
                  <td className="px-4 py-3 border-r sticky left-0 bg-inherit z-10 font-medium">
                    Budget Line {budget.id}
                  </td>
                  <td className="px-4 py-3 text-right border-r font-semibold">
                    {budget.currency} {budgetAmount.toLocaleString()}
                  </td>
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((month) => (
                    <td key={month} className="px-2 py-2 border-r">
                      {editMode ? (
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={getMonthValue(budget.id, `month${month}`)}
                          onChange={(e) => handleMonthChange(budget.id, `month${month}`, e.target.value)}
                          className="w-full text-right h-8"
                        />
                      ) : (
                        <div className="text-right">
                          {parseFloat(getMonthValue(budget.id, `month${month}`)).toLocaleString()}
                        </div>
                      )}
                    </td>
                  ))}
                  <td className={`px-4 py-3 text-right border-r font-semibold ${exceedsBudget ? "text-red-600" : ""}`}>
                    {rowForecast.toLocaleString()}
                    {exceedsBudget && <AlertCircle className="inline h-4 w-4 ml-1" />}
                  </td>
                  <td className="px-4 py-3 text-right border-r">
                    {actualSpent.toLocaleString()}
                  </td>
                  <td className={`px-4 py-3 text-right font-semibold ${balance < 0 ? "text-red-600" : "text-green-600"}`}>
                    {balance.toLocaleString()}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Summary Panel */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-6">
          <div className="text-sm text-muted-foreground mb-1">Approved Budget</div>
          <div className="text-2xl font-bold">${summary.totalBudget.toLocaleString()}</div>
        </Card>
        <Card className="p-6">
          <div className="text-sm text-muted-foreground mb-1">Total Forecast</div>
          <div className="text-2xl font-bold text-blue-600">${summary.totalForecast.toLocaleString()}</div>
        </Card>
        <Card className="p-6">
          <div className="text-sm text-muted-foreground mb-1">Actual Spent</div>
          <div className="text-2xl font-bold text-orange-600">${summary.totalActual.toLocaleString()}</div>
        </Card>
        <Card className="p-6">
          <div className="text-sm text-muted-foreground mb-1">Balance</div>
          <div className={`text-2xl font-bold ${summary.balance < 0 ? "text-red-600" : "text-green-600"}`}>
            ${summary.balance.toLocaleString()}
          </div>
        </Card>
      </div>
    </div>
  );
}
