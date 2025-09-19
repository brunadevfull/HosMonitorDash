import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Save, RefreshCw, Bell, Shield, Database } from "lucide-react";

export default function Settings() {
  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="bg-card border border-border rounded-lg p-6 shadow-sm">
        <h1 className="text-2xl font-bold text-foreground">Configurações</h1>
        <p className="text-muted-foreground">
          Configure as preferências do sistema de monitoramento
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* General Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <RefreshCw className="w-5 h-5" />
              <span>Configurações Gerais</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="refresh-interval">Intervalo de Atualização (segundos)</Label>
              <Select defaultValue="30">
                <SelectTrigger data-testid="select-refresh-interval">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10 segundos</SelectItem>
                  <SelectItem value="30">30 segundos</SelectItem>
                  <SelectItem value="60">1 minuto</SelectItem>
                  <SelectItem value="300">5 minutos</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="theme">Tema</Label>
              <Select defaultValue="light">
                <SelectTrigger data-testid="select-theme">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="light">Claro</SelectItem>
                  <SelectItem value="dark">Escuro</SelectItem>
                  <SelectItem value="system">Sistema</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Atualização Automática</Label>
                <p className="text-sm text-muted-foreground">
                  Atualizar métricas automaticamente
                </p>
              </div>
              <Switch defaultChecked data-testid="switch-auto-refresh" />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Modo Compacto</Label>
                <p className="text-sm text-muted-foreground">
                  Exibir mais servidores por linha
                </p>
              </div>
              <Switch data-testid="switch-compact-mode" />
            </div>
          </CardContent>
        </Card>

        {/* Alert Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Bell className="w-5 h-5" />
              <span>Configurações de Alertas</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="cpu-threshold">Limite CPU (%)</Label>
              <Input 
                id="cpu-threshold" 
                type="number" 
                defaultValue="80" 
                min="1" 
                max="100"
                data-testid="input-cpu-threshold"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="memory-threshold">Limite Memória (%)</Label>
              <Input 
                id="memory-threshold" 
                type="number" 
                defaultValue="90" 
                min="1" 
                max="100"
                data-testid="input-memory-threshold"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="disk-threshold">Limite Disco (%)</Label>
              <Input 
                id="disk-threshold" 
                type="number" 
                defaultValue="85" 
                min="1" 
                max="100"
                data-testid="input-disk-threshold"
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Notificações por Email</Label>
                <p className="text-sm text-muted-foreground">
                  Receber alertas por email
                </p>
              </div>
              <Switch data-testid="switch-email-notifications" />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Alertas Sonoros</Label>
                <p className="text-sm text-muted-foreground">
                  Reproduzir som para alertas críticos
                </p>
              </div>
              <Switch data-testid="switch-sound-alerts" />
            </div>
          </CardContent>
        </Card>

        {/* Security Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Shield className="w-5 h-5" />
              <span>Configurações de Segurança</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="session-timeout">Timeout da Sessão (minutos)</Label>
              <Select defaultValue="60">
                <SelectTrigger data-testid="select-session-timeout">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="30">30 minutos</SelectItem>
                  <SelectItem value="60">1 hora</SelectItem>
                  <SelectItem value="120">2 horas</SelectItem>
                  <SelectItem value="480">8 horas</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Autenticação de Dois Fatores</Label>
                <p className="text-sm text-muted-foreground">
                  Aumentar segurança do acesso
                </p>
              </div>
              <Switch data-testid="switch-2fa" />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Log de Auditoria</Label>
                <p className="text-sm text-muted-foreground">
                  Registrar todas as ações do usuário
                </p>
              </div>
              <Switch defaultChecked data-testid="switch-audit-log" />
            </div>
          </CardContent>
        </Card>

        {/* Database Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Database className="w-5 h-5" />
              <span>Configurações de Dados</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="retention-period">Período de Retenção de Métricas</Label>
              <Select defaultValue="30">
                <SelectTrigger data-testid="select-retention-period">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">7 dias</SelectItem>
                  <SelectItem value="30">30 dias</SelectItem>
                  <SelectItem value="90">90 dias</SelectItem>
                  <SelectItem value="365">1 ano</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Backup Automático</Label>
                <p className="text-sm text-muted-foreground">
                  Fazer backup diário das configurações
                </p>
              </div>
              <Switch defaultChecked data-testid="switch-auto-backup" />
            </div>

            <div className="space-y-2">
              <Button variant="outline" className="w-full" data-testid="button-export-data">
                Exportar Dados
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button className="w-full sm:w-auto" data-testid="button-save-settings">
          <Save className="w-4 h-4 mr-2" />
          Salvar Configurações
        </Button>
      </div>
    </div>
  );
}
