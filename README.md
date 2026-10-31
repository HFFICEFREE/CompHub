# CompHub

CompHub é uma plataforma de espaços virtuais colaborativos que permite criar, personalizar e compartilhar ambientes interativos com chat de vídeo baseado em proximidade.

A aplicação foi projetada para incluir as funcionalidades principais de plataformas de espaços virtuais, incluindo:

- [x] **Editor de Mapas**: Criação e personalização de espaços usando tilesets
- [x] **Chat de Vídeo por Proximidade**: Comunicação em tempo real baseada na distância entre jogadores
- [x] **Chat de Vídeo em Áreas Privadas**: Salas de vídeo para conversas privadas
- [x] **Sistema Multiplayer**: Networking em tempo real para múltiplos jogadores
- [x] **Movimentação Baseada em Tiles**: Sistema de movimento por quadrados
- [x] **Personalização de Personagens**: Sistema de skins e avatares
- [x] **Sistema de Salas**: Criação e gerenciamento de múltiplas salas
- [x] **Teleportação**: Sistema de teletransporte entre salas
- [x] **Ferramentas de Edição**: Pincel, borracha, zoom e outras ferramentas de edição

---
### Funcionalidades em Desenvolvimento

Para tornar o CompHub ainda mais completo e similar ao Gather.town, as seguintes funcionalidades estão planejadas:

#### Sistema de Chat Avançado
- [ ] Chat permanente com canais públicos e privados
- [ ] Sistema de DMs (mensagens diretas)
- [ ] Threads de conversa
- [ ] Upload de arquivos no chat
- [ ] Reações com emoji
- [ ] Feed de atividades recentes

#### Reuniões e Produtividade
- [ ] Agendamento de reuniões integrado
- [ ] Gravação de reuniões
- [ ] Transcrições automáticas com IA
- [ ] Notas de reunião com IA
- [ ] Compartilhamento de tela múltiplo
- [ ] Música de fundo durante reuniões
- [ ] Integração com Google Calendar

#### Sistema de Status e Presença
- [ ] Status de disponibilidade (livre, ocupado, focado)
- [ ] Sincronização automática com calendário
- [ ] Indicador de aplicativo atual
- [ ] Modo foco com notificações controladas
- [ ] Visualização simplificada

#### Interações Sociais
- [ ] Sistema de "acenar" para colegas
- [ ] Bloqueio de conversas
- [ ] Mute de conversas específicas
- [ ] Sistema de "bater" na porta de áreas privadas
- [ ] Objetos interativos (gongo, kart, etc.)

#### Personalização Avançada
- [ ] Personalização de mesa/desk
- [ ] Mais de 200 objetos decorativos
- [ ] Templates de escritório
- [ ] Modo escuro/claro
- [ ] Mini modo para uso em background
- [ ] Visualização simplificada vs imersiva

#### Integrações
- [ ] Integração com GitHub
- [ ] Integração com Spotify
- [ ] Extensão para Chrome
- [ ] Integração com Notion
- [ ] Integração com Linear

#### Funcionalidades de IA
- [ ] Busca inteligente no conhecimento da empresa
- [ ] Resumos automáticos de reuniões
- [ ] Transcrições com IA
- [ ] Sugestões de contexto baseadas em projetos

#### Gerenciamento de Membros
- [ ] Sistema de convites por email/link
- [ ] Atribuição de mesas específicas
- [ ] Controle de permissões (Admin, Membro, Convidado)
- [ ] Sistema de convidados temporários


Construído como uma aplicação web TypeScript usando Next.js, Supabase, Socket.io, TailwindCSS, Pixi.js e Agora para chat de vídeo.

### Como instalar

Pré-requisitos: **Node.js 20+** e **pnpm 10** (a versão é fixada em `package.json` via `packageManager` — com `corepack enable` o pnpm correto é escolhido automaticamente).

O projeto é um monorepo gerenciado com **pnpm workspaces**. Na raiz:

```bash
pnpm install
```

O projeto requer tanto Supabase quanto Agora - você precisará criar projetos em ambas as plataformas.

Crie um arquivo `.env` na pasta `apps/api` com as seguintes variáveis:
```
# Obrigatória: origem(ões) do frontend aceita(s) pelo CORS e Socket.io.
# Várias origens? Separe por vírgula. O servidor NÃO sobe sem ela.
FRONTEND_URL=http://localhost:3000
SUPABASE_URL=
SERVICE_ROLE=
# PORT=3001   # opcional (default 3001)
```

> **Deploy (Heroku)**: a config var `FRONTEND_URL` é obrigatória — ex.: `https://seu-frontend.com`.

Crie um arquivo `.env.local` na pasta `apps/web` com as seguintes variáveis:
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_BASE_URL=
NEXT_PUBLIC_BACKEND_URL=
NEXT_PUBLIC_AGORA_APP_ID=
APP_CERTIFICATE=
```

### Configuração do Supabase Realtime

O backend escuta alterações na tabela `realms` para encerrar sessões quando o mapa, o compartilhamento ou a permissão de dono mudam. Para que os eventos de `UPDATE` incluam a linha anterior completa, configure a tabela com `REPLICA IDENTITY FULL` no SQL Editor do Supabase:

```sql
ALTER TABLE public.realms REPLICA IDENTITY FULL;
```

Sem essa configuração, o payload de `UPDATE` pode não conter `old` completo e o backend não consegue comparar os campos com segurança.

Por fim, na raiz do projeto execute `pnpm dev` (sobe frontend e backend em paralelo). Para rodar cada um separadamente: `pnpm --filter @comphub/web dev` ou `pnpm --filter @comphub/api dev`.

### Funcionalidades Principais

#### Editor de Mapas
- [x] Interface visual para criar e editar espaços virtuais
- [x] Múltiplas paletas de tiles (ground, grasslands, village)
- [x] Ferramentas de edição: pincel, borracha, zoom
- [x] Sistema de camadas para organização
- [x] Ferramentas especiais: spawn points, teleportadores, áreas privadas

#### Sistema de Jogadores
- [x] 83 personagens diferentes disponíveis
- [x] Sistema de personalização de skins
- [x] Movimentação fluida baseada em tiles
- [x] Animações de personagem

#### Chat de Vídeo
- [x] Integração com Agora para chat de vídeo
- [x] Chat baseado em proximidade
- [x] Controles de microfone e câmera
- [x] Salas de vídeo privadas

#### Multiplayer
- [x] Networking em tempo real com Socket.io
- [x] Sincronização de posições dos jogadores
- [x] Sistema de salas compartilhadas
- [x] Gerenciamento de sessões
- [x] Validação de movimento/teleport no servidor e rate limit por jogador

### Estrutura do Projeto

```
CompHub/
├─ apps/
│  ├─ web/               # Aplicação Next.js
│  │  ├─ src/app/        # Páginas e rotas
│  │  ├─ src/components/ # Componentes reutilizáveis
│  │  └─ src/utils/      # Utilitários e helpers
│  ├─ api/               # Servidor Express + Socket.io (produção)
│  │  └─ src/            # Rotas, sockets, auth e bootstrap
│  └─ api-nest/          # Backend NestJS (migração em curso, ver Fase 2)
│     └─ src/            # Bootstrap, controllers e config
├─ packages/
│  └─ core/              # Domínio puro compartilhado: sessões, pathfinding,
│                        # rate limit e utilitários (sem Express/Nest/Supabase)
├─ pnpm-workspace.yaml   # Configuração do monorepo
└─ Procfile              # Processo de deploy do backend
```

> `@comphub/core` é consumido por `@comphub/api` e `@comphub/api-nest`, de modo
> que as regras de jogo nunca divergem entre os dois backends. Por ser um pacote
> com `dist`, ele precisa estar buildado antes de `typecheck`, `test` e `dev` —
> os scripts da raiz já cuidam disso automaticamente.

### Comandos úteis

| Comando | Descrição |
|---|---|
| `pnpm install` | Instala dependências de todos os workspaces |
| `pnpm dev` | Sobe web + api + api-nest em paralelo (compila o core antes) |
| `pnpm build` | Build de produção de todos os workspaces |
| `pnpm typecheck` | Verificação de tipos em todos os workspaces |
| `pnpm test` | Testes Jest (api) |
| `pnpm lint` | ESLint em todos os workspaces |
| `pnpm format` | Formata o código com Prettier |
| `pnpm format:check` | Verifica a formatação sem alterar arquivos |

### Contribuindo

- Todo pull request roda a **CI** no GitHub Actions (`typecheck` + `lint` + `test` + `build`) e precisa estar verde para merge.
- A branch `main` é **protegida**: sem push direto e sem force-push — merge apenas via PR com a CI verde.
- Siga [Conventional Commits](https://www.conventionalcommits.org/) (`feat:`, `fix:`, `chore:`, `docs:` ...).

### Tecnologias Utilizadas

- **Frontend**: Next.js, React, TypeScript, TailwindCSS, Pixi.js
- **Backend**: Node.js, Express.js, Socket.io (produção) · NestJS (migração da Fase 2)
- **Domínio compartilhado**: `@comphub/core` (TypeScript puro, sem framework)
- **Banco de Dados**: Supabase (PostgreSQL)
- **Chat de Vídeo**: Agora
- **Gerenciamento de Estado**: React Hooks, Signals
- **Autenticação**: Supabase Auth
- **Deploy**: Heroku (backend), Vercel (frontend)
