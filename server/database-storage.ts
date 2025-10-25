import {
  servers,
  serverMetrics,
  alerts,
  sshSessions,
  serverLogs,
  logMonitoringConfig,
  type Server,
  type InsertServer,
  type ServerMetrics,
  type InsertMetrics,
  type Alert,
  type InsertAlert,
  type SshSession,
  type InsertSshSession,
  type ServerLog,
  type InsertServerLog,
  type LogMonitoringConfig,
  type InsertLogMonitoringConfig,
  type ServerWithMetrics,
  type PublicServer,
  type PublicServerWithMetrics,
  type ContainerStack,
  type ContainerActionInput,
  type ServiceProcess,
  type ServiceActionInput,
  type BackupJob,
  type CreateBackupInput,
  type LogExportTask,
  type CreateLogExportInput,
  type TelemetryEvent,
  type RecordTelemetryInput,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc } from "drizzle-orm";
import { IStorage } from "./storage";
import { randomUUID } from "crypto";

export class DatabaseStorage implements IStorage {
  private containerStacks = new Map<string, ContainerStack>();
  private serviceProcesses = new Map<string, ServiceProcess>();
  private backupJobs: BackupJob[] = [];
  private logExportTasks: LogExportTask[] = [];
  private telemetryEvents: TelemetryEvent[] = [];
  private telemetryLimit = 200;

  constructor() {
    this.initializeOperationalData();
  }

  // Utility function to sanitize server data by removing sensitive SSH credentials
  private sanitizeServer(server: Server): PublicServer {
    const { sshPassword, sshPrivateKey, ...publicServer } = server;
    return publicServer;
  }

  private initializeOperationalData() {
    const now = new Date();

    this.containerStacks.set("stack-papem", {
      id: "stack-papem",
      name: "PAPEM Core",
      projectName: "papem-core",
      path: "/opt/papem/docker-compose.yml",
      status: "running",
      updatedAt: new Date(now.getTime() - 5 * 60 * 1000),
      lastAction: "Stack iniciado automaticamente",
      primaryServerId: "server-1",
      services: [
        {
          name: "api",
          image: "papem/api:latest",
          replicas: 2,
          state: "running",
          ports: ["8080:8080", "8443:8443"],
          lastEvent: "Deploy aplicado há 10 minutos",
        },
        {
          name: "worker",
          image: "papem/worker:latest",
          replicas: 1,
          state: "running",
          ports: [],
          lastEvent: "Fila processada às 08:45",
        },
        {
          name: "proxy",
          image: "nginx:1.25",
          replicas: 1,
          state: "running",
          ports: ["80:80", "443:443"],
          lastEvent: "Reload executado às 08:40",
        },
      ],
    });

    this.containerStacks.set("stack-analytics", {
      id: "stack-analytics",
      name: "Analytics",
      projectName: "papem-analytics",
      path: "/srv/analytics/docker-compose.yml",
      status: "degraded",
      updatedAt: new Date(now.getTime() - 15 * 60 * 1000),
      lastAction: "Serviço collector com falha",
      primaryServerId: "server-3",
      services: [
        {
          name: "collector",
          image: "papem/collector:2.1",
          replicas: 3,
          state: "error",
          ports: ["9000:9000"],
          lastEvent: "Reinício falhou às 08:20",
        },
        {
          name: "processor",
          image: "papem/processor:2.1",
          replicas: 2,
          state: "running",
          ports: [],
          lastEvent: "Processando lote desde 08:15",
        },
        {
          name: "ui",
          image: "papem/analytics-ui:1.8",
          replicas: 1,
          state: "running",
          ports: ["5173:80"],
          lastEvent: "Último deploy às 07:50",
        },
      ],
    });

    this.containerStacks.set("stack-monitoring", {
      id: "stack-monitoring",
      name: "Monitoring",
      projectName: "papem-monitoring",
      path: "/opt/monitoring/docker-compose.yml",
      status: "stopped",
      updatedAt: new Date(now.getTime() - 2 * 60 * 60 * 1000),
      lastAction: "Stack pausado para manutenção",
      primaryServerId: "server-4",
      services: [
        {
          name: "prometheus",
          image: "prom/prometheus:v2.53",
          replicas: 1,
          state: "stopped",
          ports: ["9090:9090"],
          lastEvent: "Serviço interrompido às 06:00",
        },
        {
          name: "grafana",
          image: "grafana/grafana:10.2",
          replicas: 1,
          state: "stopped",
          ports: ["3000:3000"],
          lastEvent: "Pausa agendada às 06:00",
        },
      ],
    });

    this.serviceProcesses.set("svc-nginx", {
      id: "svc-nginx",
      name: "nginx.service",
      description: "Proxy reverso frontal do PAPEM",
      manager: "systemd",
      status: "active",
      uptime: "3d 4h",
      serverId: "server-1",
      lastRestart: new Date(now.getTime() - 3 * 60 * 60 * 1000),
      dependencies: ["network-online.target"],
    });

    this.serviceProcesses.set("svc-queue", {
      id: "svc-queue",
      name: "papem-queue",
      description: "Workers de fila em Docker",
      manager: "docker",
      status: "active",
      uptime: "18h 12m",
      serverId: "server-3",
      lastRestart: new Date(now.getTime() - 18 * 60 * 60 * 1000),
      dependencies: ["redis", "postgres"],
    });

    this.serviceProcesses.set("svc-cron", {
      id: "svc-cron",
      name: "papem-cron",
      description: "Rotinas agendadas do PAPEM",
      manager: "systemd",
      status: "inactive",
      uptime: "0m",
      serverId: "server-2",
      lastRestart: new Date(now.getTime() - 26 * 60 * 60 * 1000),
      dependencies: ["postgresql"],
    });

    this.serviceProcesses.set("svc-report", {
      id: "svc-report",
      name: "relatorios.service",
      description: "Geração de relatórios financeiros",
      manager: "systemd",
      status: "failed",
      uptime: "0m",
      serverId: "server-5",
      lastRestart: new Date(now.getTime() - 45 * 60 * 1000),
      dependencies: ["papem-core"],
    });

    this.backupJobs = [
      {
        id: "backup-1",
        type: "postgres",
        target: "postgresql://papem/producao",
        status: "completed",
        size: "2.3 GB",
        retention: "7d",
        initiatedBy: "cron",
        createdAt: new Date(now.getTime() - 12 * 60 * 60 * 1000),
        completedAt: new Date(now.getTime() - 12 * 60 * 60 * 1000 + 5 * 60 * 1000),
      },
      {
        id: "backup-2",
        type: "filesystem",
        target: "/data/uploads",
        status: "completed",
        size: "14.8 GB",
        retention: "14d",
        initiatedBy: "dashboard",
        createdAt: new Date(now.getTime() - 2 * 60 * 60 * 1000),
        completedAt: new Date(now.getTime() - 2 * 60 * 60 * 1000 + 12 * 60 * 1000),
      },
    ];

    this.logExportTasks = [
      {
        id: "log-export-1",
        serverId: "server-1",
        logType: "nginx-access",
        status: "completed",
        startedAt: new Date(now.getTime() - 40 * 60 * 1000),
        completedAt: new Date(now.getTime() - 38 * 60 * 1000),
        downloadUrl: "https://monitor.papem/logs/log-export-1.tar.gz",
      },
      {
        id: "log-export-2",
        serverId: "server-3",
        logType: "application-error",
        status: "completed",
        startedAt: new Date(now.getTime() - 90 * 60 * 1000),
        completedAt: new Date(now.getTime() - 88 * 60 * 1000),
        downloadUrl: "https://monitor.papem/logs/log-export-2.tar.gz",
      },
    ];

    this.telemetryEvents = [
      {
        id: randomUUID(),
        serverId: "server-3",
        metric: "service.failure",
        value: 1,
        unit: "ocorrência",
        status: "critical",
        message: "collector apresentou falha ao iniciar",
        recordedAt: new Date(now.getTime() - 5 * 60 * 1000),
      },
      {
        id: randomUUID(),
        serverId: "server-1",
        metric: "cpu.usage",
        value: 72,
        unit: "%",
        status: "warning",
        message: "CPU do API acima de 70%",
        recordedAt: new Date(now.getTime() - 12 * 60 * 1000),
      },
      {
        id: randomUUID(),
        serverId: "server-2",
        metric: "backup.duration",
        value: 5,
        unit: "min",
        status: "ok",
        message: "Backup do Postgres finalizado",
        recordedAt: new Date(now.getTime() - 2 * 60 * 60 * 1000),
      },
      {
        id: randomUUID(),
        serverId: "server-4",
        metric: "stack.state",
        value: 0,
        unit: "serviços",
        status: "warning",
        message: "Stack de monitoring permanece pausado",
        recordedAt: new Date(now.getTime() - 3 * 60 * 60 * 1000),
      },
      {
        id: randomUUID(),
        serverId: "server-6",
        metric: "mail.queue",
        value: 24,
        unit: "mensagens",
        status: "ok",
        message: "Fila de emails normalizada",
        recordedAt: new Date(now.getTime() - 6 * 60 * 60 * 1000),
      },
    ];
  }

  // Server operations
  async getServers(): Promise<Server[]> {
    return await db.select().from(servers);
  }

  async getPublicServers(): Promise<PublicServer[]> {
    const allServers = await this.getServers();
    return allServers.map(server => this.sanitizeServer(server));
  }

  async getServer(id: string): Promise<Server | undefined> {
    const [server] = await db.select().from(servers).where(eq(servers.id, id));
    return server || undefined;
  }

  async getPublicServer(id: string): Promise<PublicServer | undefined> {
    const server = await this.getServer(id);
    return server ? this.sanitizeServer(server) : undefined;
  }

  async getServersByEnvironment(environment: string): Promise<Server[]> {
    return await db.select().from(servers).where(eq(servers.environment, environment));
  }

  async createServer(insertServer: InsertServer): Promise<Server> {
    const [server] = await db
      .insert(servers)
      .values({
        ...insertServer,
        sshPort: insertServer.sshPort ?? 22,
        environment: insertServer.environment ?? "production",
        serverType: insertServer.serverType ?? "web",
        isActive: insertServer.isActive ?? true,
        description: insertServer.description || null,
        sshUsername: insertServer.sshUsername || null,
        sshPassword: insertServer.sshPassword || null,
        sshPrivateKey: insertServer.sshPrivateKey || null,
        tags: insertServer.tags || [],
      })
      .returning();
    return server;
  }

  async updateServer(id: string, updateData: Partial<InsertServer>): Promise<Server | undefined> {
    const [updated] = await db
      .update(servers)
      .set(updateData)
      .where(eq(servers.id, id))
      .returning();
    return updated || undefined;
  }

  async deleteServer(id: string): Promise<boolean> {
    const result = await db.delete(servers).where(eq(servers.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  // Metrics operations
  async getServerMetrics(serverId: string): Promise<ServerMetrics[]> {
    return await db
      .select()
      .from(serverMetrics)
      .where(eq(serverMetrics.serverId, serverId))
      .orderBy(desc(serverMetrics.timestamp));
  }

  async getLatestServerMetrics(serverId: string): Promise<ServerMetrics | undefined> {
    const [metrics] = await db
      .select()
      .from(serverMetrics)
      .where(eq(serverMetrics.serverId, serverId))
      .orderBy(desc(serverMetrics.timestamp))
      .limit(1);
    return metrics || undefined;
  }

  async createMetrics(insertMetrics: InsertMetrics): Promise<ServerMetrics> {
    const [metrics] = await db
      .insert(serverMetrics)
      .values({
        ...insertMetrics,
        isOnline: insertMetrics.isOnline ?? false,
        cpuUsage: insertMetrics.cpuUsage || null,
        memoryUsage: insertMetrics.memoryUsage || null,
        diskUsage: insertMetrics.diskUsage || null,
        networkIn: insertMetrics.networkIn || null,
        networkOut: insertMetrics.networkOut || null,
        uptime: insertMetrics.uptime || null,
      })
      .returning();
    return metrics;
  }

  async getServersWithLatestMetrics(): Promise<ServerWithMetrics[]> {
    const allServers = await this.getServers();
    const serversWithMetrics: ServerWithMetrics[] = [];

    for (const server of allServers) {
      const metrics = await this.getLatestServerMetrics(server.id);
      const alertsData = await this.getServerAlerts(server.id);
      serversWithMetrics.push({
        ...server,
        metrics,
        alerts: alertsData,
      });
    }

    return serversWithMetrics;
  }

  async getPublicServersWithLatestMetrics(): Promise<PublicServerWithMetrics[]> {
    const allServers = await this.getPublicServers();
    const serversWithMetrics: PublicServerWithMetrics[] = [];

    for (const server of allServers) {
      const metrics = await this.getLatestServerMetrics(server.id);
      const alertsData = await this.getServerAlerts(server.id);
      serversWithMetrics.push({
        ...server,
        metrics,
        alerts: alertsData,
      });
    }

    return serversWithMetrics;
  }

  // Alert operations
  async getAlerts(): Promise<Alert[]> {
    return await db.select().from(alerts).orderBy(desc(alerts.createdAt));
  }

  async getServerAlerts(serverId: string): Promise<Alert[]> {
    return await db
      .select()
      .from(alerts)
      .where(eq(alerts.serverId, serverId))
      .orderBy(desc(alerts.createdAt));
  }

  async getActiveAlerts(): Promise<Alert[]> {
    return await db
      .select()
      .from(alerts)
      .where(eq(alerts.isResolved, false))
      .orderBy(desc(alerts.createdAt));
  }

  async createAlert(insertAlert: InsertAlert): Promise<Alert> {
    const [alert] = await db
      .insert(alerts)
      .values({
        ...insertAlert,
        isResolved: insertAlert.isResolved ?? false,
        threshold: insertAlert.threshold || null,
        currentValue: insertAlert.currentValue || null,
      })
      .returning();
    return alert;
  }

  async resolveAlert(id: string): Promise<Alert | undefined> {
    const [updated] = await db
      .update(alerts)
      .set({ 
        isResolved: true, 
        resolvedAt: new Date() 
      })
      .where(eq(alerts.id, id))
      .returning();
    return updated || undefined;
  }

  // SSH Session operations
  async getSshSessions(): Promise<SshSession[]> {
    return await db.select().from(sshSessions).orderBy(desc(sshSessions.startedAt));
  }

  async getActiveSshSessions(): Promise<SshSession[]> {
    return await db
      .select()
      .from(sshSessions)
      .where(eq(sshSessions.isActive, true))
      .orderBy(desc(sshSessions.startedAt));
  }

  async createSshSession(insertSession: InsertSshSession): Promise<SshSession> {
    const [session] = await db
      .insert(sshSessions)
      .values({
        ...insertSession,
        isActive: insertSession.isActive ?? true,
      })
      .returning();
    return session;
  }

  async endSshSession(id: string): Promise<SshSession | undefined> {
    const [updated] = await db
      .update(sshSessions)
      .set({
        isActive: false,
        endedAt: new Date()
      })
      .where(eq(sshSessions.id, id))
      .returning();
    return updated || undefined;
  }

  async getContainerStacks(): Promise<ContainerStack[]> {
    return Array.from(this.containerStacks.values()).sort(
      (a, b) => b.updatedAt.getTime() - a.updatedAt.getTime(),
    );
  }

  async performContainerAction(id: string, action: ContainerActionInput): Promise<ContainerStack | undefined> {
    const stack = this.containerStacks.get(id);
    if (!stack) return undefined;

    const now = new Date();
    const targetNames = action.services?.length
      ? new Set(action.services)
      : new Set(stack.services.map(service => service.name));
    let matchedServices = 0;

    const updatedServices = stack.services.map(service => {
      if (!targetNames.has(service.name)) {
        return service;
      }

      matchedServices += 1;
      let state = service.state;
      let lastEvent = service.lastEvent;

      switch (action.action) {
        case "up":
          state = "running";
          lastEvent = `Serviço iniciado às ${now.toLocaleTimeString()}`;
          break;
        case "down":
          state = "stopped";
          lastEvent = `Serviço interrompido às ${now.toLocaleTimeString()}`;
          break;
        case "restart":
          state = "running";
          lastEvent = `Serviço reiniciado às ${now.toLocaleTimeString()}`;
          break;
        case "pull":
          state = service.state;
          lastEvent = `Imagem atualizada às ${now.toLocaleTimeString()}`;
          break;
      }

      return {
        ...service,
        state,
        lastEvent,
      };
    });

    const affectedCount = matchedServices || action.services?.length || stack.services.length;

    let status: ContainerStack["status"] = stack.status;
    let lastAction: string;
    switch (action.action) {
      case "up":
        status = "running";
        lastAction = `Stack iniciado (${affectedCount} serviço(s))`;
        break;
      case "down":
        status = "stopped";
        lastAction = `Stack interrompido (${affectedCount} serviço(s))`;
        break;
      case "restart":
        status = "running";
        lastAction = `Stack reiniciado (${affectedCount} serviço(s))`;
        break;
      case "pull":
        status = stack.status === "stopped" ? "stopped" : "running";
        lastAction = `Imagens atualizadas (${affectedCount} serviço(s))`;
        break;
      default:
        lastAction = "Ação executada";
        break;
    }

    const updatedStack: ContainerStack = {
      ...stack,
      status,
      services: updatedServices,
      updatedAt: now,
      lastAction,
    };

    this.containerStacks.set(id, updatedStack);

    await this.recordTelemetryEvent({
      serverId: stack.primaryServerId ?? id,
      metric: `container.${action.action}`,
      value: affectedCount,
      unit: "serviços",
      status: action.action === "down" ? "warning" : "ok",
      message: `${stack.name}: ${lastAction}`,
    });

    return updatedStack;
  }

  async getServiceProcesses(): Promise<ServiceProcess[]> {
    return Array.from(this.serviceProcesses.values());
  }

  async performServiceAction(id: string, action: ServiceActionInput): Promise<ServiceProcess | undefined> {
    const service = this.serviceProcesses.get(id);
    if (!service) return undefined;

    const now = new Date();
    let status: ServiceProcess["status"] = service.status;
    let uptime = service.uptime;
    let message: string;

    switch (action.action) {
      case "start":
        status = "active";
        uptime = "0m";
        message = "Serviço iniciado";
        break;
      case "stop":
        status = "inactive";
        uptime = "0m";
        message = "Serviço parado";
        break;
      case "restart":
        status = "active";
        uptime = "0m";
        message = "Serviço reiniciado";
        break;
      default:
        message = "Ação aplicada";
        break;
    }

    const updatedService: ServiceProcess = {
      ...service,
      status,
      uptime,
      lastRestart: now,
    };

    this.serviceProcesses.set(id, updatedService);

    await this.recordTelemetryEvent({
      serverId: service.serverId ?? id,
      metric: `service.${action.action}`,
      value: status === "active" ? 1 : 0,
      unit: "estado",
      status: action.action === "stop" ? "warning" : "ok",
      message: `${service.name}: ${message}`,
    });

    return updatedService;
  }

  async getBackupJobs(): Promise<BackupJob[]> {
    return [...this.backupJobs].sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
    );
  }

  async createBackupJob(input: CreateBackupInput): Promise<BackupJob> {
    const createdAt = new Date();
    const completedAt = new Date(createdAt.getTime() + 5 * 60 * 1000);
    const retention = input.retention ?? "7d";
    const initiatedBy = input.initiatedBy ?? "dashboard";
    const size = input.type === "postgres" ? "2.6 GB" : "12.4 GB";

    const job: BackupJob = {
      id: randomUUID(),
      type: input.type,
      target: input.target,
      status: "completed",
      size,
      retention,
      initiatedBy,
      createdAt,
      completedAt,
    };

    this.backupJobs = [job, ...this.backupJobs].slice(0, 25);

    await this.recordTelemetryEvent({
      serverId: job.type === "postgres" ? "server-2" : "server-4",
      metric: "backup.created",
      value: 1,
      unit: "backup",
      status: "ok",
      message: `Backup ${job.type} concluído para ${job.target}`,
    });

    return job;
  }

  async getLogExportTasks(): Promise<LogExportTask[]> {
    return [...this.logExportTasks].sort(
      (a, b) => b.startedAt.getTime() - a.startedAt.getTime(),
    );
  }

  async createLogExportTask(input: CreateLogExportInput): Promise<LogExportTask> {
    const startedAt = new Date();
    const completedAt = new Date(startedAt.getTime() + 2 * 60 * 1000);
    const id = randomUUID();

    const task: LogExportTask = {
      id,
      serverId: input.serverId,
      logType: input.logType,
      status: "completed",
      startedAt,
      completedAt,
      downloadUrl: `https://monitor.papem/logs/${id}.tar.gz`,
    };

    this.logExportTasks = [task, ...this.logExportTasks].slice(0, 25);

    await this.recordTelemetryEvent({
      serverId: input.serverId,
      metric: "logs.export",
      value: 1,
      unit: "exportação",
      status: "ok",
      message: `Exportação de logs (${input.logType}) concluída`,
    });

    return task;
  }

  async getTelemetryEvents(limit?: number): Promise<TelemetryEvent[]> {
    const effectiveLimit = limit ?? 50;
    return this.telemetryEvents.slice(0, effectiveLimit);
  }

  async recordTelemetryEvent(input: RecordTelemetryInput): Promise<TelemetryEvent> {
    const event: TelemetryEvent = {
      id: randomUUID(),
      serverId: input.serverId,
      metric: input.metric,
      value: input.value,
      unit: input.unit,
      status: input.status ?? "ok",
      message: input.message ?? `${input.metric} registrado`,
      recordedAt: new Date(),
    };

    this.telemetryEvents = [event, ...this.telemetryEvents].slice(0, this.telemetryLimit);
    return event;
  }

  // Log Monitoring operations
  async getServerLogs(serverId: string, limit: number = 100): Promise<ServerLog[]> {
    return await db
      .select()
      .from(serverLogs)
      .where(eq(serverLogs.serverId, serverId))
      .orderBy(desc(serverLogs.timestamp))
      .limit(limit);
  }

  async getServerLogsByLevel(serverId: string, logLevel: string): Promise<ServerLog[]> {
    return await db
      .select()
      .from(serverLogs)
      .where(and(
        eq(serverLogs.serverId, serverId),
        eq(serverLogs.logLevel, logLevel)
      ))
      .orderBy(desc(serverLogs.timestamp));
  }

  async createServerLog(insertLog: InsertServerLog): Promise<ServerLog> {
    const [log] = await db
      .insert(serverLogs)
      .values({
        ...insertLog,
        metadata: insertLog.metadata || {},
      })
      .returning();
    return log;
  }

  async getLogMonitoringConfigs(serverId?: string): Promise<LogMonitoringConfig[]> {
    if (serverId) {
      return await db
        .select()
        .from(logMonitoringConfig)
        .where(eq(logMonitoringConfig.serverId, serverId))
        .orderBy(desc(logMonitoringConfig.createdAt));
    } else {
      return await db
        .select()
        .from(logMonitoringConfig)
        .orderBy(desc(logMonitoringConfig.createdAt));
    }
  }

  async createLogMonitoringConfig(insertConfig: InsertLogMonitoringConfig): Promise<LogMonitoringConfig> {
    const [config] = await db
      .insert(logMonitoringConfig)
      .values({
        ...insertConfig,
        isEnabled: insertConfig.isEnabled ?? true,
        alertOnError: insertConfig.alertOnError ?? false,
      })
      .returning();
    return config;
  }

  async updateLogMonitoringConfig(id: string, updateData: Partial<InsertLogMonitoringConfig>): Promise<LogMonitoringConfig | undefined> {
    const [updated] = await db
      .update(logMonitoringConfig)
      .set(updateData)
      .where(eq(logMonitoringConfig.id, id))
      .returning();
    return updated || undefined;
  }

  async deleteLogMonitoringConfig(id: string): Promise<boolean> {
    const result = await db.delete(logMonitoringConfig).where(eq(logMonitoringConfig.id, id));
    return (result.rowCount ?? 0) > 0;
  }
}