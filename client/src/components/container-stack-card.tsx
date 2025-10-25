import { type ContainerActionInput, type ContainerStack } from "@shared/schema";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Play, Square, RefreshCw, DownloadCloud, ArrowRightCircle, AlertTriangle } from "lucide-react";

interface ContainerStackCardProps {
  stack: ContainerStack;
  onAction: (stackId: string, action: ContainerActionInput) => void;
  isProcessing?: boolean;
}

function getStackStatusVariant(status: ContainerStack["status"]) {
  switch (status) {
    case "running":
      return "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-200";
    case "degraded":
      return "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-200";
    case "stopped":
    default:
      return "bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-200";
  }
}

function getServiceStateVariant(state: ContainerStack["services"][number]["state"]) {
  switch (state) {
    case "running":
      return "bg-emerald-500/10 text-emerald-500";
    case "restarting":
      return "bg-sky-500/10 text-sky-500";
    case "error":
      return "bg-red-500/10 text-red-500";
    case "stopped":
    default:
      return "bg-slate-500/10 text-slate-500";
  }
}

export function ContainerStackCard({ stack, onAction, isProcessing = false }: ContainerStackCardProps) {
  const handleAction = (action: ContainerActionInput) => {
    onAction(stack.id, action);
  };

  const handleServiceRestart = (serviceName: string) => {
    handleAction({ action: "restart", services: [serviceName] });
  };

  return (
    <Card className="border-border shadow-sm">
      <CardHeader className="space-y-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl font-semibold text-foreground flex items-center gap-2">
            {stack.name}
            <Badge className={getStackStatusVariant(stack.status)}>{stack.status}</Badge>
          </CardTitle>
          <Badge variant="outline" className="text-xs uppercase tracking-wide">
            {stack.projectName}
          </Badge>
        </div>
        <CardDescription className="flex flex-wrap gap-4 text-sm">
          <span className="font-medium text-foreground">Compose:</span>
          <span className="text-muted-foreground">{stack.path}</span>
          <span className="text-muted-foreground">Atualizado {new Date(stack.updatedAt).toLocaleTimeString()}</span>
        </CardDescription>
        {stack.lastAction && (
          <div className="flex items-center text-xs text-muted-foreground gap-2">
            <ArrowRightCircle className="w-4 h-4" />
            <span>{stack.lastAction}</span>
          </div>
        )}
        {stack.status === "degraded" && (
          <div className="flex items-center text-xs text-amber-600 dark:text-amber-300 gap-2">
            <AlertTriangle className="w-4 h-4" />
            <span>Verifique serviços críticos deste stack</span>
          </div>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            disabled={isProcessing || stack.status === "running"}
            onClick={() => handleAction({ action: "up" })}
          >
            <Play className="w-4 h-4 mr-2" /> Iniciar
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={isProcessing || stack.status === "stopped"}
            onClick={() => handleAction({ action: "down" })}
          >
            <Square className="w-4 h-4 mr-2" /> Parar
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={isProcessing}
            onClick={() => handleAction({ action: "restart" })}
          >
            <RefreshCw className="w-4 h-4 mr-2" /> Reiniciar
          </Button>
          <Button
            size="sm"
            variant="secondary"
            disabled={isProcessing}
            onClick={() => handleAction({ action: "pull" })}
          >
            <DownloadCloud className="w-4 h-4 mr-2" /> Atualizar imagens
          </Button>
        </div>

        <Separator />

        <div className="space-y-4">
          {stack.services.map(service => (
            <div
              key={service.name}
              className="flex flex-col gap-2 rounded-lg border border-border p-4 bg-card/40"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-foreground">{service.name}</span>
                    <Badge className={getServiceStateVariant(service.state)}>{service.state}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">{service.image}</p>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>{service.replicas} réplica(s)</span>
                  {service.ports.length > 0 && (
                    <span>Portas: {service.ports.join(", ")}</span>
                  )}
                </div>
              </div>
              <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <p className="text-sm text-muted-foreground">{service.lastEvent}</p>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={isProcessing}
                    onClick={() => handleServiceRestart(service.name)}
                  >
                    <RefreshCw className="w-4 h-4 mr-2" /> Reiniciar serviço
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
