import { useEffect, useState } from "react";
import { type BackupJob, type CreateBackupInput, type CreateLogExportInput, type LogExportTask } from "@shared/schema";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Download, HardDrive, History } from "lucide-react";

interface BackupAndLogToolsProps {
  backups?: BackupJob[];
  logExports?: LogExportTask[];
  onCreateBackup: (payload: CreateBackupInput) => void;
  onExportLogs: (payload: CreateLogExportInput) => void;
  isCreatingBackup?: boolean;
  isExportingLogs?: boolean;
  servers: { id: string; name: string }[];
}

export function BackupAndLogTools({
  backups = [],
  logExports = [],
  onCreateBackup,
  onExportLogs,
  isCreatingBackup = false,
  isExportingLogs = false,
  servers,
}: BackupAndLogToolsProps) {
  const [backupType, setBackupType] = useState<CreateBackupInput["type"]>("postgres");
  const [backupTarget, setBackupTarget] = useState("postgresql://papem/producao");
  const [backupRetention, setBackupRetention] = useState("7d");
  const [logServerId, setLogServerId] = useState<string>(servers[0]?.id ?? "");
  const [logType, setLogType] = useState("application-error");
  const [customLogPath, setCustomLogPath] = useState("");

  useEffect(() => {
    if (!logServerId && servers[0]) {
      setLogServerId(servers[0].id);
    }
  }, [logServerId, servers]);

  const handleBackupSubmit = () => {
    onCreateBackup({
      type: backupType,
      target: backupTarget,
      retention: backupRetention,
      initiatedBy: "dashboard",
    });
  };

  const handleLogExportSubmit = () => {
    if (!logServerId) return;
    const effectiveLogType = logType === "custom" ? (customLogPath || "custom") : logType;
    onExportLogs({
      serverId: logServerId,
      logType: effectiveLogType,
    });
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
      <Card className="border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-foreground">
            <HardDrive className="w-5 h-5 text-primary" />
            Backups do servidor
          </CardTitle>
          <CardDescription>
            Crie instantaneamente um snapshot do banco ou das pastas críticas do PAPEM.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase">Tipo</label>
              <Select value={backupType} onValueChange={value => setBackupType(value as CreateBackupInput["type"]) }>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="postgres">Postgres (snapshot)</SelectItem>
                  <SelectItem value="filesystem">Sistema de arquivos</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase">Retenção</label>
              <Select value={backupRetention} onValueChange={setBackupRetention}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a retenção" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1d">1 dia</SelectItem>
                  <SelectItem value="7d">7 dias</SelectItem>
                  <SelectItem value="14d">14 dias</SelectItem>
                  <SelectItem value="30d">30 dias</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase">Destino</label>
            <Input
              value={backupTarget}
              onChange={event => setBackupTarget(event.target.value)}
              placeholder="postgresql://usuario@host/base"
            />
          </div>
          <Button onClick={handleBackupSubmit} disabled={isCreatingBackup}>
            <History className="w-4 h-4 mr-2" />
            Executar backup agora
          </Button>

          <Separator />

          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-foreground">Histórico de backups</h4>
            <div className="rounded-lg border border-border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Destino</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Iniciado</TableHead>
                    <TableHead>Tamanho</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {backups.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-sm text-muted-foreground py-6">
                        Nenhum backup registrado ainda.
                      </TableCell>
                    </TableRow>
                  )}
                  {backups.map(backup => (
                    <TableRow key={backup.id}>
                      <TableCell className="capitalize">{backup.type}</TableCell>
                      <TableCell className="truncate max-w-[200px]" title={backup.target}>{backup.target}</TableCell>
                      <TableCell>
                        <Badge className="bg-emerald-500/10 text-emerald-500">{backup.status}</Badge>
                      </TableCell>
                      <TableCell>{new Date(backup.createdAt).toLocaleString()}</TableCell>
                      <TableCell>{backup.size}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-foreground">
            <Download className="w-5 h-5 text-primary" />
            Exportação de logs
          </CardTitle>
          <CardDescription>
            Gere pacotes de logs sob demanda para auditoria ou investigação de incidentes.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase">Servidor</label>
              <Select value={logServerId} onValueChange={setLogServerId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o servidor" />
                </SelectTrigger>
                <SelectContent>
                  {servers.map(server => (
                    <SelectItem key={server.id} value={server.id}>
                      {server.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase">Tipo de log</label>
              <Select
                value={logType === "custom" ? "custom" : logType}
                onValueChange={value => {
                  setLogType(value);
                  if (value !== "custom") {
                    setCustomLogPath("");
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="application-error">Erros da aplicação</SelectItem>
                  <SelectItem value="nginx-access">Acessos Nginx</SelectItem>
                  <SelectItem value="system-journal">journalctl</SelectItem>
                  <SelectItem value="custom">Personalizado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          {logType === "custom" && (
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase">Descrição personalizada</label>
              <Input
                value={customLogPath}
                onChange={event => setCustomLogPath(event.target.value)}
                placeholder="ex.: /var/log/papem/api.log"
              />
            </div>
          )}
          <Button
            onClick={handleLogExportSubmit}
            disabled={
              isExportingLogs ||
              !logServerId ||
              (logType === "custom" && customLogPath.trim().length === 0)
            }
          >
            <Download className="w-4 h-4 mr-2" />
            Exportar agora
          </Button>

          <Separator />

          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-foreground">Exportações recentes</h4>
            <div className="rounded-lg border border-border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Servidor</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Iniciado</TableHead>
                    <TableHead>Download</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logExports.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-sm text-muted-foreground py-6">
                        Nenhuma exportação encontrada.
                      </TableCell>
                    </TableRow>
                  )}
                  {logExports.map(task => (
                    <TableRow key={task.id}>
                      <TableCell>{servers.find(server => server.id === task.serverId)?.name ?? task.serverId}</TableCell>
                      <TableCell>{task.logType}</TableCell>
                      <TableCell>
                        <Badge className="bg-sky-500/10 text-sky-500">{task.status}</Badge>
                      </TableCell>
                      <TableCell>{new Date(task.startedAt).toLocaleString()}</TableCell>
                      <TableCell>
                        {task.downloadUrl ? (
                          <Button asChild size="sm" variant="outline">
                            <a href={task.downloadUrl} target="_blank" rel="noreferrer">Baixar</a>
                          </Button>
                        ) : (
                          <span className="text-xs text-muted-foreground">Processando...</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
