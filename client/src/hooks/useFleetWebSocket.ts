/**
 * Custom Hook for WebSocket Real-Time Fleet Updates
 * Handles connection, subscriptions, and real-time data updates
 */

import { useEffect, useRef, useCallback, useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";

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

export interface Alert {
  id: string;
  type: "warning" | "error" | "info";
  title: string;
  message: string;
  entityType?: string;
  entityId?: string;
}

// ============================================================================
// MAIN WEBSOCKET HOOK
// ============================================================================

export function useFleetWebSocket() {
  const { user } = useAuth();
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const heartbeatTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const messageQueueRef = useRef<WebSocketMessage[]>([]);

  const [isConnected, setIsConnected] = useState(false);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [lastMessageTime, setLastMessageTime] = useState<number>(Date.now());
  const [subscriptions, setSubscriptions] = useState<Set<string>>(new Set());

  // Callbacks for different message types
  const [tripUpdates, setTripUpdates] = useState<Map<string, TripUpdate>>(new Map());
  const [vehicleStatuses, setVehicleStatuses] = useState<Map<string, VehicleStatus>>(
    new Map()
  );
  const [driverStatuses, setDriverStatuses] = useState<Map<string, DriverStatus>>(
    new Map()
  );
  const [fleetOverview, setFleetOverview] = useState<FleetOverview | null>(null);
  const [alerts, setAlerts] = useState<Alert[]>([]);

  /**
   * Connect to WebSocket server
   */
  const connect = useCallback(() => {
    if (!user) return;

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/api/ws/fleet`;

    try {
      setIsReconnecting(true);
      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        console.log("[WebSocket] Connected");
        wsRef.current = ws;
        setIsConnected(true);
        setIsReconnecting(false);

        // Send queued messages
        messageQueueRef.current.forEach((msg) => {
          ws.send(JSON.stringify(msg));
        });
        messageQueueRef.current = [];

        // Start heartbeat
        startHeartbeat();
      };

      ws.onmessage = (event: MessageEvent) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          setLastMessageTime(Date.now());

          switch (message.type) {
            case "trip:update":
              setTripUpdates((prev) => {
                const updated = new Map(prev);
                updated.set(message.payload.tripId, message.payload);
                return updated;
              });
              break;

            case "vehicle:status":
              setVehicleStatuses((prev) => {
                const updated = new Map(prev);
                updated.set(message.payload.vehicleId, message.payload);
                return updated;
              });
              break;

            case "driver:status":
              setDriverStatuses((prev) => {
                const updated = new Map(prev);
                updated.set(message.payload.driverId, message.payload);
                return updated;
              });
              break;

            case "fleet:overview":
              setFleetOverview(message.payload);
              break;

            case "alert:notification":
              setAlerts((prev) => [...prev, message.payload]);
              break;

            case "pong":
              // Heartbeat response received
              break;

            default:
              console.warn(`[WebSocket] Unknown message type: ${message.type}`);
          }
        } catch (error) {
          console.error("[WebSocket] Error parsing message:", error);
        }
      };

      ws.onerror = (error: Event) => {
        console.error("[WebSocket] Error:", error);
      };

      ws.onclose = () => {
        console.log("[WebSocket] Disconnected");
        wsRef.current = null;
        setIsConnected(false);

        // Attempt to reconnect
        reconnectTimeoutRef.current = setTimeout(() => {
          connect();
        }, 3000); // Reconnect after 3 seconds
      };
    } catch (error) {
      console.error("[WebSocket] Connection error:", error);
      setIsReconnecting(false);
    }
  }, [user]);

  /**
   * Disconnect from WebSocket
   */
  const disconnect = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }

    if (heartbeatTimeoutRef.current) {
      clearTimeout(heartbeatTimeoutRef.current);
    }

    setIsConnected(false);
  }, []);

  /**
   * Subscribe to a channel
   */
  const subscribe = useCallback((channel: string) => {
    const message: WebSocketMessage = {
      type: "subscribe",
      payload: { channel },
      timestamp: Date.now(),
    };

    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    } else {
      messageQueueRef.current.push(message);
    }

    setSubscriptions((prev) => new Set([...prev, channel]));
  }, []);

  /**
   * Unsubscribe from a channel
   */
  const unsubscribe = useCallback((channel: string) => {
    const message: WebSocketMessage = {
      type: "unsubscribe",
      payload: { channel },
      timestamp: Date.now(),
    };

    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    }

    setSubscriptions((prev) => {
      const updated = new Set(prev);
      updated.delete(channel);
      return updated;
    });
  }, []);

  /**
   * Send custom message
   */
  const sendMessage = useCallback((message: WebSocketMessage) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    } else {
      messageQueueRef.current.push(message);
    }
  }, []);

  /**
   * Start heartbeat
   */
  const startHeartbeat = useCallback(() => {
    if (heartbeatTimeoutRef.current) {
      clearTimeout(heartbeatTimeoutRef.current);
    }

    heartbeatTimeoutRef.current = setInterval(() => {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(
          JSON.stringify({
            type: "ping",
            timestamp: Date.now(),
          })
        );
      }
    }, 30 * 1000); // Send ping every 30 seconds

    if (heartbeatTimeoutRef.current.unref) {
      heartbeatTimeoutRef.current.unref();
    }
  }, []);

  /**
   * Clear alerts
   */
  const clearAlerts = useCallback(() => {
    setAlerts([]);
  }, []);

  /**
   * Remove specific alert
   */
  const removeAlert = useCallback((alertId: string) => {
    setAlerts((prev) => prev.filter((alert) => alert.id !== alertId));
  }, []);

  /**
   * Get trip update
   */
  const getTripUpdate = useCallback(
    (tripId: string): TripUpdate | undefined => {
      return tripUpdates.get(tripId);
    },
    [tripUpdates]
  );

  /**
   * Get vehicle status
   */
  const getVehicleStatus = useCallback(
    (vehicleId: string): VehicleStatus | undefined => {
      return vehicleStatuses.get(vehicleId);
    },
    [vehicleStatuses]
  );

  /**
   * Get driver status
   */
  const getDriverStatus = useCallback(
    (driverId: string): DriverStatus | undefined => {
      return driverStatuses.get(driverId);
    },
    [driverStatuses]
  );

  /**
   * Initialize connection on mount
   */
  useEffect(() => {
    if (user) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [user, connect, disconnect]);

  return {
    // Connection state
    isConnected,
    isReconnecting,
    lastMessageTime,

    // Subscription management
    subscribe,
    unsubscribe,
    subscriptions: Array.from(subscriptions),

    // Message sending
    sendMessage,

    // Real-time data
    tripUpdates: Object.fromEntries(tripUpdates),
    vehicleStatuses: Object.fromEntries(vehicleStatuses),
    driverStatuses: Object.fromEntries(driverStatuses),
    fleetOverview,
    alerts,

    // Data accessors
    getTripUpdate,
    getVehicleStatus,
    getDriverStatus,

    // Alert management
    clearAlerts,
    removeAlert,

    // Connection control
    connect,
    disconnect,
  };
}

// ============================================================================
// SPECIALIZED HOOKS
// ============================================================================

/**
 * Hook for live trip tracking
 */
export function useLiveTripTracking(tripId: string) {
  const { subscribe, unsubscribe, getTripUpdate } = useFleetWebSocket();

  useEffect(() => {
    subscribe(`trip:${tripId}`);
    return () => {
      unsubscribe(`trip:${tripId}`);
    };
  }, [tripId, subscribe, unsubscribe]);

  return getTripUpdate(tripId);
}

/**
 * Hook for vehicle status tracking
 */
export function useVehicleStatusTracking(vehicleId: string) {
  const { subscribe, unsubscribe, getVehicleStatus } = useFleetWebSocket();

  useEffect(() => {
    subscribe(`vehicle:${vehicleId}`);
    return () => {
      unsubscribe(`vehicle:${vehicleId}`);
    };
  }, [vehicleId, subscribe, unsubscribe]);

  return getVehicleStatus(vehicleId);
}

/**
 * Hook for driver status tracking
 */
export function useDriverStatusTracking(driverId: string) {
  const { subscribe, unsubscribe, getDriverStatus } = useFleetWebSocket();

  useEffect(() => {
    subscribe(`driver:${driverId}`);
    return () => {
      unsubscribe(`driver:${driverId}`);
    };
  }, [driverId, subscribe, unsubscribe]);

  return getDriverStatus(driverId);
}

/**
 * Hook for fleet overview tracking
 */
export function useFleetOverviewTracking() {
  const { subscribe, unsubscribe, fleetOverview } = useFleetWebSocket();

  useEffect(() => {
    subscribe("fleet:overview");
    return () => {
      unsubscribe("fleet:overview");
    };
  }, [subscribe, unsubscribe]);

  return fleetOverview;
}

/**
 * Hook for alert notifications
 */
export function useFleetAlerts() {
  const { subscribe, unsubscribe, alerts, removeAlert, clearAlerts } = useFleetWebSocket();

  useEffect(() => {
    subscribe("alerts");
    return () => {
      unsubscribe("alerts");
    };
  }, [subscribe, unsubscribe]);

  return {
    alerts,
    removeAlert,
    clearAlerts,
  };
}
