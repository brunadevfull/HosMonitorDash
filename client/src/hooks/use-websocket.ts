import { useEffect, useRef, useCallback, useState } from "react";
import { ServerWithMetrics, Alert } from "@shared/schema";

interface WebSocketMessage {
  type: "connected" | "servers_update" | "alerts_update" | "logs_update";
  message?: string;
  data?: ServerWithMetrics[] | Alert[] | any[];
  serverId?: string;
}

interface UseWebSocketReturn {
  isConnected: boolean;
  lastMessage: WebSocketMessage | null;
  sendMessage: (message: any) => void;
  servers: ServerWithMetrics[] | null;
  alerts: Alert[] | null;
}

export function useWebSocket(): UseWebSocketReturn {
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null);
  const [servers, setServers] = useState<ServerWithMetrics[] | null>(null);
  const [alerts, setAlerts] = useState<Alert[] | null>(null);
  const ws = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;

  const resolveWebSocketUrl = () => {
    if (typeof window === "undefined") {
      return null;
    }

    const explicitUrl = import.meta.env.VITE_WS_URL as string | undefined;
    if (explicitUrl) {
      try {
        // Allow both full websocket urls and http(s) urls via configuration
        const provided = new URL(explicitUrl, window.location.href);
        if (provided.protocol.startsWith("http")) {
          provided.protocol = provided.protocol === "https:" ? "wss:" : "ws:";
        }
        if (!provided.pathname || provided.pathname === "/") {
          provided.pathname = "/ws";
        }
        provided.search = "";
        provided.hash = "";
        return provided.toString();
      } catch (error) {
        console.error("Invalid VITE_WS_URL provided:", explicitUrl, error);
      }
    }

    const httpBase = import.meta.env.VITE_API_URL as string | undefined;
    if (httpBase) {
      try {
        const apiUrl = new URL(httpBase, window.location.href);
        apiUrl.protocol = apiUrl.protocol === "https:" ? "wss:" : "ws:";
        apiUrl.pathname = "/ws";
        apiUrl.search = "";
        apiUrl.hash = "";
        return apiUrl.toString();
      } catch (error) {
        console.error("Invalid VITE_API_URL provided:", httpBase, error);
      }
    }

    const wsUrl = new URL(window.location.href);
    wsUrl.protocol = wsUrl.protocol === "https:" ? "wss:" : "ws:";
    wsUrl.pathname = "/ws";
    wsUrl.search = "";
    wsUrl.hash = "";
    return wsUrl.toString();
  };

  const connect = useCallback(() => {
    try {
      const wsUrl = resolveWebSocketUrl();

      if (!wsUrl) {
        console.error("Unable to resolve WebSocket URL");
        return;
      }

      ws.current = new WebSocket(wsUrl);

      ws.current.onopen = () => {
        console.log("WebSocket connected");
        setIsConnected(true);
        reconnectAttempts.current = 0;
        
        // Subscribe to server updates
        sendMessage({ type: "subscribe_servers" });
        sendMessage({ type: "subscribe_alerts" });
      };

      ws.current.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          setLastMessage(message);

          switch (message.type) {
            case "servers_update":
              if (message.data && Array.isArray(message.data)) {
                setServers(message.data as ServerWithMetrics[]);
              }
              break;
            case "alerts_update":
              if (message.data && Array.isArray(message.data)) {
                setAlerts(message.data as Alert[]);
              }
              break;
          }
        } catch (error) {
          console.error("Failed to parse WebSocket message:", error);
        }
      };

      ws.current.onclose = (event) => {
        console.log("WebSocket disconnected:", event.code, event.reason);
        setIsConnected(false);
        
        // Attempt to reconnect if it wasn't a manual close
        if (event.code !== 1000 && reconnectAttempts.current < maxReconnectAttempts) {
          const timeout = Math.pow(2, reconnectAttempts.current) * 1000; // Exponential backoff
          reconnectTimeoutRef.current = setTimeout(() => {
            console.log(`Attempting to reconnect... (${reconnectAttempts.current + 1}/${maxReconnectAttempts})`);
            reconnectAttempts.current++;
            connect();
          }, timeout);
        }
      };

      ws.current.onerror = (error) => {
        console.error("WebSocket error:", error);
      };

    } catch (error) {
      console.error("Failed to create WebSocket connection:", error);
    }
  }, []);

  const sendMessage = useCallback((message: any) => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify(message));
    }
  }, []);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    if (ws.current) {
      ws.current.close(1000, "Manual disconnect");
      ws.current = null;
    }
  }, []);

  useEffect(() => {
    connect();

    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  return {
    isConnected,
    lastMessage,
    sendMessage,
    servers,
    alerts,
  };
}
