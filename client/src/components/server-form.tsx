import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { insertServerSchema, InsertServer, Server } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";

interface ServerFormProps {
  server?: Server;
  onSuccess?: () => void;
}

export function ServerForm({ server, onSuccess }: ServerFormProps) {
  const { toast } = useToast();
  const isEditing = !!server;

  const form = useForm<InsertServer>({
    resolver: zodResolver(insertServerSchema),
    defaultValues: {
      name: server?.name || "",
      hostname: server?.hostname || "",
      ip: server?.ip || "",
      sshPort: server?.sshPort || 22,
      sshUsername: server?.sshUsername || "",
      sshPassword: server?.sshPassword || "",
      sshPrivateKey: server?.sshPrivateKey || "",
      environment: server?.environment || "production",
      serverType: server?.serverType || "web",
      description: server?.description || "",
      tags: server?.tags || [],
      isActive: server?.isActive ?? true,
    }
  });

  const createServerMutation = useMutation({
    mutationFn: async (data: InsertServer) => {
      const url = isEditing ? `/api/servers/${server.id}` : "/api/servers";
      const method = isEditing ? "PUT" : "POST";
      return apiRequest(method, url, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/servers"] });
      toast({
        title: isEditing ? "Servidor atualizado" : "Servidor criado",
        description: isEditing 
          ? "O servidor foi atualizado com sucesso." 
          : "O servidor foi criado com sucesso.",
      });
      onSuccess?.();
    },
    onError: () => {
      toast({
        title: "Erro",
        description: `Falha ao ${isEditing ? "atualizar" : "criar"} o servidor. Tente novamente.`,
        variant: "destructive",
      });
    }
  });

  const onSubmit = (data: InsertServer) => {
    createServerMutation.mutate(data);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6" data-testid="server-form">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nome do Servidor</FormLabel>
                <FormControl>
                  <Input placeholder="web-prod-01" {...field} data-testid="input-server-name" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="hostname"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Hostname</FormLabel>
                <FormControl>
                  <Input placeholder="web-prod-01.empresa.com" {...field} data-testid="input-hostname" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="ip"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Endereço IP</FormLabel>
                <FormControl>
                  <Input placeholder="192.168.1.10" {...field} data-testid="input-ip" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="sshPort"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Porta SSH</FormLabel>
                <FormControl>
                  <Input 
                    type="number" 
                    placeholder="22" 
                    {...field}
                    onChange={(e) => field.onChange(parseInt(e.target.value) || 22)}
                    data-testid="input-ssh-port"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="environment"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Ambiente</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger data-testid="select-environment">
                      <SelectValue placeholder="Selecione o ambiente" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="production">Produção</SelectItem>
                    <SelectItem value="staging">Homologação</SelectItem>
                    <SelectItem value="development">Desenvolvimento</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="serverType"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Tipo do Servidor</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger data-testid="select-server-type">
                      <SelectValue placeholder="Selecione o tipo" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="web">Web</SelectItem>
                    <SelectItem value="database">Database</SelectItem>
                    <SelectItem value="hybrid">Híbrido</SelectItem>
                    <SelectItem value="mail">Mail</SelectItem>
                    <SelectItem value="backup">Backup</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="space-y-4">
          <FormField
            control={form.control}
            name="sshUsername"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Usuário SSH</FormLabel>
                <FormControl>
                  <Input
                    placeholder="admin"
                    {...field}
                    value={field.value ?? ""}
                    data-testid="input-ssh-username"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="sshPassword"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Senha SSH (opcional)</FormLabel>
                <FormControl>
                  <Input 
                    type="password" 
                    placeholder="••••••••" 
                    {...field} 
                    value={field.value || ""}
                    data-testid="input-ssh-password"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Descrição</FormLabel>
                <FormControl>
                  <Textarea 
                    placeholder="Descrição do servidor..." 
                    {...field} 
                    value={field.value || ""}
                    data-testid="textarea-description"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="flex justify-end space-x-2">
          <Button 
            type="submit" 
            disabled={createServerMutation.isPending}
            data-testid="button-submit-server"
          >
            {createServerMutation.isPending
              ? (isEditing ? "Atualizando..." : "Criando...")
              : (isEditing ? "Atualizar Servidor" : "Criar Servidor")
            }
          </Button>
        </div>
      </form>
    </Form>
  );
}
