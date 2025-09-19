import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Alert } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, CheckCircle, Clock, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function Alerts() {
  const { toast } = useToast();

  const { data: alerts, isLoading } = useQuery<Alert[]>({
    queryKey: ["/api/alerts"]
  });

  const resolveAlertMutation = useMutation({
    mutationFn: async (alertId: string) => {
      return apiRequest("PATCH", `/api/alerts/${alertId}/resolve`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/alerts"] });
      toast({
        title: "Alerta resolvido",
        description: "O alerta foi marcado como resolvido com sucesso.",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Falha ao resolver o alerta. Tente novamente.",
        variant: "destructive",
      });
    }
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const activeAlerts = alerts?.filter(alert => !alert.isResolved) || [];
  const resolvedAlerts = alerts?.filter(alert => alert.isResolved) || [];
  const criticalAlerts = activeAlerts.filter(alert => alert.severity === "critical");
  const warningAlerts = activeAlerts.filter(alert => alert.severity === "warning");

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case "critical":
        return <AlertTriangle className="w-4 h-4 text-red-500" />;
      case "warning":
        return <AlertTriangle className="w-4 h-4 text-orange-500" />;
      default:
        return <Clock className="w-4 h-4 text-blue-500" />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "critical":
        return "destructive";
      case "warning":
        return "secondary";
      default:
        return "default";
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="bg-card border border-border rounded-lg p-6 shadow-sm">
        <h1 className="text-2xl font-bold text-foreground">Alertas do Sistema</h1>
        <p className="text-muted-foreground">
          {activeAlerts.length} alertas ativos • {criticalAlerts.length} críticos • {warningAlerts.length} avisos
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Alertas Críticos</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{criticalAlerts.length}</div>
            <p className="text-xs text-muted-foreground">Requer ação imediata</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Alertas de Aviso</CardTitle>
            <AlertTriangle className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{warningAlerts.length}</div>
            <p className="text-xs text-muted-foreground">Monitoramento necessário</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Resolvidos Hoje</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{resolvedAlerts.length}</div>
            <p className="text-xs text-muted-foreground">Alertas resolvidos</p>
          </CardContent>
        </Card>
      </div>

      {/* Active Alerts */}
      <Card>
        <CardHeader>
          <CardTitle>Alertas Ativos</CardTitle>
        </CardHeader>
        <CardContent>
          {activeAlerts.length === 0 ? (
            <div className="text-center py-8">
              <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
              <p className="text-muted-foreground">Nenhum alerta ativo no momento!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {activeAlerts.map((alert) => (
                <div 
                  key={alert.id} 
                  className="flex items-center justify-between p-4 border border-border rounded-lg"
                  data-testid={`alert-${alert.id}`}
                >
                  <div className="flex items-center space-x-4">
                    {getSeverityIcon(alert.severity)}
                    <div>
                      <div className="flex items-center space-x-2">
                        <h3 className="font-medium">{alert.message}</h3>
                        <Badge variant={getSeverityColor(alert.severity) as any}>
                          {alert.severity}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Valor atual: {alert.currentValue} • Limite: {alert.threshold}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(alert.createdAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => resolveAlertMutation.mutate(alert.id)}
                    disabled={resolveAlertMutation.isPending}
                    data-testid={`button-resolve-${alert.id}`}
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Resolver
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Resolved Alerts */}
      {resolvedAlerts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Alertas Resolvidos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {resolvedAlerts.map((alert) => (
                <div 
                  key={alert.id} 
                  className="flex items-center justify-between p-4 border border-border rounded-lg opacity-75"
                  data-testid={`resolved-alert-${alert.id}`}
                >
                  <div className="flex items-center space-x-4">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <div>
                      <div className="flex items-center space-x-2">
                        <h3 className="font-medium">{alert.message}</h3>
                        <Badge variant="outline">Resolvido</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Resolvido em: {alert.resolvedAt ? new Date(alert.resolvedAt).toLocaleString() : 'N/A'}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
