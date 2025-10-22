# HosMonitorDash

Painel full-stack para monitoramento de servidores com backend Express, frontend React + Vite e persistência em PostgreSQL via Drizzle ORM. A aplicação expõe APIs REST e atualizações em tempo real por WebSockets, além de uma interface rica com métricas, alertas, sessões SSH e acompanhamento de logs.





## Principais funcionalidades

- **Dashboard em tempo real** com cartões de métricas, abas por ambiente e visão rápida de saúde dos servidores, alertas e gráficos placeholder prontos para integração futura.


- **Gestão de inventário** com filtros por ambiente/tipo, busca textual, criação/edição via formulário e ações de SSH, métricas e exclusão diretamente nos cards dos servidores.



- **Monitoramento de alertas** com separação entre críticos, avisos e resolvidos, fluxo para resolução e feedback via toasts.


- **Streaming de logs** com filtros por servidor/nível, busca, controle de streaming e destaque por nível, consumindo atualizações WebSocket quando disponíveis.



- **APIs REST completas** para servidores, métricas, alertas, sessões SSH e configurações de monitoramento de logs, além de difusão periódica de métricas simuladas e alertas automáticos.


- **Banco estruturado** para servidores, métricas, alertas, sessões, logs e configurações, com seeds abrangentes que populam exemplos de produção/staging e diferentes fontes de log.





## Stack tecnológica

- Backend: Node.js + Express, Drizzle ORM, WebSocket server (`ws`).



- Frontend: React 18, Vite 5, TanStack Query, Radix UI, TailwindCSS/animate, shadcn UI abstrações.



- Banco de dados: PostgreSQL (compatível com Neon) acessado via `pg` + Drizzle (`drizzle-orm/node-postgres`).




## Estrutura de pastas

```
HosMonitorDash/
├── client/      # SPA React + Tailwind (rotas, páginas, hooks, componentes)


├── server/      # API Express, WebSocket, Drizzle storage e seeds


├── shared/      # Schema e tipos compartilhados (Drizzle + Zod)


├── attached_assets/ ...      # Recursos adicionais (ex.: imagens, dados)
├── package.json             # Scripts e dependências do monorepo Node


└── drizzle.config.ts        # Configuração da CLI Drizzle Kit


```

## Pré-requisitos

- PostgreSQL acessível via URL (`postgres://...`). O backend falha ao iniciar se `DATABASE_URL` não estiver presente.


- Node.js compatível com ESM e tipos 20.x (recomendado ≥ 20) para alinhar com as dependências e toolchain listadas no `package.json`.



- npm (ou outro gerenciador compatível com `package-lock.json`).



## Configurando o ambiente

1. **Instalar dependências**

   ```bash
   npm install
   ```
   As dependências do frontend/backend estão centralizadas em `package.json`.



2. **Configurar variáveis de ambiente**

   Crie um arquivo `.env` na raiz com, no mínimo:

   ```ini
   DATABASE_URL=postgres://usuario:senha@host:porta/banco
   PORT=5000            # opcional; padrão 5000
   ```

   O backend exige `DATABASE_URL` e permite personalizar a porta via `PORT`.




3. **Preparar o banco**

   ```bash
   npm run db:push
   ```
   Executa `drizzle-kit push` conforme configuração em `drizzle.config.ts`. Use após criar o banco/URL para aplicar o schema.




4. **Dados iniciais**

   A inicialização do servidor verifica se há servidores na base e executa o seed padrão (servidores, métricas, alertas, logs e configs) quando necessário.




## Execução

- Desenvolvimento (API + Vite com HMR):

  ```bash
  npm run dev
  ```
  Inicia `server/index.ts` com `NODE_ENV=development`, registrando rotas e carregando Vite em modo middleware.





- Build de produção:

  ```bash
  npm run build
  ```
  Gera o bundle do cliente via Vite e transpila o servidor para `dist/` usando `esbuild`.



- Servir build de produção:

  ```bash
  npm run start
  ```
  Executa `dist/index.js` com `NODE_ENV=production`, servindo assets estáticos gerados e a API Express.



- Checar tipos:

  ```bash
  npm run check
  ```
  Rodar `tsc` para validação estática do TypeScript.



## APIs REST

| Método | Endpoint | Descrição |
| ------ | -------- | --------- |
| GET    | `/api/servers` | Lista servidores públicos com métricas/alertas recentes. |
| GET    | `/api/servers/:id` | Retorna detalhes de um servidor, métricas e alertas. |
| POST   | `/api/servers` | Cria servidor (dados validados via Zod). |
| PUT    | `/api/servers/:id` | Atualiza servidor existente. |
| DELETE | `/api/servers/:id` | Remove servidor. |
| GET    | `/api/servers/:id/metrics` | Lista histórico de métricas. |
| POST   | `/api/servers/:id/metrics` | Registra métricas. |
| GET    | `/api/alerts` | Lista alertas ativos. |
| POST   | `/api/alerts` | Cria alerta manualmente. |
| PATCH  | `/api/alerts/:id/resolve` | Marca alerta como resolvido. |
| GET    | `/api/ssh-sessions` | Lista sessões SSH ativas. |
| POST   | `/api/ssh-sessions` | Abre sessão SSH (stub). |
| DELETE | `/api/ssh-sessions/:id` | Encerra sessão SSH. |
| GET    | `/api/servers/:id/logs` | Consulta logs (com filtro por nível/limite). |
| POST   | `/api/servers/:id/logs` | Registra log manual. |
| GET/POST/PUT/DELETE | `/api/log-monitoring` | CRUD de configurações de monitoramento de logs. |

Todas as rotas usam o repositório `storage` que delega ao `DatabaseStorage` persistente e validam payloads com schemas compartilhados.





### WebSocket (`/ws`)

Eventos suportados:
- `subscribe_servers` → resposta `servers_update` com lista atualizada de servidores.
- `subscribe_alerts` → resposta `alerts_update` com alertas ativos.
- `subscribe_logs` (serverId, limit) → resposta `logs_update` para o servidor solicitado.

O servidor também propaga atualizações periódicas (30s) com métricas simuladas e alertas derivados, enviando `servers_update` e `alerts_update` a todos os clientes conectados.



## Banco de dados & Seeds

- Tabelas: `servers`, `server_metrics`, `alerts`, `ssh_sessions`, `server_logs`, `log_monitoring_config`. Cada tabela possui tipos correspondentes exportados para uso compartilhado no frontend/backend.


- Seed default:
  - 6 servidores (produção, homologação) com métricas iniciais.
  - Alertas críticos/aviso baseados em thresholds.
  - Configurações de monitoramento para Nginx e MySQL.
  - Logs de exemplo (acessos, erros, slow query, systemd, postfix).



Para redefinir dados manualmente, limpe as tabelas e reinicie o servidor (o seed roda automaticamente quando detecta base vazia).



## Próximos passos sugeridos

- Substituir métricas simuladas pela coleta real de agentes/telemetria.
- Implementar execução de comandos SSH e streaming de terminal, substituindo placeholders atuais.
- Adicionar testes automatizados (unitários/end-to-end) e pipelines CI.

---

Ajuste conforme necessário para refletir branding, instruções de deploy ou integrações adicionais específicas do seu ambiente.

