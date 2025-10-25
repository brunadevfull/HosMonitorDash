import { type TelemetryEvent } from "@shared/schema";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Activity, AlertTriangle, CheckCircle2, RefreshCw, PlusCircle } from "lucide-react";

interface TelemetryTimelineProps {
  events?: TelemetryEvent[];
  onRefresh: () => void;
  onInject?: () => void;
  isRefreshing?: boolean;
  isInjecting?: boolean;
  servers: { id: string; name: string }[];
}

function getStatusBadge(status: TelemetryEvent["status"]) {
  switch (status) {
    case "critical":
      return "bg-red-500/10 text-red-500";
    case "warning":
      return "bg-amber-500/10 text-amber-500";
    case "ok":
    default:
      return "bg-emerald-500/10 text-emerald-500";
  }
}

function getStatusIcon(status: TelemetryEvent["status"]) {
  switch (status) {
    case "critical":
      return <AlertTriangle className="w-4 h-4 text-red-500" />;
    case "warning":
      return <Activity className="w-4 h-4 text-amber-500" />;
    case "ok":
    default:
      return <CheckCircle2 className="w-4 h-4 text-emerald-500" />;
  }
}

export function TelemetryTimeline({
  events = [],
  onRefresh,
  onInject,
  isRefreshing = false,
  isInjecting = false,
  servers,
}: TelemetryTimelineProps) {
  return (
    <Card className="border-border h-full">
      <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle className="flex items-center gap-2 text-foreground">
            <Activity className="w-5 h-5 text-primary" />
            Telemetria em tempo real
          </CardTitle>
          <CardDescription>Últimos eventos coletados dos servidores monitorados.</CardDescription>
        </div>
        <div className="flex gap-2">
          {onInject && (
            <Button variant="outline" size="sm" onClick={onInject} disabled={isInjecting}>
              <PlusCircle className="w-4 h-4 mr-2" /> Injetar teste
            </Button>
          )}
          <Button variant="secondary" size="sm" onClick={onRefresh} disabled={isRefreshing}>
            <RefreshCw className="w-4 h-4 mr-2" /> Atualizar
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[360px] pr-4">
          <div className="space-y-4">
            {events.length === 0 && (
              <div className="text-sm text-muted-foreground">
                Nenhum evento de telemetria disponível.
              </div>
            )}
            {events.map(event => {
              const serverName = servers.find(server => server.id === event.serverId)?.name ?? event.serverId;
              return (
                <div
                  key={event.id}
                  className="border border-border rounded-lg p-4 bg-card/40 shadow-sm"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(event.status)}
                      <span className="font-medium text-foreground">{event.metric}</span>
                      <Badge className={getStatusBadge(event.status)}>{event.status}</Badge>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {new Date(event.recordedAt).toLocaleString()}
                    </span>
                  </div>
                  <div className="mt-2 text-sm text-muted-foreground">
                    <span className="font-medium text-foreground">Servidor:</span> {serverName}
                  </div>
                  <div className="mt-1 text-sm text-muted-foreground">
                    <span className="font-medium text-foreground">Valor:</span> {event.value} {event.unit}
                  </div>
                  <p className="mt-2 text-sm text-foreground">{event.message}</p>
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
