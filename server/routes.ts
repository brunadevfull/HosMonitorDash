import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { insertServerSchema, insertMetricsSchema, insertAlertSchema } from "@shared/schema";
import { randomUUID } from "crypto";

export async function registerRoutes(app: Express): Promise<Server> {
  // Server management routes
  app.get("/api/servers", async (req, res) => {
    try {
      const servers = await storage.getServersWithLatestMetrics();
      res.json(servers);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch servers" });
    }
  });

  app.get("/api/servers/:id", async (req, res) => {
    try {
      const server = await storage.getServer(req.params.id);
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
      res.status(201).json(server);
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
      res.json(server);
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
            const servers = await storage.getServersWithLatestMetrics();
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
      const updatedServers = await storage.getServersWithLatestMetrics();
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
