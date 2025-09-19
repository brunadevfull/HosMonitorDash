// Seed script for Portuguese server monitoring dashboard
import { db } from "./db";
import { servers, serverMetrics, alerts, serverLogs, logMonitoringConfig } from "@shared/schema";

export async function seedDatabase() {
  console.log("🌱 Seeding database with sample data...");

  // Clear existing data
  await db.delete(alerts);
  await db.delete(serverMetrics);
  await db.delete(servers);

  // Insert sample servers
  const sampleServers = [
    {
      name: "web-prod-01",
      hostname: "web-prod-01.empresa.com",
      ip: "192.168.1.10",
      sshPort: 22,
      sshUsername: "admin",
      environment: "production",
      serverType: "web",
      description: "Servidor web principal de produção",
      tags: ["nginx", "php", "mysql-client"],
      isActive: true,
    },
    {
      name: "db-prod-01",
      hostname: "db-prod-01.empresa.com",
      ip: "192.168.1.15",
      sshPort: 22,
      sshUsername: "admin",
      environment: "production",
      serverType: "database",
      description: "Servidor de banco de dados principal",
      tags: ["mysql", "redis"],
      isActive: true,
    },
    {
      name: "app-hybrid-01",
      hostname: "app-hybrid-01.empresa.com",
      ip: "192.168.1.20",
      sshPort: 22,
      sshUsername: "admin",
      environment: "production",
      serverType: "hybrid",
      description: "Servidor híbrido com aplicação e banco",
      tags: ["nodejs", "mongodb", "redis"],
      isActive: true,
    },
    {
      name: "backup-srv-01",
      hostname: "backup-srv-01.empresa.com",
      ip: "192.168.1.25",
      sshPort: 22,
      sshUsername: "admin",
      environment: "production",
      serverType: "backup",
      description: "Servidor de backup",
      tags: ["rsync", "backup"],
      isActive: false,
    },
    {
      name: "web-homolog-01",
      hostname: "web-homolog-01.empresa.com",
      ip: "192.168.2.10",
      sshPort: 22,
      sshUsername: "admin",
      environment: "staging",
      serverType: "web",
      description: "Servidor web de homologação",
      tags: ["nginx", "php"],
      isActive: true,
    },
    {
      name: "mail-prod-01",
      hostname: "mail-prod-01.empresa.com",
      ip: "192.168.1.30",
      sshPort: 22,
      sshUsername: "admin",
      environment: "production",
      serverType: "mail",
      description: "Servidor de email",
      tags: ["postfix", "dovecot"],
      isActive: true,
    }
  ];

  const insertedServers = await db.insert(servers).values(sampleServers).returning();
  console.log(`✅ Inserted ${insertedServers.length} servers`);

  // Generate initial metrics for each server
  const metricsData = [
    { serverId: insertedServers[0].id, cpuUsage: "32", memoryUsage: "68", diskUsage: "45", isOnline: true },
    { serverId: insertedServers[1].id, cpuUsage: "78", memoryUsage: "91", diskUsage: "67", isOnline: true },
    { serverId: insertedServers[2].id, cpuUsage: "56", memoryUsage: "73", diskUsage: "87", isOnline: true },
    { serverId: insertedServers[3].id, cpuUsage: "0", memoryUsage: "0", diskUsage: "0", isOnline: false },
    { serverId: insertedServers[4].id, cpuUsage: "28", memoryUsage: "52", diskUsage: "34", isOnline: true },
    { serverId: insertedServers[5].id, cpuUsage: "89", memoryUsage: "76", diskUsage: "92", isOnline: true },
  ];

  const insertedMetrics = await db.insert(serverMetrics).values(
    metricsData.map(data => ({
      ...data,
      networkIn: "0",
      networkOut: "0",
      uptime: data.isOnline ? "99.9" : "0",
    }))
  ).returning();
  console.log(`✅ Inserted ${insertedMetrics.length} metrics entries`);

  // Generate sample alerts
  const alertsData = [
    {
      serverId: insertedServers[1].id, // db-prod-01
      alertType: "memory",
      severity: "critical",
      message: "Memória RAM acima de 90%",
      threshold: "90",
      currentValue: "91",
      isResolved: false,
    },
    {
      serverId: insertedServers[5].id, // mail-prod-01
      alertType: "cpu",
      severity: "critical",
      message: "CPU em estado crítico",
      threshold: "80",
      currentValue: "89",
      isResolved: false,
    },
    {
      serverId: insertedServers[5].id, // mail-prod-01
      alertType: "disk",
      severity: "warning",
      message: "Disco acima de 85%",
      threshold: "85",
      currentValue: "92",
      isResolved: false,
    },
  ];

  const insertedAlerts = await db.insert(alerts).values(alertsData).returning();
  console.log(`✅ Inserted ${insertedAlerts.length} alerts`);

  // Create sample log monitoring configurations
  const logConfigsData = [
    {
      serverId: insertedServers[0].id, // web-prod-01
      logPath: "/var/log/nginx/access.log",
      logType: "nginx",
      isEnabled: true,
      filterPattern: null,
      alertOnError: false,
    },
    {
      serverId: insertedServers[0].id, // web-prod-01
      logPath: "/var/log/nginx/error.log",
      logType: "nginx",
      isEnabled: true,
      filterPattern: "ERROR|CRITICAL",
      alertOnError: true,
    },
    {
      serverId: insertedServers[1].id, // db-prod-01
      logPath: "/var/log/mysql/mysql.log",
      logType: "mysql",
      isEnabled: true,
      filterPattern: null,
      alertOnError: false,
    },
    {
      serverId: insertedServers[1].id, // db-prod-01
      logPath: "/var/log/mysql/error.log",
      logType: "mysql",
      isEnabled: true,
      filterPattern: "ERROR",
      alertOnError: true,
    },
  ];

  const insertedLogConfigs = await db.insert(logMonitoringConfig).values(logConfigsData).returning();
  console.log(`✅ Inserted ${insertedLogConfigs.length} log monitoring configs`);

  // Generate sample log entries
  const sampleLogs = [
    // Web server logs
    {
      serverId: insertedServers[0].id, // web-prod-01
      logLevel: "info",
      logSource: "nginx",
      message: "192.168.1.100 - - [19/Sep/2025:21:30:15 +0000] \"GET /api/status HTTP/1.1\" 200 145",
      originalLogPath: "/var/log/nginx/access.log",
      metadata: { ip: "192.168.1.100", method: "GET", status: 200, path: "/api/status" },
    },
    {
      serverId: insertedServers[0].id, // web-prod-01
      logLevel: "error",
      logSource: "nginx",
      message: "2025/09/19 21:30:20 [error] 1234#0: *567 connect() failed (111: Connection refused) while connecting to upstream",
      originalLogPath: "/var/log/nginx/error.log",
      metadata: { process: "1234", connection: "567", error: "Connection refused" },
    },
    {
      serverId: insertedServers[0].id, // web-prod-01
      logLevel: "info",
      logSource: "nginx",
      message: "192.168.1.101 - - [19/Sep/2025:21:31:05 +0000] \"POST /api/servers HTTP/1.1\" 201 234",
      originalLogPath: "/var/log/nginx/access.log",
      metadata: { ip: "192.168.1.101", method: "POST", status: 201, path: "/api/servers" },
    },
    // Database logs
    {
      serverId: insertedServers[1].id, // db-prod-01
      logLevel: "info",
      logSource: "mysql",
      message: "2025-09-19T21:30:15.123456Z 8 [Note] Access denied for user 'backup'@'192.168.1.200' (using password: YES)",
      originalLogPath: "/var/log/mysql/mysql.log",
      metadata: { connection_id: 8, user: "backup", host: "192.168.1.200" },
    },
    {
      serverId: insertedServers[1].id, // db-prod-01
      logLevel: "warning",
      logSource: "mysql",
      message: "2025-09-19T21:31:00.456789Z 12 [Warning] Slow query detected: SELECT * FROM large_table WHERE created_at > '2025-01-01' (3.2s)",
      originalLogPath: "/var/log/mysql/mysql.log",
      metadata: { connection_id: 12, query_time: "3.2s", query: "SELECT * FROM large_table..." },
    },
    // System logs
    {
      serverId: insertedServers[2].id, // app-hybrid-01
      logLevel: "info",
      logSource: "system",
      message: "Sep 19 21:30:25 app-hybrid-01 systemd[1]: Started Daily apt download activities",
      originalLogPath: "/var/log/syslog",
      metadata: { service: "systemd", action: "Started", process: "apt" },
    },
    {
      serverId: insertedServers[5].id, // mail-prod-01
      logLevel: "info",
      logSource: "postfix",
      message: "Sep 19 21:30:30 mail-prod-01 postfix/smtpd[1234]: connect from unknown[192.168.1.150]",
      originalLogPath: "/var/log/mail.log",
      metadata: { service: "postfix", process: "smtpd", action: "connect", remote_ip: "192.168.1.150" },
    },
  ];

  const insertedLogs = await db.insert(serverLogs).values(sampleLogs).returning();
  console.log(`✅ Inserted ${insertedLogs.length} sample log entries`);

  console.log("🎉 Database seeded successfully!");
}