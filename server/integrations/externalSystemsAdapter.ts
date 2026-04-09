/**
 * External Systems Integration Adapters
 * Handles integration with GPS providers, fuel card systems, and insurance platforms
 */

// ============================================================================
// TYPES
// ============================================================================

export interface GPSLocation {
  vehicleId: string;
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: Date;
  speed?: number;
  heading?: number;
}

export interface FuelCardTransaction {
  transactionId: string;
  vehicleId: string;
  amount: number;
  quantity: number;
  currency: string;
  timestamp: Date;
  location: string;
  provider: string;
}

export interface InsurancePolicy {
  policyId: string;
  vehicleId: string;
  policyNumber: string;
  provider: string;
  startDate: Date;
  endDate: Date;
  coverageType: string;
  premiumAmount: number;
  status: "active" | "expired" | "cancelled";
}

export interface InsuranceClaim {
  claimId: string;
  policyId: string;
  vehicleId: string;
  claimDate: Date;
  description: string;
  amount: number;
  status: "open" | "approved" | "denied" | "closed";
}

// ============================================================================
// GPS PROVIDER ADAPTER
// ============================================================================

export class GPSProviderAdapter {
  private provider: "google" | "openstreetmap" | "custom";
  private apiKey: string;

  constructor(provider: "google" | "openstreetmap" | "custom", apiKey: string) {
    this.provider = provider;
    this.apiKey = apiKey;
  }

  /**
   * Get current vehicle location
   */
  async getVehicleLocation(vehicleId: string): Promise<GPSLocation | null> {
    try {
      switch (this.provider) {
        case "google":
          return await this.getGoogleMapsLocation(vehicleId);
        case "openstreetmap":
          return await this.getOpenStreetMapLocation(vehicleId);
        case "custom":
          return await this.getCustomProviderLocation(vehicleId);
        default:
          return null;
      }
    } catch (error) {
      console.error(`[GPS] Error getting location for ${vehicleId}:`, error);
      return null;
    }
  }

  /**
   * Get Google Maps location
   */
  private async getGoogleMapsLocation(vehicleId: string): Promise<GPSLocation | null> {
    // Implementation would call Google Maps API
    // This is a placeholder for the actual implementation
    return {
      vehicleId,
      latitude: 24.7136,
      longitude: 46.6753,
      accuracy: 10,
      timestamp: new Date(),
      speed: 60,
      heading: 180,
    };
  }

  /**
   * Get OpenStreetMap location
   */
  private async getOpenStreetMapLocation(vehicleId: string): Promise<GPSLocation | null> {
    // Implementation would call OpenStreetMap API
    // This is a placeholder for the actual implementation
    return {
      vehicleId,
      latitude: 24.7136,
      longitude: 46.6753,
      accuracy: 15,
      timestamp: new Date(),
      speed: 55,
      heading: 180,
    };
  }

  /**
   * Get custom provider location
   */
  private async getCustomProviderLocation(vehicleId: string): Promise<GPSLocation | null> {
    // Implementation would call custom provider API
    // This is a placeholder for the actual implementation
    return {
      vehicleId,
      latitude: 24.7136,
      longitude: 46.6753,
      accuracy: 20,
      timestamp: new Date(),
      speed: 50,
      heading: 180,
    };
  }

  /**
   * Get route between two locations
   */
  async getRoute(
    startLat: number,
    startLng: number,
    endLat: number,
    endLng: number
  ): Promise<{
    distance: number;
    duration: number;
    polyline: string;
  } | null> {
    try {
      switch (this.provider) {
        case "google":
          return await this.getGoogleRoute(startLat, startLng, endLat, endLng);
        case "openstreetmap":
          return await this.getOpenStreetRoute(startLat, startLng, endLat, endLng);
        default:
          return null;
      }
    } catch (error) {
      console.error("[GPS] Error getting route:", error);
      return null;
    }
  }

  /**
   * Get Google Maps route
   */
  private async getGoogleRoute(
    startLat: number,
    startLng: number,
    endLat: number,
    endLng: number
  ): Promise<{
    distance: number;
    duration: number;
    polyline: string;
  }> {
    // Placeholder implementation
    return {
      distance: 25.5,
      duration: 1800,
      polyline: "encoded_polyline_string",
    };
  }

  /**
   * Get OpenStreetMap route
   */
  private async getOpenStreetRoute(
    startLat: number,
    startLng: number,
    endLat: number,
    endLng: number
  ): Promise<{
    distance: number;
    duration: number;
    polyline: string;
  }> {
    // Placeholder implementation
    return {
      distance: 26.0,
      duration: 1900,
      polyline: "encoded_polyline_string",
    };
  }

  /**
   * Start tracking vehicle
   */
  async startTracking(vehicleId: string, interval: number = 60000): Promise<boolean> {
    try {
      console.log(`[GPS] Started tracking vehicle ${vehicleId} every ${interval}ms`);
      return true;
    } catch (error) {
      console.error(`[GPS] Error starting tracking for ${vehicleId}:`, error);
      return false;
    }
  }

  /**
   * Stop tracking vehicle
   */
  async stopTracking(vehicleId: string): Promise<boolean> {
    try {
      console.log(`[GPS] Stopped tracking vehicle ${vehicleId}`);
      return true;
    } catch (error) {
      console.error(`[GPS] Error stopping tracking for ${vehicleId}:`, error);
      return false;
    }
  }
}

// ============================================================================
// FUEL CARD SYSTEM ADAPTER
// ============================================================================

export class FuelCardAdapter {
  private provider: string;
  private apiKey: string;
  private accountId: string;

  constructor(provider: string, apiKey: string, accountId: string) {
    this.provider = provider;
    this.apiKey = apiKey;
    this.accountId = accountId;
  }

  /**
   * Get fuel card transactions
   */
  async getTransactions(
    startDate: Date,
    endDate: Date,
    vehicleId?: string
  ): Promise<FuelCardTransaction[]> {
    try {
      switch (this.provider) {
        case "fuelcard":
          return await this.getFuelCardTransactions(startDate, endDate, vehicleId);
        case "fleetcard":
          return await this.getFleetCardTransactions(startDate, endDate, vehicleId);
        default:
          return [];
      }
    } catch (error) {
      console.error("[Fuel Card] Error getting transactions:", error);
      return [];
    }
  }

  /**
   * Get FuelCard provider transactions
   */
  private async getFuelCardTransactions(
    startDate: Date,
    endDate: Date,
    vehicleId?: string
  ): Promise<FuelCardTransaction[]> {
    // Placeholder implementation
    return [
      {
        transactionId: "FC-001",
        vehicleId: vehicleId || "veh-001",
        amount: 150,
        quantity: 50,
        currency: "USD",
        timestamp: new Date(),
        location: "Shell Station - Riyadh",
        provider: "fuelcard",
      },
    ];
  }

  /**
   * Get FleetCard provider transactions
   */
  private async getFleetCardTransactions(
    startDate: Date,
    endDate: Date,
    vehicleId?: string
  ): Promise<FuelCardTransaction[]> {
    // Placeholder implementation
    return [
      {
        transactionId: "FC-002",
        vehicleId: vehicleId || "veh-001",
        amount: 160,
        quantity: 52,
        currency: "USD",
        timestamp: new Date(),
        location: "Aramco Station - Jeddah",
        provider: "fleetcard",
      },
    ];
  }

  /**
   * Get fuel card balance
   */
  async getCardBalance(cardId: string): Promise<number> {
    try {
      console.log(`[Fuel Card] Getting balance for card ${cardId}`);
      // Placeholder implementation
      return 5000;
    } catch (error) {
      console.error("[Fuel Card] Error getting balance:", error);
      return 0;
    }
  }

  /**
   * Get fuel card statement
   */
  async getStatement(
    startDate: Date,
    endDate: Date
  ): Promise<{
    totalTransactions: number;
    totalAmount: number;
    totalQuantity: number;
    averagePricePerLiter: number;
  }> {
    try {
      const transactions = await this.getTransactions(startDate, endDate);

      const totalAmount = transactions.reduce((sum, t) => sum + t.amount, 0);
      const totalQuantity = transactions.reduce((sum, t) => sum + t.quantity, 0);

      return {
        totalTransactions: transactions.length,
        totalAmount,
        totalQuantity,
        averagePricePerLiter: totalQuantity > 0 ? totalAmount / totalQuantity : 0,
      };
    } catch (error) {
      console.error("[Fuel Card] Error getting statement:", error);
      return {
        totalTransactions: 0,
        totalAmount: 0,
        totalQuantity: 0,
        averagePricePerLiter: 0,
      };
    }
  }

  /**
   * Reconcile fuel card transactions with fleet logs
   */
  async reconcileTransactions(
    fleetFuelLogs: any[]
  ): Promise<{
    matched: number;
    unmatched: number;
    discrepancies: Array<{
      transactionId: string;
      vehicleId: string;
      difference: number;
    }>;
  }> {
    try {
      const cardTransactions = await this.getTransactions(
        new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        new Date()
      );

      let matched = 0;
      let unmatched = 0;
      const discrepancies = [];

      cardTransactions.forEach((cardTx) => {
        const matchingLog = fleetFuelLogs.find((log) => log.vehicleId === cardTx.vehicleId);

        if (matchingLog) {
          matched++;
          const difference = Math.abs(matchingLog.quantityLiters - cardTx.quantity);
          if (difference > 1) {
            discrepancies.push({
              transactionId: cardTx.transactionId,
              vehicleId: cardTx.vehicleId,
              difference,
            });
          }
        } else {
          unmatched++;
        }
      });

      return { matched, unmatched, discrepancies };
    } catch (error) {
      console.error("[Fuel Card] Error reconciling transactions:", error);
      return { matched: 0, unmatched: 0, discrepancies: [] };
    }
  }
}

// ============================================================================
// INSURANCE PLATFORM ADAPTER
// ============================================================================

export class InsuranceAdapter {
  private provider: string;
  private apiKey: string;
  private accountId: string;

  constructor(provider: string, apiKey: string, accountId: string) {
    this.provider = provider;
    this.apiKey = apiKey;
    this.accountId = accountId;
  }

  /**
   * Get insurance policies
   */
  async getPolicies(): Promise<InsurancePolicy[]> {
    try {
      switch (this.provider) {
        case "allianz":
          return await this.getAllianzPolicies();
        case "axa":
          return await this.getAXAPolicies();
        default:
          return [];
      }
    } catch (error) {
      console.error("[Insurance] Error getting policies:", error);
      return [];
    }
  }

  /**
   * Get Allianz policies
   */
  private async getAllianzPolicies(): Promise<InsurancePolicy[]> {
    // Placeholder implementation
    return [
      {
        policyId: "ALZ-001",
        vehicleId: "veh-001",
        policyNumber: "ALZ-2024-001",
        provider: "allianz",
        startDate: new Date("2024-01-01"),
        endDate: new Date("2025-01-01"),
        coverageType: "comprehensive",
        premiumAmount: 5000,
        status: "active",
      },
    ];
  }

  /**
   * Get AXA policies
   */
  private async getAXAPolicies(): Promise<InsurancePolicy[]> {
    // Placeholder implementation
    return [
      {
        policyId: "AXA-001",
        vehicleId: "veh-002",
        policyNumber: "AXA-2024-001",
        provider: "axa",
        startDate: new Date("2024-01-01"),
        endDate: new Date("2025-01-01"),
        coverageType: "third-party",
        premiumAmount: 3000,
        status: "active",
      },
    ];
  }

  /**
   * Get policy details
   */
  async getPolicyDetails(policyId: string): Promise<InsurancePolicy | null> {
    try {
      const policies = await this.getPolicies();
      return policies.find((p) => p.policyId === policyId) || null;
    } catch (error) {
      console.error("[Insurance] Error getting policy details:", error);
      return null;
    }
  }

  /**
   * Get insurance claims
   */
  async getClaims(policyId?: string): Promise<InsuranceClaim[]> {
    try {
      // Placeholder implementation
      return [
        {
          claimId: "CLM-001",
          policyId: policyId || "ALZ-001",
          vehicleId: "veh-001",
          claimDate: new Date(),
          description: "Minor collision",
          amount: 2000,
          status: "approved",
        },
      ];
    } catch (error) {
      console.error("[Insurance] Error getting claims:", error);
      return [];
    }
  }

  /**
   * File new claim
   */
  async fileClaim(
    policyId: string,
    vehicleId: string,
    description: string,
    amount: number
  ): Promise<{
    claimId: string;
    status: string;
    message: string;
  }> {
    try {
      const claimId = `CLM-${Date.now()}`;
      console.log(`[Insurance] Filed claim ${claimId} for policy ${policyId}`);

      return {
        claimId,
        status: "submitted",
        message: "Claim submitted successfully",
      };
    } catch (error) {
      console.error("[Insurance] Error filing claim:", error);
      return {
        claimId: "",
        status: "error",
        message: "Failed to file claim",
      };
    }
  }

  /**
   * Check policy expiration
   */
  async checkPolicyExpiration(): Promise<{
    expiringPolicies: InsurancePolicy[];
    expiredPolicies: InsurancePolicy[];
  }> {
    try {
      const policies = await this.getPolicies();
      const now = new Date();
      const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

      const expiringPolicies = policies.filter(
        (p) => p.endDate > now && p.endDate <= thirtyDaysFromNow
      );
      const expiredPolicies = policies.filter((p) => p.endDate < now);

      return { expiringPolicies, expiredPolicies };
    } catch (error) {
      console.error("[Insurance] Error checking expiration:", error);
      return { expiringPolicies: [], expiredPolicies: [] };
    }
  }

  /**
   * Get coverage summary
   */
  async getCoverageSummary(): Promise<{
    totalPolicies: number;
    activePolicies: number;
    totalCoverage: number;
    totalPremiums: number;
  }> {
    try {
      const policies = await this.getPolicies();

      const activePolicies = policies.filter((p) => p.status === "active").length;
      const totalCoverage = policies.reduce((sum, p) => sum + 100000, 0); // Placeholder
      const totalPremiums = policies.reduce((sum, p) => sum + p.premiumAmount, 0);

      return {
        totalPolicies: policies.length,
        activePolicies,
        totalCoverage,
        totalPremiums,
      };
    } catch (error) {
      console.error("[Insurance] Error getting coverage summary:", error);
      return {
        totalPolicies: 0,
        activePolicies: 0,
        totalCoverage: 0,
        totalPremiums: 0,
      };
    }
  }
}

// ============================================================================
// EXTERNAL SYSTEMS MANAGER
// ============================================================================

export class ExternalSystemsManager {
  private gpsAdapter: GPSProviderAdapter | null = null;
  private fuelCardAdapter: FuelCardAdapter | null = null;
  private insuranceAdapter: InsuranceAdapter | null = null;

  /**
   * Initialize GPS adapter
   */
  initializeGPS(provider: "google" | "openstreetmap" | "custom", apiKey: string): void {
    this.gpsAdapter = new GPSProviderAdapter(provider, apiKey);
    console.log(`[External Systems] GPS adapter initialized: ${provider}`);
  }

  /**
   * Initialize Fuel Card adapter
   */
  initializeFuelCard(provider: string, apiKey: string, accountId: string): void {
    this.fuelCardAdapter = new FuelCardAdapter(provider, apiKey, accountId);
    console.log(`[External Systems] Fuel Card adapter initialized: ${provider}`);
  }

  /**
   * Initialize Insurance adapter
   */
  initializeInsurance(provider: string, apiKey: string, accountId: string): void {
    this.insuranceAdapter = new InsuranceAdapter(provider, apiKey, accountId);
    console.log(`[External Systems] Insurance adapter initialized: ${provider}`);
  }

  /**
   * Get GPS adapter
   */
  getGPS(): GPSProviderAdapter | null {
    return this.gpsAdapter;
  }

  /**
   * Get Fuel Card adapter
   */
  getFuelCard(): FuelCardAdapter | null {
    return this.fuelCardAdapter;
  }

  /**
   * Get Insurance adapter
   */
  getInsurance(): InsuranceAdapter | null {
    return this.insuranceAdapter;
  }

  /**
   * Sync all external systems
   */
  async syncAll(): Promise<{
    gps: boolean;
    fuelCard: boolean;
    insurance: boolean;
  }> {
    const results = {
      gps: false,
      fuelCard: false,
      insurance: false,
    };

    try {
      if (this.gpsAdapter) {
        console.log("[External Systems] Syncing GPS data...");
        results.gps = true;
      }

      if (this.fuelCardAdapter) {
        console.log("[External Systems] Syncing Fuel Card data...");
        results.fuelCard = true;
      }

      if (this.insuranceAdapter) {
        console.log("[External Systems] Syncing Insurance data...");
        results.insurance = true;
      }
    } catch (error) {
      console.error("[External Systems] Error syncing:", error);
    }

    return results;
  }
}

// ============================================================================
// GLOBAL INSTANCE
// ============================================================================

export const externalSystemsManager = new ExternalSystemsManager();
