import {
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
import { randomUUID } from "crypto";
import { DatabaseStorage } from "./database-storage";
import { DockerUnavailableError, listDockerStacks, performDockerStackAction } from "./docker";

export interface IStorage {
  // Server operations
  getServers(): Promise<Server[]>;
  getPublicServers(): Promise<PublicServer[]>;
  getServer(id: string): Promise<Server | undefined>;
  getPublicServer(id: string): Promise<PublicServer | undefined>;
  getServersByEnvironment(environment: string): Promise<Server[]>;
  createServer(server: InsertServer): Promise<Server>;
  updateServer(id: string, server: Partial<InsertServer>): Promise<Server | undefined>;
  deleteServer(id: string): Promise<boolean>;
  
  // Metrics operations
  getServerMetrics(serverId: string): Promise<ServerMetrics[]>;
  getLatestServerMetrics(serverId: string): Promise<ServerMetrics | undefined>;
  createMetrics(metrics: InsertMetrics): Promise<ServerMetrics>;
  getServersWithLatestMetrics(): Promise<ServerWithMetrics[]>;
  getPublicServersWithLatestMetrics(): Promise<PublicServerWithMetrics[]>;
  
  // Alert operations
  getAlerts(): Promise<Alert[]>;
  getServerAlerts(serverId: string): Promise<Alert[]>;
  getActiveAlerts(): Promise<Alert[]>;
  createAlert(alert: InsertAlert): Promise<Alert>;
  resolveAlert(id: string): Promise<Alert | undefined>;
  
  // SSH Session operations
  getSshSessions(): Promise<SshSession[]>;
  getActiveSshSessions(): Promise<SshSession[]>;
  createSshSession(session: InsertSshSession): Promise<SshSession>;
  endSshSession(id: string): Promise<SshSession | undefined>;
  
  // Log Monitoring operations
  getServerLogs(serverId: string, limit?: number): Promise<ServerLog[]>;
  getServerLogsByLevel(serverId: string, logLevel: string): Promise<ServerLog[]>;
  createServerLog(log: InsertServerLog): Promise<ServerLog>;
  getLogMonitoringConfigs(serverId?: string): Promise<LogMonitoringConfig[]>;
  createLogMonitoringConfig(config: InsertLogMonitoringConfig): Promise<LogMonitoringConfig>;
  updateLogMonitoringConfig(id: string, config: Partial<InsertLogMonitoringConfig>): Promise<LogMonitoringConfig | undefined>;
  deleteLogMonitoringConfig(id: string): Promise<boolean>;

  // Container orchestration operations
  getContainerStacks(): Promise<ContainerStack[]>;
  performContainerAction(id: string, action: ContainerActionInput): Promise<ContainerStack | undefined>;

  // Service management operations
  getServiceProcesses(): Promise<ServiceProcess[]>;
  performServiceAction(id: string, action: ServiceActionInput): Promise<ServiceProcess | undefined>;

  // Backup and log export operations
  getBackupJobs(): Promise<BackupJob[]>;
  createBackupJob(input: CreateBackupInput): Promise<BackupJob>;
  getLogExportTasks(): Promise<LogExportTask[]>;
  createLogExportTask(input: CreateLogExportInput): Promise<LogExportTask>;

  // Telemetry operations
  getTelemetryEvents(limit?: number): Promise<TelemetryEvent[]>;
  recordTelemetryEvent(input: RecordTelemetryInput): Promise<TelemetryEvent>;
}

export class MemStorage implements IStorage {
  private servers: Map<string, Server>;
  private metrics: Map<string, ServerMetrics[]>;
  private alerts: Map<string, Alert>;
  private sshSessions: Map<string, SshSession>;
  private serviceProcesses: Map<string, ServiceProcess>;
  private backupJobs: BackupJob[];
  private logExportTasks: LogExportTask[];
  private telemetryEvents: TelemetryEvent[];
  private telemetryLimit: number;

  constructor() {
    this.servers = new Map();
    this.metrics = new Map();
    this.alerts = new Map();
    this.sshSessions = new Map();
    this.serviceProcesses = new Map();
    this.backupJobs = [];
    this.logExportTasks = [];
    this.telemetryEvents = [];
    this.telemetryLimit = 200;

    // Initialize with sample data
    this.initializeSampleData();
  }

  private initializeSampleData() {
    const sampleServers: Server[] = [
      {
        id: "server-1",
        name: "web-prod-01",
        hostname: "web-prod-01.empresa.com",
        ip: "192.168.1.10",
        sshPort: 22,
        sshUsername: "admin",
        sshPassword: null,
        sshPrivateKey: null,
        environment: "production",
        serverType: "web",
        description: "Servidor web principal de produção",
        tags: ["nginx", "php", "mysql-client"],
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: "server-2",
        name: "db-prod-01",
        hostname: "db-prod-01.empresa.com",
        ip: "192.168.1.15",
        sshPort: 22,
        sshUsername: "admin",
        sshPassword: null,
        sshPrivateKey: null,
        environment: "production",
        serverType: "database",
        description: "Servidor de banco de dados principal",
        tags: ["mysql", "redis"],
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: "server-3",
        name: "app-hybrid-01",
        hostname: "app-hybrid-01.empresa.com",
        ip: "192.168.1.20",
        sshPort: 22,
        sshUsername: "admin",
        sshPassword: null,
        sshPrivateKey: null,
        environment: "production",
        serverType: "hybrid",
        description: "Servidor híbrido com aplicação e banco",
        tags: ["nodejs", "mongodb", "redis"],
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: "server-4",
        name: "backup-srv-01",
        hostname: "backup-srv-01.empresa.com",
        ip: "192.168.1.25",
        sshPort: 22,
        sshUsername: "admin",
        sshPassword: null,
        sshPrivateKey: null,
        environment: "production",
        serverType: "backup",
        description: "Servidor de backup",
        tags: ["rsync", "backup"],
        isActive: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: "server-5",
        name: "web-homolog-01",
        hostname: "web-homolog-01.empresa.com",
        ip: "192.168.2.10",
        sshPort: 22,
        sshUsername: "admin",
        sshPassword: null,
        sshPrivateKey: null,
        environment: "staging",
        serverType: "web",
        description: "Servidor web de homologação",
        tags: ["nginx", "php"],
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: "server-6",
        name: "mail-prod-01",
        hostname: "mail-prod-01.empresa.com",
        ip: "192.168.1.30",
        sshPort: 22,
        sshUsername: "admin",
        sshPassword: null,
        sshPrivateKey: null,
        environment: "production",
        serverType: "mail",
        description: "Servidor de email",
        tags: ["postfix", "dovecot"],
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      }
    ];

    sampleServers.forEach(server => {
      this.servers.set(server.id, server);
      this.metrics.set(server.id, []);
    });

    // Generate initial metrics
    this.generateInitialMetrics();
  }

  private generateInitialMetrics() {
    const serversData = [
      { id: "server-1", cpu: 32, memory: 68, disk: 45, isOnline: true },
      { id: "server-2", cpu: 78, memory: 91, disk: 67, isOnline: true },
      { id: "server-3", cpu: 56, memory: 73, disk: 87, isOnline: true },
      { id: "server-4", cpu: 0, memory: 0, disk: 0, isOnline: false },
      { id: "server-5", cpu: 28, memory: 52, disk: 34, isOnline: true },
      { id: "server-6", cpu: 89, memory: 76, disk: 92, isOnline: true },
    ];

    serversData.forEach(({ id, cpu, memory, disk, isOnline }) => {
      const metrics: ServerMetrics = {
        id: randomUUID(),
        serverId: id,
        cpuUsage: cpu.toString(),
        memoryUsage: memory.toString(),
        diskUsage: disk.toString(),
        networkIn: "0",
        networkOut: "0",
        uptime: isOnline ? "99.9" : "0",
        isOnline,
        timestamp: new Date(),
      };

      this.metrics.get(id)?.push(metrics);
    });

    // Generate some alerts
    this.alerts.set("alert-1", {
      id: "alert-1",
      serverId: "server-2",
      alertType: "memory",
      severity: "critical",
      message: "Memória RAM acima de 90%",
      threshold: "90",
      currentValue: "91",
      isResolved: false,
      createdAt: new Date(),
      resolvedAt: null,
    });

    this.alerts.set("alert-2", {
      id: "alert-2",
      serverId: "server-6",
      alertType: "cpu",
      severity: "critical",
      message: "CPU em estado crítico",
      threshold: "80",
      currentValue: "89",
      isResolved: false,
      createdAt: new Date(),
      resolvedAt: null,
    });

    this.alerts.set("alert-3", {
      id: "alert-3",
      serverId: "server-6",
      alertType: "disk",
      severity: "warning",
      message: "Disco acima de 85%",
      threshold: "85",
      currentValue: "92",
      isResolved: false,
      createdAt: new Date(),
      resolvedAt: null,
    });

    this.initializeOperationalData();
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

  // Utility function to sanitize server data by removing sensitive SSH credentials
  private sanitizeServer(server: Server): PublicServer {
    const { sshPassword, sshPrivateKey, ...publicServer } = server;
    return publicServer;
  }

  async getServers(): Promise<Server[]> {
    return Array.from(this.servers.values());
  }

  async getPublicServers(): Promise<PublicServer[]> {
    return Array.from(this.servers.values()).map(server => this.sanitizeServer(server));
  }

  async getServer(id: string): Promise<Server | undefined> {
    return this.servers.get(id);
  }

  async getPublicServer(id: string): Promise<PublicServer | undefined> {
    const server = this.servers.get(id);
    return server ? this.sanitizeServer(server) : undefined;
  }

  async getServersByEnvironment(environment: string): Promise<Server[]> {
    return Array.from(this.servers.values()).filter(server => server.environment === environment);
  }

  async createServer(insertServer: InsertServer): Promise<Server> {
    const id = randomUUID();
    const server: Server = {
      ...insertServer,
      id,
      sshPort: insertServer.sshPort ?? 22,
      environment: insertServer.environment ?? "production",
      serverType: insertServer.serverType ?? "web",
      isActive: insertServer.isActive ?? true,
      description: insertServer.description || null,
      sshUsername: insertServer.sshUsername || null,
      sshPassword: insertServer.sshPassword || null,
      sshPrivateKey: insertServer.sshPrivateKey || null,
      tags: insertServer.tags || [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.servers.set(id, server);
    this.metrics.set(id, []);
    return server;
  }

  async updateServer(id: string, updateData: Partial<InsertServer>): Promise<Server | undefined> {
    const server = this.servers.get(id);
    if (!server) return undefined;

    const updatedServer: Server = {
      ...server,
      ...updateData,
      updatedAt: new Date(),
    };
    this.servers.set(id, updatedServer);
    return updatedServer;
  }

  async deleteServer(id: string): Promise<boolean> {
    const deleted = this.servers.delete(id);
    if (deleted) {
      this.metrics.delete(id);
    }
    return deleted;
  }

  async getServerMetrics(serverId: string): Promise<ServerMetrics[]> {
    return this.metrics.get(serverId) || [];
  }

  async getLatestServerMetrics(serverId: string): Promise<ServerMetrics | undefined> {
    const metrics = this.metrics.get(serverId) || [];
    return metrics[metrics.length - 1];
  }

  async createMetrics(insertMetrics: InsertMetrics): Promise<ServerMetrics> {
    const id = randomUUID();
    const metrics: ServerMetrics = {
      ...insertMetrics,
      id,
      isOnline: insertMetrics.isOnline ?? false,
      cpuUsage: insertMetrics.cpuUsage || null,
      memoryUsage: insertMetrics.memoryUsage || null,
      diskUsage: insertMetrics.diskUsage || null,
      networkIn: insertMetrics.networkIn || null,
      networkOut: insertMetrics.networkOut || null,
      uptime: insertMetrics.uptime || null,
      timestamp: new Date(),
    };
    
    const serverMetrics = this.metrics.get(insertMetrics.serverId) || [];
    serverMetrics.push(metrics);
    this.metrics.set(insertMetrics.serverId, serverMetrics);
    
    return metrics;
  }

  async getServersWithLatestMetrics(): Promise<ServerWithMetrics[]> {
    const servers = await this.getServers();
    const serversWithMetrics: ServerWithMetrics[] = [];

    for (const server of servers) {
      const metrics = await this.getLatestServerMetrics(server.id);
      const alerts = await this.getServerAlerts(server.id);
      serversWithMetrics.push({
        ...server,
        metrics,
        alerts,
      });
    }

    return serversWithMetrics;
  }

  async getPublicServersWithLatestMetrics(): Promise<PublicServerWithMetrics[]> {
    const servers = await this.getPublicServers();
    const serversWithMetrics: PublicServerWithMetrics[] = [];

    for (const server of servers) {
      const metrics = await this.getLatestServerMetrics(server.id);
      const alerts = await this.getServerAlerts(server.id);
      serversWithMetrics.push({
        ...server,
        metrics,
        alerts,
      });
    }

    return serversWithMetrics;
  }

  async getAlerts(): Promise<Alert[]> {
    return Array.from(this.alerts.values());
  }

  async getServerAlerts(serverId: string): Promise<Alert[]> {
    return Array.from(this.alerts.values()).filter(alert => alert.serverId === serverId);
  }

  async getActiveAlerts(): Promise<Alert[]> {
    return Array.from(this.alerts.values()).filter(alert => !alert.isResolved);
  }

  async createAlert(insertAlert: InsertAlert): Promise<Alert> {
    const id = randomUUID();
    const alert: Alert = {
      ...insertAlert,
      id,
      isResolved: insertAlert.isResolved ?? false,
      threshold: insertAlert.threshold || null,
      currentValue: insertAlert.currentValue || null,
      createdAt: new Date(),
      resolvedAt: null,
    };
    this.alerts.set(id, alert);
    return alert;
  }

  async resolveAlert(id: string): Promise<Alert | undefined> {
    const alert = this.alerts.get(id);
    if (!alert) return undefined;

    const resolvedAlert: Alert = {
      ...alert,
      isResolved: true,
      resolvedAt: new Date(),
    };
    this.alerts.set(id, resolvedAlert);
    return resolvedAlert;
  }

  async getSshSessions(): Promise<SshSession[]> {
    return Array.from(this.sshSessions.values());
  }

  async getActiveSshSessions(): Promise<SshSession[]> {
    return Array.from(this.sshSessions.values()).filter(session => session.isActive);
  }

  async createSshSession(insertSession: InsertSshSession): Promise<SshSession> {
    const id = randomUUID();
    const session: SshSession = {
      ...insertSession,
      id,
      isActive: insertSession.isActive ?? true,
      startedAt: new Date(),
      endedAt: null,
    };
    this.sshSessions.set(id, session);
    return session;
  }

  async endSshSession(id: string): Promise<SshSession | undefined> {
    const session = this.sshSessions.get(id);
    if (!session) return undefined;

    const endedSession: SshSession = {
      ...session,
      isActive: false,
      endedAt: new Date(),
    };
    this.sshSessions.set(id, endedSession);
    return endedSession;
  }

  async getContainerStacks(): Promise<ContainerStack[]> {
    try {
      return await listDockerStacks();
    } catch (error) {
      if (error instanceof DockerUnavailableError) {
        throw error;
      }
      throw new Error(`Não foi possível listar os containers: ${(error as Error).message}`);
    }
  }

  async performContainerAction(id: string, action: ContainerActionInput): Promise<ContainerStack | undefined> {
    let updatedStack: ContainerStack | undefined;
    try {
      updatedStack = await performDockerStackAction(id, action);
    } catch (error) {
      if (error instanceof DockerUnavailableError) {
        throw error;
      }
      throw new Error(`Falha ao executar ação no stack ${id}: ${(error as Error).message}`);
    }
    if (!updatedStack) {
      return undefined;
    }

    const affectedCount = action.services?.length ?? updatedStack.services.length;
    const lastAction = updatedStack.lastAction ?? "Ação executada";
    const status = action.action === "down" ? "warning" : "ok";

    try {
      await this.recordTelemetryEvent({
        serverId: id,
        metric: `container.${action.action}`,
        value: affectedCount,
        unit: "serviços",
        status,
        message: `${updatedStack.name}: ${lastAction}`,
      });
    } catch (error) {
      // Telemetry failures should not block container actions
      console.error("Failed to record telemetry for container action", error);
    }

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

  // Log Monitoring operations (stub implementations for interface compliance)
  async getServerLogs(serverId: string, limit?: number): Promise<ServerLog[]> {
    // MemStorage doesn't support log monitoring - return empty array
    return [];
  }

  async getServerLogsByLevel(serverId: string, logLevel: string): Promise<ServerLog[]> {
    // MemStorage doesn't support log monitoring - return empty array
    return [];
  }

  async createServerLog(log: InsertServerLog): Promise<ServerLog> {
    // MemStorage doesn't support log monitoring - throw error
    throw new Error("Log monitoring not supported in MemStorage");
  }

  async getLogMonitoringConfigs(serverId?: string): Promise<LogMonitoringConfig[]> {
    // MemStorage doesn't support log monitoring - return empty array
    return [];
  }

  async createLogMonitoringConfig(config: InsertLogMonitoringConfig): Promise<LogMonitoringConfig> {
    // MemStorage doesn't support log monitoring - throw error
    throw new Error("Log monitoring configuration not supported in MemStorage");
  }

  async updateLogMonitoringConfig(id: string, config: Partial<InsertLogMonitoringConfig>): Promise<LogMonitoringConfig | undefined> {
    // MemStorage doesn't support log monitoring - return undefined
    return undefined;
  }

  async deleteLogMonitoringConfig(id: string): Promise<boolean> {
    // MemStorage doesn't support log monitoring - return false
    return false;
  }
}

// Create single instance of database storage
const databaseStorage = new DatabaseStorage();

// Initialize database and seed if needed
async function initializeStorage() {
  // Check if database is seeded by trying to get servers
  try {
    const existingServers = await databaseStorage.getServers();
    if (existingServers.length === 0) {
      console.log("No servers found, seeding database...");
      const { seedDatabase } = await import("./seed");
      await seedDatabase();
    } else {
      console.log(`Database already seeded with ${existingServers.length} servers`);
    }
  } catch (error) {
    console.error("Error initializing storage:", error);
  }
}

// Export the storage instance - using database storage for persistence
export const storage = databaseStorage;

// Auto-seed the database on startup
initializeStorage().catch(console.error);
