# Changelog

Todas as mudanças notáveis neste projeto são documentadas neste arquivo.

O formato é baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/),
e este projeto adota [Semver](https://semver.org/lang/pt-BR/).

## [1.1.0] - 2026-10-26

Fase 1 concluída: o servidor deixa de confiar no cliente. Validação de
movimento/teleport, rate limit por jogador e checagem de dono no editor.

### Segurança

- **Validação de movimento no servidor**: `movePlayer` roda o mesmo BFS 4-direcional do cliente contra o tilemap da sessão — coordenadas arbitrárias, teleporte e atravessar paredes são recusados, sem efeitos colaterais em movimento legítimo (os obstáculos do servidor são um subconjunto dos do cliente).
- **Validação de teleport**: o tile de origem do jogador precisa ter um `teleporter` apontando exatamente para o destino pedido, e a sala de destino precisa existir no mapa.
- **Rate limit por jogador** (em memória, por uid): `movePlayer` 30/s, `sendMessage` 5/2s, `changedSkin` 3/2s e `teleport` 5/2s.
- **Checagem de dono no editor e no manage**: `/editor/[id]` e `/manage/[id]` agora exigem `owner_id === user.id` — antes, qualquer usuário logado abria a UI de edição de qualquer realm (a checagem só existia em comentário).

### Corrigido

- `removePlayer` apagava o índice de posições inteiro quando alguém saía de um tile compartilhado, fazendo jogadores sumirem do cálculo de proximidade.
- Sessões ficavam em memória para sempre depois que o último jogador saía.
- `logOutPlayer` estourava `TypeError` (e vazava índices) quando a sessão já tinha sido terminada, ex.: dono salvando o mapa enquanto alguém desconectava.
- `joinRealm` sem `return` no guard de join duplicado e sem `try/finally`: um erro podia deixar o `uid` travado em `joiningInProgress` para sempre.
- `signal.off('showKickedModal')` removia o handler errado, acumulando listeners a cada montagem.

### Adicionado

- **29 testes Jest na API** (sessão/proximidade, pathfinding do servidor, rate limiter); `pnpm test` roda na CI de todo PR.
- `apps/api/src/pathfinding.ts` (port fiel do BFS do cliente, com teto de coordenadas) e `apps/api/src/rate-limit.ts` (`RateLimiter` simples, pronto para ganhar implementação em Redis na Fase 3).

### Alterado

- `terminateSession` retorna os jogadores afetados e limpa os índices do manager; a emissão de `kicked` saiu de `session.ts` para `index.ts`, rompendo o ciclo de imports `session → helpers → index`.
- Todos os handlers de socket ganharam guard para jogador inexistente na sessão (evita `TypeError` logo após kick/disconnect).

## [1.0.0] - 2026-10-26

Primeira release oficial do CompHub — monorepo validado com `typecheck` e `build` em verde.

### Destaques

- **Rebranding para CompHub** com README reescrito, lista de funcionalidades e roadmap.
- **Monorepo com pnpm workspaces**: `backend/` → `apps/api` e `frontend/` → `apps/web`, com scripts globais de `dev`, `build` e `typecheck` na raiz.
- **Documentação da API**: rotas de documentação OpenAPI adicionadas ao backend.
- **Dependências pinadas**: `next` saiu de `latest` para `14.2.14` e as integrações Supabase fixadas em `@supabase/supabase-js@2.45.4` e `@supabase/ssr@0.5.1`.

### Adicionado

- `pnpm-workspace.yaml` e `package.json` raiz com os scripts `dev`, `build`, `typecheck` e `heroku-postbuild`.
- `pnpm-lock.yaml` versionado, substituindo os antigos `yarn.lock` e `bun.lock`.
- Workflow de CI no GitHub Actions (`typecheck` + `build` em cada push e pull request).
- Este `CHANGELOG.md`.

### Alterado

- **Deploy (Heroku)**: `Procfile` migrado de `cd backend && npm run start` para `pnpm --filter @comphub/api start`; `heroku-postbuild` agora usa pnpm.
- **`.gitignore`** reescrito para a nova estrutura `apps/*` (cobre `.next/`, `coverage`, `dist` e arquivos `.env`).
- `ts-node` movido para as `devDependencies` da API e script `typecheck` (`tsc --noEmit`) adicionado aos dois apps.

### Removidos

- Componentes e arquivos não utilizados no frontend (layout antigo, modais obsoletos e funcionalidades de video chat órfãs).
- Lockfiles legados (`yarn.lock`, `bun.lock`) e `README.md.backup`.

### Funcionalidades incluídas

- **Editor de mapas**: paletas de tiles (ground, grasslands, village, city), pincel, borracha, zoom, camadas, spawn points, teleportadores e áreas privadas.
- **Chat de vídeo por proximidade** via Agora, com controles de microfone/câmera e salas de vídeo privadas.
- **Multiplayer em tempo real** com Socket.io: sincronização de posições, salas compartilhadas e gestão de sessões.
- **83 personagens** com sistema de skins e animações.
- **Salas e teleporte**, movimentação baseada em tiles e autenticação com Supabase Auth.

[1.1.0]: https://github.com/HFFICEFREE/CompHub/releases/tag/v1.1.0
[1.0.0]: https://github.com/HFFICEFREE/CompHub/releases/tag/v1.0.0
