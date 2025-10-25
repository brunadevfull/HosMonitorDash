import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, decimal, timestamp, boolean, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const servers = pgTable("servers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  hostname: text("hostname").notNull(),
  ip: text("ip").notNull(),
  sshPort: integer("ssh_port").notNull().default(22),
  sshUsername: text("ssh_username"),
  sshPassword: text("ssh_password"),
  sshPrivateKey: text("ssh_private_key"),
  environment: text("environment").notNull().default("production"), // production, staging, development
  serverType: text("server_type").notNull().default("web"), // web, database, hybrid, mail, backup
  description: text("description"),
  tags: jsonb("tags").default([]),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
  updatedAt: timestamp("updated_at").notNull().default(sql`now()`),
});

export const serverMetrics = pgTable("server_metrics", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  serverId: varchar("server_id").notNull().references(() => servers.id, { onDelete: "cascade" }),
  cpuUsage: decimal("cpu_usage", { precision: 5, scale: 2 }),
  memoryUsage: decimal("memory_usage", { precision: 5, scale: 2 }),
  diskUsage: decimal("disk_usage", { precision: 5, scale: 2 }),
  networkIn: decimal("network_in", { precision: 15, scale: 2 }),
  networkOut: decimal("network_out", { precision: 15, scale: 2 }),
  uptime: decimal("uptime", { precision: 15, scale: 2 }),
  isOnline: boolean("is_online").notNull().default(false),
  timestamp: timestamp("timestamp").notNull().default(sql`now()`),
});

export const alerts = pgTable("alerts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  serverId: varchar("server_id").notNull().references(() => servers.id, { onDelete: "cascade" }),
  alertType: text("alert_type").notNull(), // cpu, memory, disk, offline
  severity: text("severity").notNull(), // info, warning, critical
  message: text("message").notNull(),
  threshold: decimal("threshold", { precision: 5, scale: 2 }),
  currentValue: decimal("current_value", { precision: 5, scale: 2 }),
  isResolved: boolean("is_resolved").notNull().default(false),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
  resolvedAt: timestamp("resolved_at"),
});

export const sshSessions = pgTable("ssh_sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  serverId: varchar("server_id").notNull().references(() => servers.id, { onDelete: "cascade" }),
  sessionId: text("session_id").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  startedAt: timestamp("started_at").notNull().default(sql`now()`),
  endedAt: timestamp("ended_at"),
});

export const serverLogs = pgTable("server_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  serverId: varchar("server_id").notNull().references(() => servers.id, { onDelete: "cascade" }),
  logLevel: text("log_level").notNull(), // info, warning, error, debug
  logSource: text("log_source").notNull(), // system, application, security, etc
  message: text("message").notNull(),
  originalLogPath: text("original_log_path"), // original log file path on server
  metadata: jsonb("metadata").default({}), // additional log context
  timestamp: timestamp("timestamp").notNull().default(sql`now()`),
});

export const logMonitoringConfig = pgTable("log_monitoring_config", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  serverId: varchar("server_id").notNull().references(() => servers.id, { onDelete: "cascade" }),
  logPath: text("log_path").notNull(), // path to log file on server
  logType: text("log_type").notNull(), // system, nginx, apache, mysql, etc
  isEnabled: boolean("is_enabled").notNull().default(true),
  filterPattern: text("filter_pattern"), // regex pattern for filtering
  alertOnError: boolean("alert_on_error").notNull().default(false),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
  updatedAt: timestamp("updated_at").notNull().default(sql`now()`),
});

export const insertServerSchema = createInsertSchema(servers).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertMetricsSchema = createInsertSchema(serverMetrics).omit({
  id: true,
  timestamp: true,
});

export const insertAlertSchema = createInsertSchema(alerts).omit({
  id: true,
  createdAt: true,
  resolvedAt: true,
});

export const insertSshSessionSchema = createInsertSchema(sshSessions).omit({
  id: true,
  startedAt: true,
  endedAt: true,
});

export const insertServerLogSchema = createInsertSchema(serverLogs).omit({
  id: true,
  timestamp: true,
});

export const insertLogMonitoringConfigSchema = createInsertSchema(logMonitoringConfig).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertServer = z.infer<typeof insertServerSchema>;
export type Server = typeof servers.$inferSelect;
export type InsertMetrics = z.infer<typeof insertMetricsSchema>;
export type ServerMetrics = typeof serverMetrics.$inferSelect;
export type InsertAlert = z.infer<typeof insertAlertSchema>;
export type Alert = typeof alerts.$inferSelect;
export type InsertSshSession = z.infer<typeof insertSshSessionSchema>;
export type SshSession = typeof sshSessions.$inferSelect;
export type InsertServerLog = z.infer<typeof insertServerLogSchema>;
export type ServerLog = typeof serverLogs.$inferSelect;
export type InsertLogMonitoringConfig = z.infer<typeof insertLogMonitoringConfigSchema>;
export type LogMonitoringConfig = typeof logMonitoringConfig.$inferSelect;

// Public server type that excludes sensitive SSH credentials
export type PublicServer = Omit<Server, 'sshPassword' | 'sshPrivateKey'>;

export type ServerWithMetrics = Server & {
  metrics?: ServerMetrics;
  alerts?: Alert[];
};

export type PublicServerWithMetrics = PublicServer & {
  metrics?: ServerMetrics;
  alerts?: Alert[];
};

export type ContainerService = {
  name: string;
  image: string;
  replicas: number;
  state: "running" | "stopped" | "restarting" | "error";
  ports: string[];
  lastEvent: string;
};

export type ContainerStack = {
  id: string;
  name: string;
  projectName: string;
  path: string;
  status: "running" | "stopped" | "degraded";
  updatedAt: Date;
  services: ContainerService[];
  primaryServerId?: string;
  lastAction?: string;
};

export type ServiceProcess = {
  id: string;
  name: string;
  description: string;
  manager: "systemd" | "docker";
  status: "active" | "inactive" | "failed" | "restarting";
  uptime: string;
  serverId?: string;
  lastRestart?: Date | null;
  dependencies: string[];
};

export type BackupJob = {
  id: string;
  type: "postgres" | "filesystem";
  target: string;
  status: "completed" | "running" | "failed";
  size: string;
  retention: string;
  initiatedBy: string;
  createdAt: Date;
  completedAt?: Date | null;
};

export type LogExportTask = {
  id: string;
  serverId: string;
  logType: string;
  status: "completed" | "running" | "failed";
  startedAt: Date;
  completedAt?: Date | null;
  downloadUrl?: string;
};

export type TelemetryEvent = {
  id: string;
  serverId: string;
  metric: string;
  value: number;
  unit: string;
  status: "ok" | "warning" | "critical";
  message: string;
  recordedAt: Date;
};

export const containerActionSchema = z.object({
  action: z.enum(["up", "down", "restart", "pull"]),
  services: z.array(z.string()).optional(),
});

export const serviceActionSchema = z.object({
  action: z.enum(["start", "stop", "restart"]),
});

export const createBackupSchema = z.object({
  type: z.enum(["postgres", "filesystem"]),
  target: z.string().min(1),
  retention: z.string().default("7d").optional(),
  initiatedBy: z.string().default("dashboard").optional(),
});

export const createLogExportSchema = z.object({
  serverId: z.string().min(1),
  logType: z.string().min(1),
});

export const recordTelemetryEventSchema = z.object({
  serverId: z.string().min(1),
  metric: z.string().min(1),
  value: z.number(),
  unit: z.string().min(1),
  status: z.enum(["ok", "warning", "critical"]).default("ok"),
  message: z.string().optional(),
});

export type ContainerActionInput = z.infer<typeof containerActionSchema>;
export type ServiceActionInput = z.infer<typeof serviceActionSchema>;
export type CreateBackupInput = z.infer<typeof createBackupSchema>;
export type CreateLogExportInput = z.infer<typeof createLogExportSchema>;
export type RecordTelemetryInput = z.infer<typeof recordTelemetryEventSchema>;
