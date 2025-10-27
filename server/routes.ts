import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { DockerUnavailableError } from "./docker";
import {
  insertServerSchema,
  insertMetricsSchema,
  insertAlertSchema,
  insertServerLogSchema,
  insertLogMonitoringConfigSchema,
  containerActionSchema,
  serviceActionSchema,
  createBackupSchema,
  createLogExportSchema,
  recordTelemetryEventSchema,
} from "@shared/schema";
import { randomUUID } from "crypto";
import { ZodError } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  // Server management routes
  app.get("/api/servers", async (req, res) => {
    try {
      const servers = await storage.getPublicServersWithLatestMetrics();
      res.json(servers);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch servers" });
    }
  });

  app.get("/api/servers/:id", async (req, res) => {
    try {
      const server = await storage.getPublicServer(req.params.id);
      if (!server) {
        return res.status(404).json({ message: "Server not found" });
      }
      const metrics = await storage.getLatestServerMetrics(server.id);
      const alerts = await storage.getServerAlerts(server.id);
      res.json({ ...server, metrics, alerts });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch server" });
    }
  });

  app.post("/api/servers", async (req, res) => {
    try {
      const validatedData = insertServerSchema.parse(req.body);
      const server = await storage.createServer(validatedData);
      // Return sanitized server data without SSH credentials
      const publicServer = await storage.getPublicServer(server.id);
      res.status(201).json(publicServer);
    } catch (error) {
      res.status(400).json({ message: "Invalid server data" });
    }
  });

  app.put("/api/servers/:id", async (req, res) => {
    try {
      const validatedData = insertServerSchema.partial().parse(req.body);
      const server = await storage.updateServer(req.params.id, validatedData);
      if (!server) {
        return res.status(404).json({ message: "Server not found" });
      }
      // Return sanitized server data without SSH credentials
      const publicServer = await storage.getPublicServer(server.id);
      res.json(publicServer);
    } catch (error) {
      res.status(400).json({ message: "Invalid server data" });
    }
  });

  app.delete("/api/servers/:id", async (req, res) => {
    try {
      const deleted = await storage.deleteServer(req.params.id);
      if (!deleted) {
        return res.status(404).json({ message: "Server not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete server" });
    }
  });

  // Metrics routes
  app.get("/api/servers/:id/metrics", async (req, res) => {
    try {
      const metrics = await storage.getServerMetrics(req.params.id);
      res.json(metrics);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch metrics" });
    }
  });

  app.post("/api/servers/:id/metrics", async (req, res) => {
    try {
      const validatedData = insertMetricsSchema.parse({
        ...req.body,
        serverId: req.params.id,
      });
      const metrics = await storage.createMetrics(validatedData);
      res.status(201).json(metrics);
    } catch (error) {
      res.status(400).json({ message: "Invalid metrics data" });
    }
  });

  // Alert routes
  app.get("/api/alerts", async (req, res) => {
    try {
      const alerts = await storage.getActiveAlerts();
      res.json(alerts);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch alerts" });
    }
  });

  app.post("/api/alerts", async (req, res) => {
    try {
      const validatedData = insertAlertSchema.parse(req.body);
      const alert = await storage.createAlert(validatedData);
      res.status(201).json(alert);
    } catch (error) {
      res.status(400).json({ message: "Invalid alert data" });
    }
  });

  app.patch("/api/alerts/:id/resolve", async (req, res) => {
    try {
      const alert = await storage.resolveAlert(req.params.id);
      if (!alert) {
        return res.status(404).json({ message: "Alert not found" });
      }
      res.json(alert);
    } catch (error) {
      res.status(500).json({ message: "Failed to resolve alert" });
    }
  });

  // SSH session routes
  app.get("/api/ssh-sessions", async (req, res) => {
    try {
      const sessions = await storage.getActiveSshSessions();
      res.json(sessions);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch SSH sessions" });
    }
  });

  app.post("/api/ssh-sessions", async (req, res) => {
    try {
      const { serverId } = req.body;
      const sessionId = randomUUID();
      const session = await storage.createSshSession({
        serverId,
        sessionId,
        isActive: true,
      });
      res.status(201).json(session);
    } catch (error) {
      res.status(400).json({ message: "Failed to create SSH session" });
    }
  });

  app.delete("/api/ssh-sessions/:id", async (req, res) => {
    try {
      const session = await storage.endSshSession(req.params.id);
      if (!session) {
        return res.status(404).json({ message: "SSH session not found" });
      }
      res.json(session);
    } catch (error) {
      res.status(500).json({ message: "Failed to end SSH session" });
    }
  });

  // Log monitoring routes
  app.get("/api/servers/:id/logs", async (req, res) => {
    try {
      const { limit = 100, level } = req.query;
      let logs;
      
      if (level && typeof level === 'string') {
        logs = await storage.getServerLogsByLevel(req.params.id, level);
      } else {
        logs = await storage.getServerLogs(req.params.id, parseInt(limit as string));
      }
      
      res.json(logs);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch server logs" });
    }
  });

  app.post("/api/servers/:id/logs", async (req, res) => {
    try {
      const validatedData = insertServerLogSchema.parse({
        ...req.body,
        serverId: req.params.id,
      });
      const log = await storage.createServerLog(validatedData);
      res.status(201).json(log);
    } catch (error) {
      res.status(400).json({ message: "Invalid log data" });
    }
  });

  // Log monitoring configuration routes
  app.get("/api/log-monitoring", async (req, res) => {
    try {
      const { serverId } = req.query;
      const configs = await storage.getLogMonitoringConfigs(serverId as string);
      res.json(configs);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch log monitoring configs" });
    }
  });

  app.post("/api/log-monitoring", async (req, res) => {
    try {
      const validatedData = insertLogMonitoringConfigSchema.parse(req.body);
      const config = await storage.createLogMonitoringConfig(validatedData);
      res.status(201).json(config);
    } catch (error) {
      res.status(400).json({ message: "Invalid log monitoring config" });
    }
  });

  app.put("/api/log-monitoring/:id", async (req, res) => {
    try {
      const validatedData = insertLogMonitoringConfigSchema.partial().parse(req.body);
      const config = await storage.updateLogMonitoringConfig(req.params.id, validatedData);
      if (!config) {
        return res.status(404).json({ message: "Log monitoring config not found" });
      }
      res.json(config);
    } catch (error) {
      res.status(400).json({ message: "Invalid log monitoring config data" });
    }
  });

  app.delete("/api/log-monitoring/:id", async (req, res) => {
    try {
      const deleted = await storage.deleteLogMonitoringConfig(req.params.id);
      if (!deleted) {
        return res.status(404).json({ message: "Log monitoring config not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete log monitoring config" });
    }
  });

  // Container orchestration routes
  app.get("/api/container-stacks", async (_req, res) => {
    try {
      const stacks = await storage.getContainerStacks();
      res.json(stacks);
    } catch (error) {
      if (error instanceof DockerUnavailableError) {
        return res.status(503).json({ message: error.message });
      }
      res.status(500).json({ message: "Failed to fetch container stacks" });
    }
  });

  app.post("/api/container-stacks/:id/actions", async (req, res) => {
    try {
      const payload = containerActionSchema.parse(req.body);
      const stack = await storage.performContainerAction(req.params.id, payload);
      if (!stack) {
        return res.status(404).json({ message: "Container stack not found" });
      }
      res.json(stack);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ message: "Invalid container action payload" });
      }
      if (error instanceof DockerUnavailableError) {
        return res.status(503).json({ message: error.message });
      }
      res.status(500).json({ message: "Failed to execute container action" });
    }
  });

  // Service management routes
  app.get("/api/services", async (_req, res) => {
    try {
      const services = await storage.getServiceProcesses();
      res.json(services);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch services" });
    }
  });

  app.post("/api/services/:id/actions", async (req, res) => {
    try {
      const payload = serviceActionSchema.parse(req.body);
      const service = await storage.performServiceAction(req.params.id, payload);
      if (!service) {
        return res.status(404).json({ message: "Service not found" });
      }
      res.json(service);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ message: "Invalid service action payload" });
      }
      res.status(500).json({ message: "Failed to execute service action" });
    }
  });

  // Backup and log export tools
  app.get("/api/maintenance/backups", async (_req, res) => {
    try {
      const backups = await storage.getBackupJobs();
      res.json(backups);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch backups" });
    }
  });

  app.post("/api/maintenance/backups", async (req, res) => {
    try {
      const payload = createBackupSchema.parse(req.body);
      const backup = await storage.createBackupJob(payload);
      res.status(201).json(backup);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ message: "Invalid backup payload" });
      }
      res.status(500).json({ message: "Failed to create backup" });
    }
  });

  app.get("/api/maintenance/log-exports", async (_req, res) => {
    try {
      const tasks = await storage.getLogExportTasks();
      res.json(tasks);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch log export tasks" });
    }
  });

  app.post("/api/maintenance/logs/export", async (req, res) => {
    try {
      const payload = createLogExportSchema.parse(req.body);
      const task = await storage.createLogExportTask(payload);
      res.status(201).json(task);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ message: "Invalid log export payload" });
      }
      res.status(500).json({ message: "Failed to export logs" });
    }
  });

  // Telemetry routes
  app.get("/api/telemetry/events", async (req, res) => {
    try {
      const limitParam = req.query.limit;
      const parsedLimit = limitParam ? parseInt(limitParam as string, 10) : undefined;
      const limit = parsedLimit && parsedLimit > 0 ? parsedLimit : undefined;
      const events = await storage.getTelemetryEvents(limit);
      res.json(events);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch telemetry events" });
    }
  });

  app.post("/api/telemetry/events", async (req, res) => {
    try {
      const payload = recordTelemetryEventSchema.parse(req.body);
      const event = await storage.recordTelemetryEvent(payload);
      res.status(201).json(event);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ message: "Invalid telemetry payload" });
      }
      res.status(500).json({ message: "Failed to record telemetry event" });
    }
  });

  const httpServer = createServer(app);

  // WebSocket server for real-time updates
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });

  wss.on('connection', (ws: WebSocket) => {
    console.log('WebSocket client connected');

    // Send initial data
    ws.send(JSON.stringify({
      type: 'connected',
      message: 'WebSocket connection established'
    }));

    // Handle client messages
    ws.on('message', async (message: string) => {
      try {
        const data = JSON.parse(message);
        
        switch (data.type) {
          case 'subscribe_servers':
            // Client wants to subscribe to server updates
            const servers = await storage.getPublicServersWithLatestMetrics();
            ws.send(JSON.stringify({
              type: 'servers_update',
              data: servers
            }));
            break;
            
          case 'subscribe_alerts':
            // Client wants to subscribe to alert updates
            const alerts = await storage.getActiveAlerts();
            ws.send(JSON.stringify({
              type: 'alerts_update',
              data: alerts
            }));
            break;
            
          case 'subscribe_logs':
            // Client wants to subscribe to real-time logs for a specific server
            const { serverId, limit = 50 } = data;
            if (serverId) {
              const logs = await storage.getServerLogs(serverId, limit);
              ws.send(JSON.stringify({
                type: 'logs_update',
                serverId,
                data: logs
              }));
            }
            break;
        }
      } catch (error) {
        console.error('WebSocket message error:', error);
      }
    });

    ws.on('close', () => {
      console.log('WebSocket client disconnected');
    });

    // Check for ready state before sending
    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
    });
  });

  // Simulate real-time metrics updates
  setInterval(async () => {
    try {
      const servers = await storage.getServers();
      
      // Generate random metrics for each online server
      for (const server of servers) {
        if (!server.isActive) continue;
        
        const currentMetrics = await storage.getLatestServerMetrics(server.id);
        const baseMetrics = currentMetrics || {
          cpuUsage: "50",
          memoryUsage: "60",
          diskUsage: "40",
          isOnline: true
        };

        // Generate slight variations
        const cpuUsage = Math.max(0, Math.min(100, 
          parseFloat(baseMetrics.cpuUsage || "50") + (Math.random() - 0.5) * 10
        ));
        const memoryUsage = Math.max(0, Math.min(100, 
          parseFloat(baseMetrics.memoryUsage || "60") + (Math.random() - 0.5) * 5
        ));
        const diskUsage = Math.max(0, Math.min(100, 
          parseFloat(baseMetrics.diskUsage || "40") + (Math.random() - 0.5) * 2
        ));

        const newMetrics = await storage.createMetrics({
          serverId: server.id,
          cpuUsage: cpuUsage.toFixed(1),
          memoryUsage: memoryUsage.toFixed(1),
          diskUsage: diskUsage.toFixed(1),
          networkIn: (Math.random() * 1000).toFixed(2),
          networkOut: (Math.random() * 1000).toFixed(2),
          uptime: "99.9",
          isOnline: true,
        });

        // Check for threshold alerts - only create if no existing unresolved alert exists
        const existingAlerts = await storage.getServerAlerts(server.id);
        const hasUnresolvedCpuAlert = existingAlerts.some(alert => 
          alert.alertType === "cpu" && !alert.isResolved
        );
        const hasUnresolvedMemoryAlert = existingAlerts.some(alert => 
          alert.alertType === "memory" && !alert.isResolved
        );
        const hasUnresolvedDiskAlert = existingAlerts.some(alert => 
          alert.alertType === "disk" && !alert.isResolved
        );

        if (cpuUsage > 80 && !hasUnresolvedCpuAlert) {
          await storage.createAlert({
            serverId: server.id,
            alertType: "cpu",
            severity: "critical",
            message: `CPU usage critical: ${cpuUsage.toFixed(1)}%`,
            threshold: "80",
            currentValue: cpuUsage.toFixed(1),
            isResolved: false,
          });
        }

        if (memoryUsage > 90 && !hasUnresolvedMemoryAlert) {
          await storage.createAlert({
            serverId: server.id,
            alertType: "memory",
            severity: "critical",
            message: `Memory usage critical: ${memoryUsage.toFixed(1)}%`,
            threshold: "90",
            currentValue: memoryUsage.toFixed(1),
            isResolved: false,
          });
        }

        if (diskUsage > 85 && !hasUnresolvedDiskAlert) {
          await storage.createAlert({
            serverId: server.id,
            alertType: "disk",
            severity: "warning",
            message: `Disk usage high: ${diskUsage.toFixed(1)}%`,
            threshold: "85",
            currentValue: diskUsage.toFixed(1),
            isResolved: false,
          });
        }
      }

      // Broadcast updates to all connected clients
      const updatedServers = await storage.getPublicServersWithLatestMetrics();
      const activeAlerts = await storage.getActiveAlerts();
      
      wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify({
            type: 'servers_update',
            data: updatedServers
          }));
          
          client.send(JSON.stringify({
            type: 'alerts_update',
            data: activeAlerts
          }));
        }
      });
    } catch (error) {
      console.error('Error updating metrics:', error);
    }
  }, 30000); // Update every 30 seconds

  return httpServer;
}
