import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { ServerWithMetrics } from "@shared/schema";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertTriangle, Terminal, BarChart3, Network, Clock, Settings, Trash2 } from "lucide-react";
import { SshTerminal } from "./ssh-terminal";
import { ServerForm } from "./server-form";
import { useToast } from "@/hooks/use-toast";

interface ServerCardProps {
  server: ServerWithMetrics;
  showActions?: boolean;
}

export function ServerCard({ server, showActions = false }: ServerCardProps) {
  const { toast } = useToast();
  const [isSshOpen, setIsSshOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);

  const deleteServerMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("DELETE", `/api/servers/${server.id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/servers"] });
      toast({
        title: "Servidor removido",
        description: "O servidor foi removido com sucesso.",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Falha ao remover o servidor. Tente novamente.",
        variant: "destructive",
      });
    }
  });

  const getStatusColor = () => {
    if (!server.metrics?.isOnline) return "bg-gray-500";
    
    const cpu = parseFloat(server.metrics.cpuUsage || "0");
    const memory = parseFloat(server.metrics.memoryUsage || "0");
    const disk = parseFloat(server.metrics.diskUsage || "0");
    
    if (cpu > 80 || memory > 90 || disk > 85) return "bg-red-500";
    if (cpu > 60 || memory > 70 || disk > 70) return "bg-orange-500";
    return "bg-green-500";
  };

  const getEnvironmentColor = (env: string) => {
    switch (env) {
      case "production": return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
      case "staging": return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
      case "development": return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      default: return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200";
    }
  };

  const getServerTypeColor = (type: string) => {
    switch (type) {
      case "web": return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
      case "database": return "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200";
      case "hybrid": return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      case "mail": return "bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200";
      case "backup": return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200";
      default: return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200";
    }
  };

  const getProgressColor = (value: number, type: string) => {
    if (type === "cpu" && value > 80) return "bg-red-500";
    if (type === "memory" && value > 90) return "bg-red-500";
    if (type === "disk" && value > 85) return "bg-red-500";
    if (value > 70) return "bg-orange-500";
    if (value > 50) return "bg-yellow-500";
    return "bg-green-500";
  };

  const hasAlerts = server.alerts?.some(alert => !alert.isResolved);
  const criticalAlerts = server.alerts?.filter(alert => !alert.isResolved && alert.severity === "critical") || [];

  return (
    <Card 
      className={`transition-all duration-200 hover:shadow-lg hover:-translate-y-1 ${
        !server.metrics?.isOnline ? "opacity-75" : ""
      } ${criticalAlerts.length > 0 ? "border-red-200 dark:border-red-800" : ""}`}
      data-testid={`server-card-${server.id}`}
    >
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className={`w-2 h-2 rounded-full ${getStatusColor()}`} />
            <h3 className="font-semibold text-foreground">{server.name}</h3>
          </div>
          <div className="flex space-x-2">
            <Badge className={getServerTypeColor(server.serverType)}>
              {server.serverType}
            </Badge>
            <Badge className={getEnvironmentColor(server.environment)}>
              {server.environment}
            </Badge>
          </div>
        </div>

        <div className="space-y-2 text-sm text-muted-foreground">
          <div className="flex items-center">
            <Network className="w-4 h-4 mr-2" />
            <span>{server.ip}</span>
            <Terminal className="w-4 h-4 ml-4 mr-2" />
            <span>:{server.sshPort}</span>
          </div>
          <div className="flex items-center">
            <Clock className="w-4 h-4 mr-2" />
            <span>Uptime: </span>
            <span className={`ml-1 ${server.metrics?.isOnline ? 'text-green-600' : 'text-red-600'}`}>
              {server.metrics?.uptime || '0'}%
            </span>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {server.metrics?.isOnline ? (
          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-muted-foreground">CPU</span>
                <span className="font-medium">{server.metrics.cpuUsage}%</span>
              </div>
              <Progress 
                value={parseFloat(server.metrics.cpuUsage || "0")} 
                className="h-2"
                style={{
                  backgroundColor: "var(--secondary)",
                }}
              />
            </div>
            
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-muted-foreground">RAM</span>
                <span className="font-medium">{server.metrics.memoryUsage}%</span>
              </div>
              <Progress 
                value={parseFloat(server.metrics.memoryUsage || "0")} 
                className="h-2"
              />
            </div>
            
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-muted-foreground">Disco</span>
                <span className="font-medium">{server.metrics.diskUsage}%</span>
              </div>
              <Progress 
                value={parseFloat(server.metrics.diskUsage || "0")} 
                className="h-2"
              />
            </div>
          </div>
        ) : (
          <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-md p-3">
            <div className="flex items-center">
              <AlertTriangle className="w-4 h-4 text-red-500 mr-2" />
              <span className="text-sm text-red-700 dark:text-red-300">
                Servidor offline
              </span>
            </div>
          </div>
        )}

        {hasAlerts && (
          <div className="bg-orange-50 dark:bg-orange-950 border border-orange-200 dark:border-orange-800 rounded-md p-3">
            <div className="flex items-center">
              <AlertTriangle className="w-4 h-4 text-orange-500 mr-2" />
              <span className="text-sm text-orange-700 dark:text-orange-300">
                {criticalAlerts.length > 0 
                  ? `${criticalAlerts.length} alerta(s) crítico(s)`
                  : "Alertas ativos"
                }
              </span>
            </div>
          </div>
        )}

        <div className="flex space-x-2 pt-4 border-t border-border">
          {server.metrics?.isOnline ? (
            <Dialog open={isSshOpen} onOpenChange={setIsSshOpen}>
              <DialogTrigger asChild>
                <Button 
                  className="flex-1" 
                  size="sm"
                  data-testid={`button-ssh-${server.id}`}
                >
                  <Terminal className="w-4 h-4 mr-2" />
                  SSH
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl max-h-[80vh]">
                <DialogHeader>
                  <DialogTitle>SSH: {server.name} ({server.ip})</DialogTitle>
                </DialogHeader>
                <SshTerminal server={server} />
              </DialogContent>
            </Dialog>
          ) : (
            <Button 
              className="flex-1" 
              size="sm" 
              disabled
              data-testid={`button-ssh-disabled-${server.id}`}
            >
              <Terminal className="w-4 h-4 mr-2" />
              SSH
            </Button>
          )}
          
          <Button 
            variant="outline" 
            className="flex-1" 
            size="sm"
            data-testid={`button-metrics-${server.id}`}
          >
            <BarChart3 className="w-4 h-4 mr-2" />
            Métricas
          </Button>

          {showActions && (
            <>
              <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
                <DialogTrigger asChild>
                  <Button 
                    variant="outline" 
                    size="sm"
                    data-testid={`button-edit-${server.id}`}
                  >
                    <Settings className="w-4 h-4" />
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Editar Servidor</DialogTitle>
                  </DialogHeader>
                  <ServerForm 
                    server={server} 
                    onSuccess={() => setIsEditOpen(false)} 
                  />
                </DialogContent>
              </Dialog>

              <Button
                variant="outline"
                size="sm"
                onClick={() => deleteServerMutation.mutate()}
                disabled={deleteServerMutation.isPending}
                data-testid={`button-delete-${server.id}`}
              >
                <Trash2 className="w-4 h-4 text-red-500" />
              </Button>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
