import { type ServiceActionInput, type ServiceProcess } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Clock, Link2, Power, PowerOff, RefreshCw, ServerCog } from "lucide-react";

interface ServiceStatusCardProps {
  service: ServiceProcess;
  onAction: (serviceId: string, action: ServiceActionInput) => void;
  isProcessing?: boolean;
}

function getStatusBadge(status: ServiceProcess["status"]) {
  switch (status) {
    case "active":
      return "bg-emerald-500/10 text-emerald-500";
    case "restarting":
      return "bg-sky-500/10 text-sky-500";
    case "failed":
      return "bg-red-500/10 text-red-500";
    case "inactive":
    default:
      return "bg-slate-500/10 text-slate-500";
  }
}

export function ServiceStatusCard({ service, onAction, isProcessing = false }: ServiceStatusCardProps) {
  const handleAction = (action: ServiceActionInput) => {
    onAction(service.id, action);
  };

  return (
    <Card className="border-border">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold text-foreground flex items-center gap-2">
            <ServerCog className="w-5 h-5 text-primary" />
            {service.name}
          </CardTitle>
          <Badge className={getStatusBadge(service.status)}>{service.status}</Badge>
        </div>
        <p className="text-sm text-muted-foreground">{service.description}</p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4" />
            <span>Uptime: {service.uptime}</span>
          </div>
          <div className="flex items-center gap-2">
            <Link2 className="w-4 h-4" />
            <span>Gerenciado por: {service.manager}</span>
          </div>
          <div className="flex items-center gap-2">
            <RefreshCw className="w-4 h-4" />
            <span>Último restart: {service.lastRestart ? new Date(service.lastRestart).toLocaleString() : "n/d"}</span>
          </div>
          <div className="flex items-center gap-2">
            <Link2 className="w-4 h-4 rotate-45" />
            <span>Dependências: {service.dependencies.length > 0 ? service.dependencies.join(", ") : "nenhuma"}</span>
          </div>
        </div>

        <Separator />

        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            disabled={isProcessing || service.status === "active"}
            onClick={() => handleAction({ action: "start" })}
          >
            <Power className="w-4 h-4 mr-2" /> Iniciar
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={isProcessing || service.status === "inactive"}
            onClick={() => handleAction({ action: "stop" })}
          >
            <PowerOff className="w-4 h-4 mr-2" /> Parar
          </Button>
          <Button
            size="sm"
            variant="secondary"
            disabled={isProcessing}
            onClick={() => handleAction({ action: "restart" })}
          >
            <RefreshCw className="w-4 h-4 mr-2" /> Reiniciar
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
