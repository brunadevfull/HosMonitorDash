import { useQuery } from "@tanstack/react-query";
import {
  type ContainerStack,
  type ServiceProcess,
  type BackupJob,
  type LogExportTask,
  type TelemetryEvent,
} from "@shared/schema";

export function useContainerStacks() {
  return useQuery<ContainerStack[]>({
    queryKey: ["/api/container-stacks"],
    refetchInterval: 30000,
    staleTime: 15000,
  });
}

export function useServiceProcesses() {
  return useQuery<ServiceProcess[]>({
    queryKey: ["/api/services"],
    refetchInterval: 30000,
    staleTime: 15000,
  });
}

export function useBackupJobs() {
  return useQuery<BackupJob[]>({
    queryKey: ["/api/maintenance/backups"],
    refetchInterval: 60000,
    staleTime: 30000,
  });
}

export function useLogExportTasks() {
  return useQuery<LogExportTask[]>({
    queryKey: ["/api/maintenance/log-exports"],
    refetchInterval: 60000,
    staleTime: 30000,
  });
}

export function useTelemetryEvents(limit: number = 50) {
  return useQuery<TelemetryEvent[]>({
    queryKey: [`/api/telemetry/events?limit=${limit}`],
    refetchInterval: 15000,
    staleTime: 5000,
  });
}
