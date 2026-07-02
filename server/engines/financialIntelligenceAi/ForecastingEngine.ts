/**
 * Forecasting Engine
 * Provides budget forecasting, cash flow forecasting, burn rate forecasting,
 * and completion date forecasting using multiple algorithms.
 */

import { getDb } from "../../db";
import { projects, budgetLines, financeExpenditures } from "../../../drizzle/schema";
import { eq, and, sum, sql } from "drizzle-orm";

export interface ForecastData {
  date: Date;
  value: number;
  confidence: number; // 0-100
  method: "linear" | "exponential" | "seasonal";
}

export interface BudgetForecast {
  projectId: number;
  currentSpent: number;
  projectedFinalSpent: number;
  variance: number;
  variancePercent: number;
  confidence: number;
  forecastData: ForecastData[];
}

export interface CashFlowForecast {
  date: Date;
  inflow: number;
  outflow: number;
  netCashFlow: number;
  cumulativeCashFlow: number;
}

export interface PredictiveSeriesPoint {
  date: string;
  value: number;
}

export interface PredictiveForecastResult {
  forecast: ForecastData[];
  trend: "increasing" | "decreasing" | "stable";
  confidence: number;
  predictedTotal: number;
  methodBlend: Array<ForecastData["method"]>;
}

export class ForecastingEngine {
  forecastSeries(input: {
    history: PredictiveSeriesPoint[];
    horizonDays: number;
  }): PredictiveForecastResult {
    const history = input.history
      .map((point) => ({ date: new Date(point.date), amount: point.value }))
      .sort((a, b) => a.date.getTime() - b.date.getTime());
    const linear = this.linearRegression(history, input.horizonDays);
    const exponential = this.exponentialSmoothing(history, input.horizonDays);
    const seasonal = this.seasonalDecomposition(history, input.horizonDays);
    const combined = this.combineForecasts(
      [
        { data: linear, weight: 0.45 },
        { data: exponential, weight: 0.35 },
        { data: seasonal, weight: 0.2 },
      ],
      input.horizonDays,
    );

    return {
      forecast: combined,
      trend: this.detectTrend(history),
      confidence: this.calculateForecastConfidence(linear, exponential, seasonal),
      predictedTotal: combined.reduce((sum, item) => sum + item.value, 0),
      methodBlend: ["linear", "exponential", "seasonal"].filter((method) => {
        return { linear, exponential, seasonal }[method as ForecastData["method"]].length > 0;
      }) as Array<ForecastData["method"]>,
    };
  }

  /**
   * Forecast budget utilization using multiple methods
   */
  async forecastBudget(
    organizationId: number,
    projectId: number,
    forecastDays: number = 90
  ): Promise<BudgetForecast> {
    const db = await getDb();

    // Get project and budget data
    const [project] = await db
      .select()
      .from(projects)
      .where(and(eq(projects.id, projectId), eq(projects.organizationId, organizationId)));

    if (!project) {
      throw new Error("Project not found");
    }

    // Get historical spending data
    const historicalData = await this.getHistoricalSpending(db, projectId, organizationId, 90);

    // Calculate current spent
    const currentSpent = historicalData.reduce((sum, item) => sum + item.amount, 0);

    // Forecast using multiple methods
    const linearForecast = this.linearRegression(historicalData, forecastDays);
    const exponentialForecast = this.exponentialSmoothing(historicalData, forecastDays);
    const seasonalForecast = this.seasonalDecomposition(historicalData, forecastDays);

    // Combine forecasts with weighted average
    const combinedForecast = this.combineForecasts(
      [
        { data: linearForecast, weight: 0.4 },
        { data: exponentialForecast, weight: 0.35 },
        { data: seasonalForecast, weight: 0.25 },
      ],
      forecastDays
    );

    // Get total budget
    const [budgetData] = await db
      .select({ total: sum(sql`${budgetLines.unitCost} * ${budgetLines.quantity}`) })
      .from(budgetLines)
      .where(eq(budgetLines.projectId, projectId));

    const totalBudget = budgetData?.total ? parseFloat(budgetData.total.toString()) : 0;
    const projectedFinalSpent = currentSpent + combinedForecast.reduce((sum, item) => sum + item.value, 0);
    const variance = projectedFinalSpent - totalBudget;
    const variancePercent = (variance / totalBudget) * 100;

    // Calculate confidence based on data consistency
    const confidence = this.calculateForecastConfidence(linearForecast, exponentialForecast, seasonalForecast);

    return {
      projectId,
      currentSpent,
      projectedFinalSpent,
      variance,
      variancePercent,
      confidence,
      forecastData: combinedForecast,
    };
  }

  /**
   * Forecast cash flow for the next period
   */
  async forecastCashFlow(
    organizationId: number,
    projectId: number,
    forecastDays: number = 90
  ): Promise<CashFlowForecast[]> {
    const db = await getDb();
    const cashFlowForecasts: CashFlowForecast[] = [];
    let cumulativeCashFlow = 0;

    for (let i = 1; i <= forecastDays; i++) {
      const date = new Date();
      date.setDate(date.getDate() + i);

      // Estimate daily inflow and outflow
      const dailyOutflow = 5000 + Math.random() * 10000; // Mock data
      const dailyInflow = 3000 + Math.random() * 5000; // Mock data
      const netCashFlow = dailyInflow - dailyOutflow;
      cumulativeCashFlow += netCashFlow;

      cashFlowForecasts.push({
        date,
        inflow: dailyInflow,
        outflow: dailyOutflow,
        netCashFlow,
        cumulativeCashFlow,
      });
    }

    return cashFlowForecasts;
  }

  /**
   * Forecast completion date based on burn rate and remaining budget
   */
  async forecastCompletionDate(
    organizationId: number,
    projectId: number
  ): Promise<{ projectedDate: Date; confidence: number; daysRemaining: number }> {
    const db = await getDb();

    // Get project
    const [project] = await db
      .select()
      .from(projects)
      .where(and(eq(projects.id, projectId), eq(projects.organizationId, organizationId)));

    if (!project) {
      throw new Error("Project not found");
    }

    // Calculate average daily burn rate
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().split("T")[0];

    const [spendingData] = await db
      .select({ total: sum(financeExpenditures.amount) })
      .from(financeExpenditures)
      .where(
        and(
          eq(financeExpenditures.projectId, projectId),
          eq(financeExpenditures.organizationId, organizationId),
          sql`DATE(${financeExpenditures.expenditureDate}) >= DATE(${thirtyDaysAgoStr})`
        )
      );

    const dailyBurnRate = (spendingData?.total ? parseFloat(spendingData.total.toString()) : 0) / 30;

    // Get remaining budget
    const [budgetData2] = await db
      .select({
        totalBudget: sum(sql`${budgetLines.unitCost} * ${budgetLines.quantity}`),
        totalSpent: sum(financeExpenditures.amount),
      })
      .from(budgetLines)
      .leftJoin(financeExpenditures, eq(budgetLines.id, financeExpenditures.budgetLineId))
      .where(eq(budgetLines.projectId, projectId));

    const remainingBudget = (budgetData2?.totalBudget ? parseFloat(budgetData2.totalBudget.toString()) : 0) - (budgetData2?.totalSpent ? parseFloat(budgetData2.totalSpent.toString()) : 0);
    const daysUntilBudgetExhausted = dailyBurnRate > 0 ? Math.round(remainingBudget / dailyBurnRate) : 365;

    // Project completion date
    const projectedDate = new Date();
    projectedDate.setDate(projectedDate.getDate() + daysUntilBudgetExhausted);

    // Calculate confidence
    const confidence = Math.min(100, Math.max(0, 100 - Math.abs(daysUntilBudgetExhausted - 90) / 10));

    return {
      projectedDate,
      confidence,
      daysRemaining: daysUntilBudgetExhausted,
    };
  }

  /**
   * Get historical spending data
   */
  private async getHistoricalSpending(
    db: any,
    projectId: number,
    organizationId: number,
    days: number
  ): Promise<Array<{ date: Date; amount: number }>> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const startDateStr = startDate.toISOString().split("T")[0];

    const expenditures = await db
      .select({
        date: financeExpenditures.expenditureDate,
        amount: financeExpenditures.amount,
      })
      .from(financeExpenditures)
      .where(
        and(
          eq(financeExpenditures.projectId, projectId),
          eq(financeExpenditures.organizationId, organizationId),
          sql`DATE(${financeExpenditures.expenditureDate}) >= DATE(${startDateStr})`
        )
      );

    // Aggregate by day
    const dailyData: Record<string, number> = {};
    expenditures.forEach((exp: any) => {
      const dateKey = typeof exp.date === 'string' ? exp.date : exp.date.toISOString().split("T")[0];
      const amount = typeof exp.amount === 'string' ? parseFloat(exp.amount) : exp.amount;
      dailyData[dateKey] = (dailyData[dateKey] || 0) + amount;
    });

    return Object.entries(dailyData).map(([dateStr, amount]) => ({
      date: new Date(dateStr),
      amount,
    }));
  }

  /**
   * Linear regression forecast
   */
  private linearRegression(
    data: Array<{ date: Date; amount: number }>,
    forecastDays: number
  ): ForecastData[] {
    if (data.length < 2) return [];

    const n = data.length;
    const x = Array.from({ length: n }, (_, i) => i);
    const y = data.map((d) => d.amount);

    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
    const sumX2 = x.reduce((sum, xi) => sum + xi * xi, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    const forecasts: ForecastData[] = [];
    for (let i = 1; i <= forecastDays; i++) {
      const predictedValue = slope * (n + i) + intercept;
      forecasts.push({
        date: new Date(data[data.length - 1].date.getTime() + i * 24 * 60 * 60 * 1000),
        value: Math.max(0, predictedValue),
        confidence: Math.max(50, 100 - i * 0.5),
        method: "linear",
      });
    }

    return forecasts;
  }

  /**
   * Exponential smoothing forecast
   */
  private exponentialSmoothing(
    data: Array<{ date: Date; amount: number }>,
    forecastDays: number,
    alpha: number = 0.3
  ): ForecastData[] {
    if (data.length === 0) return [];

    const forecasts: ForecastData[] = [];
    let smoothed = data[0].amount;

    for (let i = 1; i < data.length; i++) {
      smoothed = alpha * data[i].amount + (1 - alpha) * smoothed;
    }

    for (let i = 1; i <= forecastDays; i++) {
      forecasts.push({
        date: new Date(data[data.length - 1].date.getTime() + i * 24 * 60 * 60 * 1000),
        value: smoothed,
        confidence: Math.max(45, 95 - i * 0.3),
        method: "exponential",
      });
    }

    return forecasts;
  }

  /**
   * Seasonal decomposition forecast
   */
  private seasonalDecomposition(
    data: Array<{ date: Date; amount: number }>,
    forecastDays: number
  ): ForecastData[] {
    if (data.length < 7) return [];

    // Simple seasonal pattern: assume weekly seasonality
    const weeklyPattern = Array(7).fill(0);
    const counts = Array(7).fill(0);

    data.forEach((d) => {
      const dayOfWeek = d.date.getDay();
      weeklyPattern[dayOfWeek] += d.amount;
      counts[dayOfWeek]++;
    });

    const avgPattern = weeklyPattern.map((sum, i) => (counts[i] > 0 ? sum / counts[i] : 0));
    const avgValue = data.reduce((sum, d) => sum + d.amount, 0) / data.length;

    const forecasts: ForecastData[] = [];
    for (let i = 1; i <= forecastDays; i++) {
      const dayOfWeek = (new Date().getDay() + i) % 7;
      const seasonalValue = avgPattern[dayOfWeek] || avgValue;
      forecasts.push({
        date: new Date(data[data.length - 1].date.getTime() + i * 24 * 60 * 60 * 1000),
        value: seasonalValue,
        confidence: Math.max(40, 90 - i * 0.2),
        method: "seasonal",
      });
    }

    return forecasts;
  }

  /**
   * Combine multiple forecasts with weighted average
   */
  private combineForecasts(
    forecasts: Array<{ data: ForecastData[]; weight: number }>,
    forecastDays: number
  ): ForecastData[] {
    const combined: ForecastData[] = [];

    for (let i = 0; i < forecastDays; i++) {
      let totalValue = 0;
      let totalConfidence = 0;
      let totalWeight = 0;

      forecasts.forEach(({ data, weight }) => {
        if (i < data.length) {
          totalValue += data[i].value * weight;
          totalConfidence += data[i].confidence * weight;
          totalWeight += weight;
        }
      });

      combined.push({
        date: new Date(new Date().getTime() + (i + 1) * 24 * 60 * 60 * 1000),
        value: totalWeight > 0 ? totalValue / totalWeight : 0,
        confidence: totalWeight > 0 ? totalConfidence / totalWeight : 0,
        method: "linear",
      });
    }

    return combined;
  }

  /**
   * Calculate forecast confidence based on method consistency
   */
  private calculateForecastConfidence(
    linear: ForecastData[],
    exponential: ForecastData[],
    seasonal: ForecastData[]
  ): number {
    if (linear.length === 0 || exponential.length === 0 || seasonal.length === 0) {
      return 50;
    }

    // Calculate variance between methods
    let totalVariance = 0;
    const minLength = Math.min(linear.length, exponential.length, seasonal.length);

    for (let i = 0; i < minLength; i++) {
      const values = [linear[i].value, exponential[i].value, seasonal[i].value];
      const mean = values.reduce((a, b) => a + b, 0) / values.length;
      const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
      totalVariance += variance;
    }

    const avgVariance = totalVariance / minLength;
    const confidence = Math.max(30, Math.min(95, 100 - avgVariance / 100));

    return Math.round(confidence);
  }

  private detectTrend(data: Array<{ date: Date; amount: number }>): "increasing" | "decreasing" | "stable" {
    if (data.length < 2) return "stable";
    const midpoint = Math.floor(data.length / 2);
    const first = data.slice(0, midpoint);
    const second = data.slice(midpoint);
    const firstAverage = first.reduce((sum, item) => sum + item.amount, 0) / Math.max(first.length, 1);
    const secondAverage = second.reduce((sum, item) => sum + item.amount, 0) / Math.max(second.length, 1);
    const change = firstAverage > 0 ? ((secondAverage - firstAverage) / firstAverage) * 100 : 0;
    if (change > 10) return "increasing";
    if (change < -10) return "decreasing";
    return "stable";
  }
}

export const forecastingEngine = new ForecastingEngine();
