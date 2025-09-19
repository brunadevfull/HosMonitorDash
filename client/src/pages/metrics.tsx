import { useServers } from "@/hooks/use-servers";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, HardDrive, MemoryStick, Network } from "lucide-react";

export default function Metrics() {
  const { servers, isLoading } = useServers();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const onlineServers = servers?.filter(server => server.metrics?.isOnline) || [];
  
  const avgMetrics = {
    cpu: onlineServers.reduce((acc, server) => acc + parseFloat(server.metrics?.cpuUsage || "0"), 0) / onlineServers.length || 0,
    memory: onlineServers.reduce((acc, server) => acc + parseFloat(server.metrics?.memoryUsage || "0"), 0) / onlineServers.length || 0,
    disk: onlineServers.reduce((acc, server) => acc + parseFloat(server.metrics?.diskUsage || "0"), 0) / onlineServers.length || 0,
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="bg-card border border-border rounded-lg p-6 shadow-sm">
        <h1 className="text-2xl font-bold text-foreground">Métricas do Sistema</h1>
        <p className="text-muted-foreground">
          Visualização detalhada das métricas de performance dos servidores
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">CPU Média</CardTitle>
            <Activity className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{avgMetrics.cpu.toFixed(1)}%</div>
            <div className="w-full bg-secondary rounded-full h-2 mt-2">
              <div 
                className="bg-blue-500 h-2 rounded-full transition-all" 
                style={{ width: `${avgMetrics.cpu}%` }}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Memória Média</CardTitle>
            <MemoryStick className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{avgMetrics.memory.toFixed(1)}%</div>
            <div className="w-full bg-secondary rounded-full h-2 mt-2">
              <div 
                className="bg-green-500 h-2 rounded-full transition-all" 
                style={{ width: `${avgMetrics.memory}%` }}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Disco Médio</CardTitle>
            <HardDrive className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{avgMetrics.disk.toFixed(1)}%</div>
            <div className="w-full bg-secondary rounded-full h-2 mt-2">
              <div 
                className="bg-orange-500 h-2 rounded-full transition-all" 
                style={{ width: `${avgMetrics.disk}%` }}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Server Metrics Table */}
      <Card>
        <CardHeader>
          <CardTitle>Métricas Detalhadas por Servidor</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full" data-testid="metrics-table">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">Servidor</th>
                  <th className="text-left p-2">Status</th>
                  <th className="text-left p-2">CPU</th>
                  <th className="text-left p-2">Memória</th>
                  <th className="text-left p-2">Disco</th>
                  <th className="text-left p-2">Uptime</th>
                </tr>
              </thead>
              <tbody>
                {servers?.map((server) => (
                  <tr key={server.id} className="border-b" data-testid={`server-row-${server.id}`}>
                    <td className="p-2">
                      <div>
                        <div className="font-medium">{server.name}</div>
                        <div className="text-sm text-muted-foreground">{server.ip}</div>
                      </div>
                    </td>
                    <td className="p-2">
                      <div className="flex items-center">
                        <div 
                          className={`w-2 h-2 rounded-full mr-2 ${
                            server.metrics?.isOnline ? 'bg-green-500' : 'bg-red-500'
                          }`}
                        />
                        {server.metrics?.isOnline ? 'Online' : 'Offline'}
                      </div>
                    </td>
                    <td className="p-2">
                      <div className="flex items-center space-x-2">
                        <span>{server.metrics?.cpuUsage || '0'}%</span>
                        <div className="w-12 bg-secondary rounded-full h-1">
                          <div 
                            className="bg-blue-500 h-1 rounded-full transition-all" 
                            style={{ width: `${server.metrics?.cpuUsage || 0}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="p-2">
                      <div className="flex items-center space-x-2">
                        <span>{server.metrics?.memoryUsage || '0'}%</span>
                        <div className="w-12 bg-secondary rounded-full h-1">
                          <div 
                            className="bg-green-500 h-1 rounded-full transition-all" 
                            style={{ width: `${server.metrics?.memoryUsage || 0}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="p-2">
                      <div className="flex items-center space-x-2">
                        <span>{server.metrics?.diskUsage || '0'}%</span>
                        <div className="w-12 bg-secondary rounded-full h-1">
                          <div 
                            className="bg-orange-500 h-1 rounded-full transition-all" 
                            style={{ width: `${server.metrics?.diskUsage || 0}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="p-2 text-green-600">
                      {server.metrics?.uptime || '0'}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Histórico de CPU</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-900 rounded-lg flex items-center justify-center">
              <span className="text-muted-foreground font-medium">Gráfico de histórico de CPU</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Histórico de Memória</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-900 rounded-lg flex items-center justify-center">
              <span className="text-muted-foreground font-medium">Gráfico de histórico de memória</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
