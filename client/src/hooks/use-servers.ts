import { useQuery } from "@tanstack/react-query";
import { ServerWithMetrics } from "@shared/schema";
import { useWebSocket } from "./use-websocket";

interface UseServersReturn {
  servers: ServerWithMetrics[] | undefined;
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
}

export function useServers(): UseServersReturn {
  const { servers: wsServers, isConnected } = useWebSocket();

  const {
    data: queryServers,
    isLoading,
    error,
    refetch,
  } = useQuery<ServerWithMetrics[]>({
    queryKey: ["/api/servers"],
    refetchInterval: isConnected ? false : 30000, // Only poll if WebSocket is not connected
    staleTime: isConnected ? Infinity : 30000,
  });

  // Use WebSocket data if available, otherwise fall back to query data
  const servers = wsServers || queryServers;

  return {
    servers,
    isLoading: isLoading && !servers,
    error,
    refetch,
  };
}
