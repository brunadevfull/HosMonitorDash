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
  type PublicServerWithMetrics 
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc } from "drizzle-orm";
import { IStorage } from "./storage";

export class DatabaseStorage implements IStorage {
  // Utility function to sanitize server data by removing sensitive SSH credentials
  private sanitizeServer(server: Server): PublicServer {
    const { sshPassword, sshPrivateKey, ...publicServer } = server;
    return publicServer;
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