import { type Server, type InsertServer, type ServerMetrics, type InsertMetrics, type Alert, type InsertAlert, type SshSession, type InsertSshSession, type ServerWithMetrics, type PublicServer, type PublicServerWithMetrics } from "@shared/schema";
import { randomUUID } from "crypto";

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
}

export class MemStorage implements IStorage {
  private servers: Map<string, Server>;
  private metrics: Map<string, ServerMetrics[]>;
  private alerts: Map<string, Alert>;
  private sshSessions: Map<string, SshSession>;

  constructor() {
    this.servers = new Map();
    this.metrics = new Map();
    this.alerts = new Map();
    this.sshSessions = new Map();

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
}

export const storage = new MemStorage();
