import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useWebSocket } from "@/hooks/use-websocket";
import { AlertCircle, Info, AlertTriangle, Bug, Search, Filter, Play, Pause, Settings } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface ServerLog {
  id: string;
  serverId: string;
  logLevel: string;
  logSource: string;
  message: string;
  originalLogPath?: string;
  metadata?: any;
  timestamp: string;
}

interface Server {
  id: string;
  name: string;
  hostname: string;
  environment: string;
  serverType: string;
}

const LOG_LEVELS = [
  { value: "all", label: "Todos os Níveis", icon: Filter },
  { value: "info", label: "Info", icon: Info },
  { value: "warning", label: "Aviso", icon: AlertTriangle },
  { value: "error", label: "Erro", icon: AlertCircle },
  { value: "debug", label: "Debug", icon: Bug },
];

const getLogLevelColor = (level: string) => {
  switch (level.toLowerCase()) {
    case "error": return "destructive";
    case "warning": return "yellow";
    case "info": return "blue";
    case "debug": return "gray";
    default: return "secondary";
  }
};

const getLogLevelIcon = (level: string) => {
  switch (level.toLowerCase()) {
    case "error": return AlertCircle;
    case "warning": return AlertTriangle;
    case "info": return Info;
    case "debug": return Bug;
    default: return Info;
  }
};

export function LogsPage() {
  const [selectedServer, setSelectedServer] = useState<string>("");
  const [logLevel, setLogLevel] = useState("all");
  const [isStreaming, setIsStreaming] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [logs, setLogs] = useState<ServerLog[]>([]);
  
  const { sendMessage, lastMessage } = useWebSocket();

  // Fetch servers for the dropdown
  const { data: servers = [] } = useQuery<Server[]>({
    queryKey: ["/api/servers"],
    select: (data) => data || [],
  });

  // Fetch initial logs when server is selected
  const { data: initialLogs = [] } = useQuery<ServerLog[]>({
    queryKey: ["/api/servers", selectedServer, "logs"],
    enabled: !!selectedServer,
    select: (data) => data || [],
  });

  // Update logs when initial data changes
  useEffect(() => {
    if (initialLogs.length > 0) {
      setLogs(initialLogs);
    }
  }, [initialLogs]);

  // Handle WebSocket log streaming
  useEffect(() => {
    if (!selectedServer || !isStreaming) return;

    // Subscribe to logs for selected server
    sendMessage({
      type: "subscribe_logs",
      serverId: selectedServer,
      limit: 100
    });
  }, [sendMessage, selectedServer, isStreaming]);

  // Handle WebSocket messages for logs
  useEffect(() => {
    if (lastMessage && lastMessage.type === "logs_update") {
      const data = lastMessage as any;
      if (data.serverId === selectedServer) {
        setLogs(data.data || []);
      }
    }
  }, [lastMessage, selectedServer]);

  // Filter logs based on level and search
  const filteredLogs = logs.filter(log => {
    const matchesLevel = logLevel === "all" || log.logLevel === logLevel;
    const matchesSearch = !searchQuery || 
      log.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.logSource.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesLevel && matchesSearch;
  });

  const toggleStreaming = () => {
    setIsStreaming(!isStreaming);
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Logs do Sistema</h1>
          <p className="text-muted-foreground">
            Monitoramento de logs em tempo real dos servidores
          </p>
        </div>
        <Button variant="outline" size="sm" data-testid="button-config-logs">
          <Settings className="h-4 w-4 mr-2" />
          Configurações
        </Button>
      </div>

      {/* Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Filter className="h-5 w-5 mr-2" />
            Filtros e Controles
          </CardTitle>
          <CardDescription>
            Selecione o servidor e configure os filtros para visualizar os logs
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            {/* Server Selection */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Servidor</label>
              <Select value={selectedServer} onValueChange={setSelectedServer}>
                <SelectTrigger data-testid="select-server">
                  <SelectValue placeholder="Selecione um servidor" />
                </SelectTrigger>
                <SelectContent>
                  {servers.map((server) => (
                    <SelectItem key={server.id} value={server.id}>
                      {server.name} ({server.environment})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Log Level Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Nível do Log</label>
              <Select value={logLevel} onValueChange={setLogLevel}>
                <SelectTrigger data-testid="select-log-level">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LOG_LEVELS.map((level) => (
                    <SelectItem key={level.value} value={level.value}>
                      {level.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Search */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Busca</label>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar logs..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8"
                  data-testid="input-search-logs"
                />
              </div>
            </div>

            {/* Streaming Control */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Tempo Real</label>
              <Button
                onClick={toggleStreaming}
                variant={isStreaming ? "destructive" : "default"}
                className="w-full"
                disabled={!selectedServer}
                data-testid="button-toggle-streaming"
              >
                {isStreaming ? (
                  <>
                    <Pause className="h-4 w-4 mr-2" />
                    Pausar
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4 mr-2" />
                    Iniciar
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Status */}
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span data-testid="text-logs-count">
              {filteredLogs.length} logs encontrados
              {selectedServer && ` para ${servers.find(s => s.id === selectedServer)?.name}`}
            </span>
            {isStreaming && (
              <Badge variant="secondary" className="animate-pulse" data-testid="badge-streaming-status">
                <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                Streaming ativo
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Logs Display */}
      <Card>
        <CardHeader>
          <CardTitle>Logs do Sistema</CardTitle>
          <CardDescription>
            {selectedServer ? 
              `Logs do servidor ${servers.find(s => s.id === selectedServer)?.name}` :
              "Selecione um servidor para visualizar os logs"
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!selectedServer ? (
            <div className="flex items-center justify-center h-64 text-muted-foreground">
              <div className="text-center">
                <Search className="h-12 w-12 mx-auto mb-4" />
                <p>Selecione um servidor para começar</p>
              </div>
            </div>
          ) : (
            <ScrollArea className="h-96 w-full">
              <div className="space-y-3" data-testid="container-logs">
                {filteredLogs.length === 0 ? (
                  <div className="flex items-center justify-center h-32 text-muted-foreground">
                    <p>Nenhum log encontrado</p>
                  </div>
                ) : (
                  filteredLogs.map((log) => {
                    const LogIcon = getLogLevelIcon(log.logLevel);
                    return (
                      <div
                        key={log.id}
                        className="flex items-start gap-3 p-3 rounded-lg border hover:bg-accent/50 transition-colors"
                        data-testid={`log-entry-${log.id}`}
                      >
                        <div className="mt-0.5">
                          <LogIcon className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <div className="flex-1 min-w-0 space-y-1">
                          <div className="flex items-center gap-2">
                            <Badge 
                              variant={getLogLevelColor(log.logLevel) as any}
                              className="text-xs"
                              data-testid={`badge-log-level-${log.logLevel}`}
                            >
                              {log.logLevel.toUpperCase()}
                            </Badge>
                            <Badge variant="outline" className="text-xs" data-testid={`badge-log-source-${log.logSource}`}>
                              {log.logSource}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {format(new Date(log.timestamp), "dd/MM/yyyy HH:mm:ss", { locale: ptBR })}
                            </span>
                          </div>
                          <div className="text-sm font-mono bg-muted/50 p-2 rounded border">
                            {log.message}
                          </div>
                          {log.originalLogPath && (
                            <div className="text-xs text-muted-foreground">
                              Arquivo: {log.originalLogPath}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
}