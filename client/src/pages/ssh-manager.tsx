import { useState } from "react";
import { useServers } from "@/hooks/use-servers";
import { SshTerminal } from "@/components/ssh-terminal";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Terminal, Play, Square } from "lucide-react";

export default function SshManager() {
  const { servers, isLoading } = useServers();
  const [selectedServerId, setSelectedServerId] = useState<string>("");
  const [activeConnections, setActiveConnections] = useState<string[]>([]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const selectedServer = servers?.find(s => s.id === selectedServerId);
  const onlineServers = servers?.filter(server => server.metrics?.isOnline) || [];

  const handleConnect = () => {
    if (selectedServerId && !activeConnections.includes(selectedServerId)) {
      setActiveConnections([...activeConnections, selectedServerId]);
    }
  };

  const handleDisconnect = (serverId: string) => {
    setActiveConnections(activeConnections.filter(id => id !== serverId));
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="bg-card border border-border rounded-lg p-6 shadow-sm">
        <h1 className="text-2xl font-bold text-foreground">Gerenciador SSH</h1>
        <p className="text-muted-foreground">
          Conecte-se aos servidores via SSH diretamente do navegador
        </p>
      </div>

      {/* Connection Manager */}
      <Card>
        <CardHeader>
          <CardTitle>Nova Conexão SSH</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 items-end">
            <div className="flex-1">
              <label className="text-sm font-medium mb-2 block">Selecionar Servidor</label>
              <Select value={selectedServerId} onValueChange={setSelectedServerId}>
                <SelectTrigger data-testid="select-server">
                  <SelectValue placeholder="Escolha um servidor..." />
                </SelectTrigger>
                <SelectContent>
                  {onlineServers.map((server) => (
                    <SelectItem key={server.id} value={server.id}>
                      <div className="flex items-center space-x-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full" />
                        <span>{server.name}</span>
                        <span className="text-muted-foreground">({server.ip})</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <Button 
              onClick={handleConnect}
              disabled={!selectedServerId || activeConnections.includes(selectedServerId)}
              data-testid="button-connect"
            >
              <Play className="w-4 h-4 mr-2" />
              Conectar
            </Button>
          </div>

          {selectedServer && (
            <div className="mt-4 p-4 bg-muted rounded-lg">
              <h4 className="font-medium mb-2">Detalhes da Conexão:</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Servidor:</span>
                  <span className="ml-2">{selectedServer.name}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">IP:</span>
                  <span className="ml-2">{selectedServer.ip}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Porta SSH:</span>
                  <span className="ml-2">{selectedServer.sshPort}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Usuário:</span>
                  <span className="ml-2">{selectedServer.sshUsername || 'admin'}</span>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Active Connections */}
      {activeConnections.length > 0 && (
        <div className="space-y-4">
          {activeConnections.map((serverId) => {
            const server = servers?.find(s => s.id === serverId);
            if (!server) return null;

            return (
              <Card key={serverId}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Terminal className="w-5 h-5" />
                      <CardTitle className="text-lg">
                        SSH: {server.name} ({server.ip})
                      </CardTitle>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDisconnect(serverId)}
                      data-testid={`button-disconnect-${serverId}`}
                    >
                      <Square className="w-4 h-4 mr-2" />
                      Desconectar
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <SshTerminal server={server} />
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {activeConnections.length === 0 && (
        <Card>
          <CardContent className="text-center py-12">
            <Terminal className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">
              Nenhuma conexão SSH ativa. Selecione um servidor e clique em "Conectar" para iniciar.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
