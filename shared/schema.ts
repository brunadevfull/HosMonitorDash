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

export type InsertServer = z.infer<typeof insertServerSchema>;
export type Server = typeof servers.$inferSelect;
export type InsertMetrics = z.infer<typeof insertMetricsSchema>;
export type ServerMetrics = typeof serverMetrics.$inferSelect;
export type InsertAlert = z.infer<typeof insertAlertSchema>;
export type Alert = typeof alerts.$inferSelect;
export type InsertSshSession = z.infer<typeof insertSshSessionSchema>;
export type SshSession = typeof sshSessions.$inferSelect;

export type ServerWithMetrics = Server & {
  metrics?: ServerMetrics;
  alerts?: Alert[];
};
