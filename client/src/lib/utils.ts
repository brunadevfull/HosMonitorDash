import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatBytes(bytes: number, decimals: number = 2): string {
  if (bytes === 0) return "0 Bytes";

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
}

export function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (days > 0) {
    return `${days}d ${hours}h ${minutes}m`;
  } else if (hours > 0) {
    return `${hours}h ${minutes}m`;
  } else {
    return `${minutes}m`;
  }
}

export function getServerStatusColor(isOnline: boolean, cpuUsage?: string, memoryUsage?: string, diskUsage?: string): string {
  if (!isOnline) return "bg-gray-500";
  
  const cpu = parseFloat(cpuUsage || "0");
  const memory = parseFloat(memoryUsage || "0");
  const disk = parseFloat(diskUsage || "0");
  
  if (cpu > 80 || memory > 90 || disk > 85) return "bg-red-500";
  if (cpu > 60 || memory > 70 || disk > 70) return "bg-orange-500";
  return "bg-green-500";
}

export function getEnvironmentColor(environment: string): string {
  switch (environment) {
    case "production":
      return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
    case "staging":
      return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
    case "development":
      return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
    default:
      return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200";
  }
}

export function getServerTypeColor(serverType: string): string {
  switch (serverType) {
    case "web":
      return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
    case "database":
      return "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200";
    case "hybrid":
      return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
    case "mail":
      return "bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200";
    case "backup":
      return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200";
    default:
      return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200";
  }
}

export function getSeverityColor(severity: string): "default" | "secondary" | "destructive" | "outline" {
  switch (severity) {
    case "critical":
      return "destructive";
    case "warning":
      return "secondary";
    case "info":
      return "outline";
    default:
      return "default";
  }
}

export function getProgressColor(value: number, type: "cpu" | "memory" | "disk"): string {
  const thresholds = {
    cpu: { warning: 60, critical: 80 },
    memory: { warning: 70, critical: 90 },
    disk: { warning: 70, critical: 85 },
  };

  const threshold = thresholds[type];
  
  if (value >= threshold.critical) return "bg-red-500";
  if (value >= threshold.warning) return "bg-orange-500";
  if (value >= 50) return "bg-yellow-500";
  return "bg-green-500";
}

export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;
  
  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;
  
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}
