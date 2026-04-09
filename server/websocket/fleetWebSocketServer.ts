/**
 * WebSocket Server for Real-Time Fleet Management Updates
 * Handles live trip tracking, fleet status, and real-time notifications
 */

import { WebSocketServer, WebSocket } from "ws";
import { Server } from "http";
import { verify } from "jose";
import { env } from "./env";

// ============================================================================
// WEBSOCKET MESSAGE TYPES
// ============================================================================

export type WebSocketMessageType =
  | "trip:start"
  | "trip:update"
  | "trip:complete"
  | "vehicle:status"
  | "driver:status"
  | "fleet:overview"
  | "alert:notification"
  | "subscribe"
  | "unsubscribe"
  | "ping"
  | "pong";

export interface WebSocketMessage {
  type: WebSocketMessageType;
  payload: any;
  timestamp: number;
  userId?: string;
  organizationId?: string;
}

export interface TripUpdate {
  tripId: string;
  vehicleId: string;
  driverId: string;
  currentLocation: {
    latitude: number;
    longitude: number;
  };
  distance: number;
  fuelConsumed: number;
  speed: number;
  status: "in_progress" | "completed" | "paused";
  estimatedArrival?: Date;
}

export interface VehicleStatus {
  vehicleId: string;
  status: "active" | "maintenance" | "idle";
  location?: {
    latitude: number;
    longitude: number;
  };
  lastUpdate: Date;
  fuelLevel?: number;
  mileage?: number;
}

export interface DriverStatus {
  driverId: string;
  status: "active" | "on_break" | "offline";
  currentTripId?: string;
  location?: {
    latitude: number;
    longitude: number;
  };
  lastUpdate: Date;
}

export interface FleetOverview {
  totalVehicles: number;
  activeVehicles: number;
  vehiclesInMaintenance: number;
  idleVehicles: number;
  totalTripsToday: number;
  completedTripsToday: number;
  ongoingTrips: number;
  totalDistance: number;
  totalFuel: number;
  averageEfficiency: number;
}

// ============================================================================
// WEBSOCKET CLIENT MANAGER
// ============================================================================

interface ClientConnection {
  ws: WebSocket;
  userId: string;
  organizationId: string;
  operatingUnitId: string;
  subscriptions: Set<string>;
  lastHeartbeat: number;
}

export class FleetWebSocketServer {
  private wss: WebSocketServer;
  private clients: Map<string, ClientConnection> = new Map();
  private subscriptions: Map<string, Set<string>> = new Map(); // channel -> clientIds
  private heartbeatInterval: NodeJS.Timeout | null = null;

  constructor(server: Server) {
    this.wss = new WebSocketServer({ server, path: "/api/ws/fleet" });
    this.setupServer();
  }

  /**
   * Setup WebSocket server
   */
  private setupServer(): void {
    this.wss.on("connection", (ws: WebSocket) => {
      console.log("[WebSocket] New connection");

      ws.on("message", (data: string) => this.handleMessage(ws, data));
      ws.on("close", () => this.handleClose(ws));
      ws.on("error", (error) => this.handleError(ws, error));
    });

    // Start heartbeat
    this.startHeartbeat();
  }

  /**
   * Handle incoming messages
   */
  private async handleMessage(ws: WebSocket, data: string): Promise<void> {
    try {
      const message: WebSocketMessage = JSON.parse(data);

      // Verify authentication for non-ping messages
      if (message.type !== "ping" && message.type !== "pong") {
        const client = this.getClientByWebSocket(ws);
        if (!client) {
          ws.close(1008, "Unauthorized");
          return;
        }
      }

      switch (message.type) {
        case "subscribe":
          this.handleSubscribe(ws, message);
          break;
        case "unsubscribe":
          this.handleUnsubscribe(ws, message);
          break;
        case "trip:update":
          this.broadcastTripUpdate(message.payload);
          break;
        case "vehicle:status":
          this.broadcastVehicleStatus(message.payload);
          break;
        case "driver:status":
          this.broadcastDriverStatus(message.payload);
          break;
        case "fleet:overview":
          this.broadcastFleetOverview(message.payload);
          break;
        case "ping":
          this.handlePing(ws);
          break;
        default:
          console.warn(`[WebSocket] Unknown message type: ${message.type}`);
      }
    } catch (error) {
      console.error("[WebSocket] Error handling message:", error);
      ws.close(1011, "Internal server error");
    }
  }

  /**
   * Handle subscription
   */
  private handleSubscribe(ws: WebSocket, message: WebSocketMessage): void {
    const client = this.getClientByWebSocket(ws);
    if (!client) return;

    const channel = message.payload.channel;
    client.subscriptions.add(channel);

    if (!this.subscriptions.has(channel)) {
      this.subscriptions.set(channel, new Set());
    }
    this.subscriptions.get(channel)!.add(client.userId);

    console.log(`[WebSocket] User ${client.userId} subscribed to ${channel}`);

    // Send confirmation
    ws.send(
      JSON.stringify({
        type: "subscribe",
        payload: { channel, status: "subscribed" },
        timestamp: Date.now(),
      })
    );
  }

  /**
   * Handle unsubscription
   */
  private handleUnsubscribe(ws: WebSocket, message: WebSocketMessage): void {
    const client = this.getClientByWebSocket(ws);
    if (!client) return;

    const channel = message.payload.channel;
    client.subscriptions.delete(channel);

    const subscribers = this.subscriptions.get(channel);
    if (subscribers) {
      subscribers.delete(client.userId);
      if (subscribers.size === 0) {
        this.subscriptions.delete(channel);
      }
    }

    console.log(`[WebSocket] User ${client.userId} unsubscribed from ${channel}`);
  }

  /**
   * Handle ping
   */
  private handlePing(ws: WebSocket): void {
    const client = this.getClientByWebSocket(ws);
    if (client) {
      client.lastHeartbeat = Date.now();
    }

    ws.send(
      JSON.stringify({
        type: "pong",
        timestamp: Date.now(),
      })
    );
  }

  /**
   * Handle client disconnect
   */
  private handleClose(ws: WebSocket): void {
    const clientId = Array.from(this.clients.entries()).find(
      ([, client]) => client.ws === ws
    )?.[0];

    if (clientId) {
      const client = this.clients.get(clientId);
      if (client) {
        // Remove from subscriptions
        client.subscriptions.forEach((channel) => {
          const subscribers = this.subscriptions.get(channel);
          if (subscribers) {
            subscribers.delete(client.userId);
          }
        });
      }

      this.clients.delete(clientId);
      console.log(`[WebSocket] Client ${clientId} disconnected`);
    }
  }

  /**
   * Handle WebSocket errors
   */
  private handleError(ws: WebSocket, error: Error): void {
    console.error("[WebSocket] Error:", error);
  }

  /**
   * Broadcast trip update to subscribed clients
   */
  public broadcastTripUpdate(tripUpdate: TripUpdate): void {
    const message: WebSocketMessage = {
      type: "trip:update",
      payload: tripUpdate,
      timestamp: Date.now(),
    };

    this.broadcastToChannel(`trip:${tripUpdate.tripId}`, message);
    this.broadcastToChannel(`vehicle:${tripUpdate.vehicleId}`, message);
    this.broadcastToChannel(`driver:${tripUpdate.driverId}`, message);
  }

  /**
   * Broadcast vehicle status to subscribed clients
   */
  public broadcastVehicleStatus(vehicleStatus: VehicleStatus): void {
    const message: WebSocketMessage = {
      type: "vehicle:status",
      payload: vehicleStatus,
      timestamp: Date.now(),
    };

    this.broadcastToChannel(`vehicle:${vehicleStatus.vehicleId}`, message);
    this.broadcastToChannel("fleet:overview", message);
  }

  /**
   * Broadcast driver status to subscribed clients
   */
  public broadcastDriverStatus(driverStatus: DriverStatus): void {
    const message: WebSocketMessage = {
      type: "driver:status",
      payload: driverStatus,
      timestamp: Date.now(),
    };

    this.broadcastToChannel(`driver:${driverStatus.driverId}`, message);
    if (driverStatus.currentTripId) {
      this.broadcastToChannel(`trip:${driverStatus.currentTripId}`, message);
    }
  }

  /**
   * Broadcast fleet overview to subscribed clients
   */
  public broadcastFleetOverview(overview: FleetOverview): void {
    const message: WebSocketMessage = {
      type: "fleet:overview",
      payload: overview,
      timestamp: Date.now(),
    };

    this.broadcastToChannel("fleet:overview", message);
  }

  /**
   * Send alert notification
   */
  public sendAlert(
    organizationId: string,
    alert: {
      id: string;
      type: "warning" | "error" | "info";
      title: string;
      message: string;
      entityType?: string;
      entityId?: string;
    }
  ): void {
    const message: WebSocketMessage = {
      type: "alert:notification",
      payload: alert,
      timestamp: Date.now(),
      organizationId,
    };

    this.broadcastToOrganization(organizationId, message);
  }

  /**
   * Broadcast message to channel
   */
  private broadcastToChannel(channel: string, message: WebSocketMessage): void {
    const subscribers = this.subscriptions.get(channel);
    if (!subscribers) return;

    const messageStr = JSON.stringify(message);
    subscribers.forEach((userId) => {
      const client = Array.from(this.clients.values()).find((c) => c.userId === userId);
      if (client && client.ws.readyState === WebSocket.OPEN) {
        client.ws.send(messageStr);
      }
    });
  }

  /**
   * Broadcast message to organization
   */
  private broadcastToOrganization(organizationId: string, message: WebSocketMessage): void {
    const messageStr = JSON.stringify(message);
    this.clients.forEach((client) => {
      if (
        client.organizationId === organizationId &&
        client.ws.readyState === WebSocket.OPEN
      ) {
        client.ws.send(messageStr);
      }
    });
  }

  /**
   * Get client by WebSocket
   */
  private getClientByWebSocket(ws: WebSocket): ClientConnection | undefined {
    return Array.from(this.clients.values()).find((c) => c.ws === ws);
  }

  /**
   * Register client
   */
  public registerClient(
    clientId: string,
    ws: WebSocket,
    userId: string,
    organizationId: string,
    operatingUnitId: string
  ): void {
    this.clients.set(clientId, {
      ws,
      userId,
      organizationId,
      operatingUnitId,
      subscriptions: new Set(),
      lastHeartbeat: Date.now(),
    });

    console.log(`[WebSocket] Client ${clientId} registered`);
  }

  /**
   * Start heartbeat to detect dead connections
   */
  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      const now = Date.now();
      const deadClients: string[] = [];

      this.clients.forEach((client, clientId) => {
        if (now - client.lastHeartbeat > 60 * 1000) {
          // 60 second timeout
          client.ws.close(1000, "Heartbeat timeout");
          deadClients.push(clientId);
        } else {
          // Send ping
          client.ws.send(
            JSON.stringify({
              type: "ping",
              timestamp: now,
            })
          );
        }
      });

      // Remove dead clients
      deadClients.forEach((clientId) => this.clients.delete(clientId));
    }, 30 * 1000); // Check every 30 seconds

    if (this.heartbeatInterval.unref) {
      this.heartbeatInterval.unref();
    }
  }

  /**
   * Get connection statistics
   */
  public getStats(): {
    totalConnections: number;
    totalSubscriptions: number;
    channels: Array<{
      name: string;
      subscribers: number;
    }>;
  } {
    const channels = Array.from(this.subscriptions.entries()).map(([name, subscribers]) => ({
      name,
      subscribers: subscribers.size,
    }));

    return {
      totalConnections: this.clients.size,
      totalSubscriptions: Array.from(this.subscriptions.values()).reduce(
        (sum, subs) => sum + subs.size,
        0
      ),
      channels,
    };
  }

  /**
   * Cleanup
   */
  public destroy(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }

    this.clients.forEach((client) => {
      client.ws.close(1000, "Server shutting down");
    });

    this.clients.clear();
    this.subscriptions.clear();
    this.wss.close();
  }
}

// ============================================================================
// GLOBAL WEBSOCKET SERVER INSTANCE
// ============================================================================

let wsServer: FleetWebSocketServer | null = null;

export function initializeWebSocketServer(server: Server): FleetWebSocketServer {
  if (!wsServer) {
    wsServer = new FleetWebSocketServer(server);
  }
  return wsServer;
}

export function getWebSocketServer(): FleetWebSocketServer {
  if (!wsServer) {
    throw new Error("WebSocket server not initialized");
  }
  return wsServer;
}
