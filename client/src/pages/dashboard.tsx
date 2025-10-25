import { useState } from "react";
import { useServers } from "@/hooks/use-servers";
import { MetricCard } from "@/components/metric-card";
import { ServerCard } from "@/components/server-card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ServerForm } from "@/components/server-form";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Download, Plus, Server, Activity, AlertTriangle, BarChart3 } from "lucide-react";

export default function Dashboard() {
  const { servers, isLoading } = useServers();
  const [activeEnvironment, setActiveEnvironment] = useState("production");
  const [isAddServerOpen, setIsAddServerOpen] = useState(false);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const safeServers = servers ?? [];
  const filteredServers = safeServers.filter(server => server.environment === activeEnvironment);
  const onlineServers = safeServers.filter(server => server.metrics?.isOnline);
  const totalServers = safeServers.length;
  const activeAlerts = safeServers.reduce((acc, server) => acc + (server.alerts?.filter(alert => !alert.isResolved).length || 0), 0);

  const avgCpu = safeServers.length > 0
    ? safeServers.reduce((acc, server) => {
        const cpu = parseFloat(server.metrics?.cpuUsage || "0");
        return acc + cpu;
      }, 0) / safeServers.length
    : 0;

  const avgMemory = safeServers.length > 0
    ? safeServers.reduce((acc, server) => {
        const memory = parseFloat(server.metrics?.memoryUsage || "0");
        return acc + memory;
      }, 0) / safeServers.length
    : 0;

  const criticalAlerts = servers?.reduce((acc, server) => {
    const critical = server.alerts?.filter(alert => !alert.isResolved && alert.severity === "critical").length || 0;
    return acc + critical;
  }, 0) || 0;

  const warningAlerts = activeAlerts - criticalAlerts;

  const environmentCounts = {
    production: safeServers.filter(s => s.environment === "production").length,
    staging: safeServers.filter(s => s.environment === "staging").length,
    development: safeServers.filter(s => s.environment === "development").length,
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="bg-card border border-border rounded-lg p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Dashboard de Monitoramento</h1>
            <p className="text-muted-foreground">
              Última atualização: {new Date().toLocaleTimeString()}
            </p>
          </div>
          <div className="flex space-x-3">
            <Button variant="outline" data-testid="button-export">
              <Download className="w-4 h-4 mr-2" />
              Exportar
            </Button>
            <Dialog open={isAddServerOpen} onOpenChange={setIsAddServerOpen}>
              <DialogTrigger asChild>
                <Button data-testid="button-add-server">
                  <Plus className="w-4 h-4 mr-2" />
                  Adicionar Servidor
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Adicionar Novo Servidor</DialogTitle>
                </DialogHeader>
                <ServerForm onSuccess={() => setIsAddServerOpen(false)} />
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>

      {/* Metrics Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Total de Servidores"
          value={totalServers.toString()}
          icon={<Server className="w-5 h-5 text-primary" />}
          subtitle={`${onlineServers.length} online`}
          trend="positive"
          data-testid="metric-total-servers"
        />
        <MetricCard
          title="CPU Média"
          value={`${Math.round(avgCpu)}%`}
          icon={<Activity className="w-5 h-5 text-blue-500" />}
          progress={avgCpu}
          progressColor="bg-blue-500"
          data-testid="metric-avg-cpu"
        />
        <MetricCard
          title="Memória Média"
          value={`${Math.round(avgMemory)}%`}
          icon={<BarChart3 className="w-5 h-5 text-green-500" />}
          progress={avgMemory}
          progressColor="bg-green-500"
          data-testid="metric-avg-memory"
        />
        <MetricCard
          title="Alertas Ativos"
          value={activeAlerts.toString()}
          icon={<AlertTriangle className="w-5 h-5 text-orange-500" />}
          subtitle={`${criticalAlerts} crítico, ${warningAlerts} avisos`}
          trend={activeAlerts > 0 ? "negative" : "neutral"}
          data-testid="metric-active-alerts"
        />
      </div>

      {/* Environment Tabs */}
      <div className="bg-card border border-border rounded-lg p-6 shadow-sm">
        <Tabs value={activeEnvironment} onValueChange={setActiveEnvironment}>
          <TabsList className="grid w-fit grid-cols-3">
            <TabsTrigger value="production" data-testid="tab-production">
              Produção ({environmentCounts.production})
            </TabsTrigger>
            <TabsTrigger value="staging" data-testid="tab-staging">
              Homologação ({environmentCounts.staging})
            </TabsTrigger>
            <TabsTrigger value="development" data-testid="tab-development">
              Desenvolvimento ({environmentCounts.development})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="production" className="mt-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
              {filteredServers.map((server) => (
                <ServerCard key={server.id} server={server} />
              ))}
            </div>
          </TabsContent>

          <TabsContent value="staging" className="mt-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
              {filteredServers.map((server) => (
                <ServerCard key={server.id} server={server} />
              ))}
            </div>
          </TabsContent>

          <TabsContent value="development" className="mt-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
              {filteredServers.map((server) => (
                <ServerCard key={server.id} server={server} />
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-card border border-border rounded-lg p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-foreground mb-4">Uso de CPU (Últimas 24h)</h3>
          <div className="h-48 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-900 rounded-lg flex items-center justify-center">
            <span className="text-muted-foreground font-medium">Gráfico de CPU em tempo real</span>
          </div>
        </div>
        
        <div className="bg-card border border-border rounded-lg p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-foreground mb-4">Distribuição por Ambiente</h3>
          <div className="h-48 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-900 rounded-lg flex items-center justify-center">
            <span className="text-muted-foreground font-medium">Gráfico de distribuição de servidores</span>
          </div>
        </div>
      </div>
    </div>
  );
}
