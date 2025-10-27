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
  type ContainerService,
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
import { DockerEngine, type DockerContainerSummary } from "./docker-engine";

export class DatabaseStorage implements IStorage {
  private readonly dockerEngine = new DockerEngine();
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
    const stacks = await this.loadDockerStacks();
    return stacks.sort((a, b) => a.name.localeCompare(b.name));
  }

  async performContainerAction(id: string, action: ContainerActionInput): Promise<ContainerStack | undefined> {
    if (!this.dockerEngine.isAvailable) {
      throw new Error("Docker engine is not accessible from this environment");
    }

    const containers = await this.dockerEngine.listContainers();
    const stackContainers = containers.filter(container => this.resolveStackId(container) === id);
    if (stackContainers.length === 0) {
      return undefined;
    }

    const targetContainers = this.filterContainersByService(stackContainers, action.services);
    if (targetContainers.length === 0) {
      return undefined;
    }

    for (const container of targetContainers) {
      try {
        await this.applyContainerAction(container, action.action);
      } catch (error) {
        throw new Error(
          `Failed to execute ${action.action} for container ${container.Names?.[0] ?? container.Id}: ${(error as Error).message}`,
        );
      }
    }

    const updatedStacks = await this.loadDockerStacks();
    const stack = updatedStacks.find(entry => entry.id === id);
    if (!stack) {
      return undefined;
    }

    const affectedCount = targetContainers.length;
    const lastAction = this.describeContainerAction(action.action, affectedCount);
    const result: ContainerStack = {
      ...stack,
      updatedAt: new Date(),
      lastAction,
    };

    await this.recordTelemetryEvent({
      serverId: result.primaryServerId ?? result.id,
      metric: `container.${action.action}`,
      value: affectedCount,
      unit: "containers",
      status: action.action === "down" ? "warning" : "ok",
      message: `${result.name}: ${lastAction}`,
    });

    return result;
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

  private async loadDockerStacks(): Promise<ContainerStack[]> {
    if (!this.dockerEngine.isAvailable) {
      return [];
    }

    const containers = await this.dockerEngine.listContainers();
    if (!containers.length) {
      return [];
    }

    const grouped = new Map<string, DockerContainerSummary[]>();
    for (const container of containers) {
      const stackId = this.resolveStackId(container);
      if (!grouped.has(stackId)) {
        grouped.set(stackId, []);
      }
      grouped.get(stackId)!.push(container);
    }

    return Array.from(grouped.entries()).map(([stackId, entries]) =>
      this.buildStackFromContainers(stackId, entries),
    );
  }

  private resolveStackId(container: DockerContainerSummary): string {
    const project = container.Labels?.["com.docker.compose.project"];
    if (project) {
      return project;
    }
    const name = container.Names?.[0]?.replace(/^\//, "");
    return name ?? container.Id.slice(0, 12);
  }

  private resolveServiceName(container: DockerContainerSummary): string {
    const composeService = container.Labels?.["com.docker.compose.service"];
    if (composeService) {
      return composeService;
    }
    const name = container.Names?.[0]?.replace(/^\//, "");
    return name ?? container.Id.slice(0, 12);
  }

  private filterContainersByService(
    containers: DockerContainerSummary[],
    services?: string[],
  ): DockerContainerSummary[] {
    if (!services || services.length === 0) {
      return containers;
    }

    const normalized = new Set(services.map(service => service.toLowerCase()));
    return containers.filter(container =>
      normalized.has(this.resolveServiceName(container).toLowerCase()),
    );
  }

  private async applyContainerAction(
    container: DockerContainerSummary,
    action: ContainerActionInput["action"],
  ): Promise<void> {
    switch (action) {
      case "up":
        await this.dockerEngine.startContainer(container.Id);
        break;
      case "down":
        await this.dockerEngine.stopContainer(container.Id);
        break;
      case "restart":
        await this.dockerEngine.restartContainer(container.Id);
        break;
      case "pull":
        await this.dockerEngine.pullImage(container.Image);
        break;
      default:
        throw new Error(`Unsupported container action: ${action}`);
    }
  }

  private describeContainerAction(
    action: ContainerActionInput["action"],
    count: number,
  ): string {
    const suffix = count === 1 ? "container" : "containers";
    switch (action) {
      case "up":
        return `Iniciado ${count} ${suffix}`;
      case "down":
        return `Interrompido ${count} ${suffix}`;
      case "restart":
        return `Reiniciado ${count} ${suffix}`;
      case "pull":
        return `Imagem atualizada para ${count} ${suffix}`;
      default:
        return `${action} executado em ${count} ${suffix}`;
    }
  }

  private buildStackFromContainers(
    stackId: string,
    containers: DockerContainerSummary[],
  ): ContainerStack {
    const primary = containers[0];
    const projectName = primary.Labels?.["com.docker.compose.project"] ?? stackId;
    const displayName = this.formatDisplayName(projectName);
    const servicesByName = new Map<
      string,
      {
        image: string;
        replicas: number;
        states: ContainerService["state"][];
        ports: Set<string>;
        events: string[];
      }
    >();

    for (const container of containers) {
      const serviceName = this.resolveServiceName(container);
      const entry = servicesByName.get(serviceName) ?? {
        image: container.Image,
        replicas: 0,
        states: [],
        ports: new Set<string>(),
        events: [],
      };

      entry.replicas += 1;
      entry.image = container.Image;
      entry.states.push(this.mapContainerState(container.State));
      entry.events.push(container.Status ?? "");

      for (const port of container.Ports ?? []) {
        if (!port.PrivatePort) continue;
        const publicPort = port.PublicPort ? `${port.PublicPort}:` : "";
        entry.ports.add(`${publicPort}${port.PrivatePort}/${port.Type}`);
      }

      servicesByName.set(serviceName, entry);
    }

    const services: ContainerService[] = Array.from(servicesByName.entries())
      .map(([name, data]) => ({
        name,
        image: data.image,
        replicas: data.replicas,
        state: this.aggregateServiceState(data.states),
        ports: Array.from(data.ports).sort(),
        lastEvent: data.events.find(event => event.length > 0) ?? "",
      }))
      .sort((a, b) => a.name.localeCompare(b.name));

    return {
      id: stackId,
      name: displayName,
      projectName,
      path: this.resolveStackPath(primary),
      status: this.aggregateStackStatus(services),
      updatedAt: new Date(),
      services,
      lastAction: primary.Status ?? undefined,
    };
  }

  private mapContainerState(state?: string): ContainerService["state"] {
    switch (state) {
      case "running":
        return "running";
      case "restarting":
        return "restarting";
      case "paused":
      case "created":
      case "exited":
        return "stopped";
      case "dead":
      case "removing":
        return "error";
      default:
        return "error";
    }
  }

  private aggregateServiceState(states: ContainerService["state"][]): ContainerService["state"] {
    if (states.every(state => state === "running")) {
      return "running";
    }
    if (states.every(state => state === "stopped")) {
      return "stopped";
    }
    if (states.includes("restarting")) {
      return "restarting";
    }
    return "error";
  }

  private aggregateStackStatus(services: ContainerService[]): ContainerStack["status"] {
    if (services.length === 0) {
      return "stopped";
    }
    if (services.every(service => service.state === "running")) {
      return "running";
    }
    if (services.every(service => service.state === "stopped")) {
      return "stopped";
    }
    return "degraded";
  }

  private resolveStackPath(container: DockerContainerSummary): string {
    const configFiles = container.Labels?.["com.docker.compose.project.config_files"];
    if (configFiles) {
      return configFiles.split(",")[0];
    }
    const workingDir = container.Labels?.["com.docker.compose.project.working_dir"];
    if (workingDir) {
      return workingDir;
    }
    return container.Names?.[0]?.replace(/^\//, "") ?? container.Id.slice(0, 12);
  }

  private formatDisplayName(value: string): string {
    return value
      .replace(/[-_]+/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .replace(/\b\w/g, char => char.toUpperCase());
  }
}