import { useMemo } from "react";
import { useMutation } from "@tanstack/react-query";
import { useContainerStacks, useServiceProcesses, useBackupJobs, useLogExportTasks, useTelemetryEvents } from "@/hooks/use-operations";
import { useServers } from "@/hooks/use-servers";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { ContainerStackCard } from "@/components/container-stack-card";
import { ServiceStatusCard } from "@/components/service-status-card";
import { BackupAndLogTools } from "@/components/backup-tools";
import { TelemetryTimeline } from "@/components/telemetry-timeline";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { type ContainerActionInput, type ServiceActionInput, type CreateBackupInput, type CreateLogExportInput, type RecordTelemetryInput } from "@shared/schema";
import { Activity, Boxes, Database, ShieldAlert } from "lucide-react";

export default function Orchestration() {
  const { toast } = useToast();
  const { servers: registeredServers } = useServers();
  const { data: containerStacks, isLoading: isStacksLoading } = useContainerStacks();
  const { data: serviceProcesses, isLoading: isServicesLoading } = useServiceProcesses();
  const { data: backupJobs } = useBackupJobs();
  const { data: logExportTasks } = useLogExportTasks();
  const {
    data: telemetryEvents,
    refetch: refetchTelemetry,
    isFetching: isTelemetryFetching,
  } = useTelemetryEvents(50);

  const serverOptions = useMemo(
    () => (registeredServers || []).map(server => ({ id: server.id, name: server.name })),
    [registeredServers]
  );

  const containerActionMutation = useMutation<unknown, Error, { stackId: string; action: ContainerActionInput }>({
    mutationFn: async ({ stackId, action }) => {
      const res = await apiRequest("POST", `/api/container-stacks/${stackId}/actions`, action);
      return res.json();
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/container-stacks"] });
      toast({
        title: "Ação executada",
        description: `Stack atualizado com a ação ${variables.action.action}.`,
      });
    },
    onError: () => {
      toast({
        title: "Falha ao executar ação",
        description: "Não foi possível aplicar a ação no stack.",
        variant: "destructive",
      });
    },
  });

  const serviceActionMutation = useMutation<unknown, Error, { serviceId: string; action: ServiceActionInput }>({
    mutationFn: async ({ serviceId, action }) => {
      const res = await apiRequest("POST", `/api/services/${serviceId}/actions`, action);
      return res.json();
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/services"] });
      toast({
        title: "Serviço atualizado",
        description: `Ação ${variables.action.action} aplicada com sucesso.`,
      });
    },
    onError: () => {
      toast({
        title: "Erro no serviço",
        description: "Não foi possível atualizar o serviço. Tente novamente.",
        variant: "destructive",
      });
    },
  });

  const backupMutation = useMutation<unknown, Error, CreateBackupInput>({
    mutationFn: async payload => {
      const res = await apiRequest("POST", "/api/maintenance/backups", payload);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/maintenance/backups"] });
      toast({
        title: "Backup disparado",
        description: "Backup executado com sucesso.",
      });
    },
    onError: () => {
      toast({
        title: "Erro ao criar backup",
        description: "Não foi possível iniciar o backup.",
        variant: "destructive",
      });
    },
  });

  const logExportMutation = useMutation<unknown, Error, CreateLogExportInput>({
    mutationFn: async payload => {
      const res = await apiRequest("POST", "/api/maintenance/logs/export", payload);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/maintenance/log-exports"] });
      toast({
        title: "Exportação iniciada",
        description: "Os logs estão prontos para download.",
      });
    },
    onError: () => {
      toast({
        title: "Erro ao exportar logs",
        description: "Não foi possível gerar o pacote de logs.",
        variant: "destructive",
      });
    },
  });

  const telemetryMutation = useMutation<unknown, Error, RecordTelemetryInput>({
    mutationFn: async payload => {
      const res = await apiRequest("POST", "/api/telemetry/events", payload);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/telemetry/events?limit=50"] });
      toast({
        title: "Evento registrado",
        description: "Um novo evento de telemetria foi inserido.",
      });
    },
    onError: () => {
      toast({
        title: "Erro de telemetria",
        description: "Não foi possível registrar o evento.",
        variant: "destructive",
      });
    },
  });

  const runningStacks = containerStacks?.filter(stack => stack.status === "running").length ?? 0;
  const degradedStacks = containerStacks?.filter(stack => stack.status === "degraded").length ?? 0;
  const activeServices = serviceProcesses?.filter(service => service.status === "active").length ?? 0;
  const criticalTelemetry = telemetryEvents?.filter(event => event.status === "critical").length ?? 0;
  const containerCount = containerStacks?.length ?? 0;
  const serviceCount = serviceProcesses?.length ?? 0;

  const handleInjectTelemetry = () => {
    const referenceServer = serverOptions[0]?.id ?? "stack-papem";
    const payload: RecordTelemetryInput = {
      serverId: referenceServer,
      metric: "docker.healthcheck",
      value: Math.round(Math.random() * 100),
      unit: "ms",
      status: Math.random() > 0.8 ? "warning" : "ok",
      message: "Evento gerado manualmente pelo painel",
    };
    telemetryMutation.mutate(payload);
  };

  return (
    <div className="p-6 space-y-6">
      <Card className="border-border shadow-sm">
        <CardContent className="py-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground">Orquestração e Operações</h1>
              <p className="text-muted-foreground">
                Controle de stacks Docker, serviços internos, backups e telemetria do PAPEM.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              <div className="rounded-lg border border-border p-3 bg-muted/20">
                <div className="flex items-center gap-2 text-xs uppercase text-muted-foreground">
                  <Boxes className="w-4 h-4 text-primary" /> Stacks ativos
                </div>
                <div className="text-2xl font-semibold text-foreground">{runningStacks}</div>
              </div>
              <div className="rounded-lg border border-border p-3 bg-muted/20">
                <div className="flex items-center gap-2 text-xs uppercase text-muted-foreground">
                  <ShieldAlert className="w-4 h-4 text-amber-500" /> Stacks degradados
                </div>
                <div className="text-2xl font-semibold text-foreground">{degradedStacks}</div>
              </div>
              <div className="rounded-lg border border-border p-3 bg-muted/20">
                <div className="flex items-center gap-2 text-xs uppercase text-muted-foreground">
                  <Activity className="w-4 h-4 text-primary" /> Serviços ativos
                </div>
                <div className="text-2xl font-semibold text-foreground">{activeServices}</div>
              </div>
              <div className="rounded-lg border border-border p-3 bg-muted/20">
                <div className="flex items-center gap-2 text-xs uppercase text-muted-foreground">
                  <Database className="w-4 h-4 text-primary" /> Eventos críticos
                </div>
                <div className="text-2xl font-semibold text-foreground">{criticalTelemetry}</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="containers" className="space-y-4">
        <TabsList className="grid w-full grid-cols-1 gap-2 sm:grid-cols-4">
          <TabsTrigger value="containers">Containers</TabsTrigger>
          <TabsTrigger value="services">Serviços internos</TabsTrigger>
          <TabsTrigger value="backups">Backups & Logs</TabsTrigger>
          <TabsTrigger value="telemetry">Telemetria</TabsTrigger>
        </TabsList>

        <TabsContent value="containers">
          {isStacksLoading && containerCount === 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[...Array(2)].map((_, index) => (
                <Skeleton key={index} className="h-64 w-full" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {containerStacks?.map(stack => (
                <ContainerStackCard
                  key={stack.id}
                  stack={stack}
                  onAction={(stackId, action) => containerActionMutation.mutate({ stackId, action })}
                  isProcessing={
                    containerActionMutation.isPending &&
                    containerActionMutation.variables?.stackId === stack.id
                  }
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="services">
          {isServicesLoading && serviceCount === 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[...Array(2)].map((_, index) => (
                <Skeleton key={index} className="h-48 w-full" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {serviceProcesses?.map(service => (
                <ServiceStatusCard
                  key={service.id}
                  service={service}
                  onAction={(serviceId, action) => serviceActionMutation.mutate({ serviceId, action })}
                  isProcessing={
                    serviceActionMutation.isPending &&
                    serviceActionMutation.variables?.serviceId === service.id
                  }
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="backups">
          <BackupAndLogTools
            backups={backupJobs}
            logExports={logExportTasks}
            onCreateBackup={payload => backupMutation.mutate(payload)}
            onExportLogs={payload => logExportMutation.mutate(payload)}
            isCreatingBackup={backupMutation.isPending}
            isExportingLogs={logExportMutation.isPending}
            servers={serverOptions}
          />
        </TabsContent>

        <TabsContent value="telemetry">
          <TelemetryTimeline
            events={telemetryEvents}
            onRefresh={() => refetchTelemetry()}
            onInject={handleInjectTelemetry}
            isRefreshing={isTelemetryFetching}
            isInjecting={telemetryMutation.isPending}
            servers={serverOptions}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
