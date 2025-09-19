import { useState } from "react";
import { useServers } from "@/hooks/use-servers";
import { ServerCard } from "@/components/server-card";
import { ServerForm } from "@/components/server-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Search, Filter } from "lucide-react";

export default function Servers() {
  const { servers, isLoading } = useServers();
  const [isAddServerOpen, setIsAddServerOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [environmentFilter, setEnvironmentFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const filteredServers = servers?.filter(server => {
    const matchesSearch = server.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         server.ip.includes(searchTerm) ||
                         server.hostname.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesEnvironment = environmentFilter === "all" || server.environment === environmentFilter;
    const matchesType = typeFilter === "all" || server.serverType === typeFilter;
    
    return matchesSearch && matchesEnvironment && matchesType;
  }) || [];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="bg-card border border-border rounded-lg p-6 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Gerenciar Servidores</h1>
            <p className="text-muted-foreground">
              {filteredServers.length} de {servers?.length || 0} servidores
            </p>
          </div>
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

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="Buscar por nome, IP ou hostname..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
              data-testid="input-search"
            />
          </div>
          
          <Select value={environmentFilter} onValueChange={setEnvironmentFilter}>
            <SelectTrigger className="w-full sm:w-48" data-testid="select-environment">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Ambiente" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os ambientes</SelectItem>
              <SelectItem value="production">Produção</SelectItem>
              <SelectItem value="staging">Homologação</SelectItem>
              <SelectItem value="development">Desenvolvimento</SelectItem>
            </SelectContent>
          </Select>

          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-full sm:w-48" data-testid="select-type">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os tipos</SelectItem>
              <SelectItem value="web">Web</SelectItem>
              <SelectItem value="database">Database</SelectItem>
              <SelectItem value="hybrid">Híbrido</SelectItem>
              <SelectItem value="mail">Mail</SelectItem>
              <SelectItem value="backup">Backup</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Servers Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredServers.map((server) => (
          <ServerCard key={server.id} server={server} showActions />
        ))}
      </div>

      {filteredServers.length === 0 && (
        <div className="text-center py-12">
          <p className="text-muted-foreground">Nenhum servidor encontrado com os filtros aplicados.</p>
        </div>
      )}
    </div>
  );
}
