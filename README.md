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

Instale as dependências do cliente.
```bash
cd frontend
yarn install
```

Instale as dependências do servidor.
```bash
cd backend
yarn install
```

O projeto requer tanto Supabase quanto Agora - você precisará criar projetos em ambas as plataformas.

Crie um arquivo .env na pasta `backend` com as seguintes variáveis:
```
FRONTEND_URL=
SUPABASE_URL=
SERVICE_ROLE=
```

Crie um arquivo .env.local na pasta `frontend` com as seguintes variáveis:
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_BASE_URL=
NEXT_PUBLIC_BACKEND_URL=
SERVICE_ROLE=
NEXT_PUBLIC_AGORA_APP_ID=
APP_CERTIFICATE=
```

Por fim, execute `yarn dev` em ambas as pastas `frontend` e `backend`.

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

### Estrutura do Projeto

```
CompHub/
├── frontend/          # Aplicação Next.js
│   ├── app/          # Páginas e componentes principais
│   ├── components/   # Componentes reutilizáveis
│   └── utils/        # Utilitários e helpers
├── backend/          # Servidor Express.js
│   ├── src/         # Código fonte do servidor
│   └── routes/      # Rotas da API
└── public/          # Assets estáticos
```

### Tecnologias Utilizadas

- **Frontend**: Next.js, React, TypeScript, TailwindCSS, Pixi.js
- **Backend**: Node.js, Express.js, Socket.io
- **Banco de Dados**: Supabase (PostgreSQL)
- **Chat de Vídeo**: Agora
- **Gerenciamento de Estado**: React Hooks, Signals
- **Autenticação**: Supabase Auth
- **Deploy**: Heroku (backend), Vercel (frontend)
