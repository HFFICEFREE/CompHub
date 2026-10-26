# Changelog

Todas as mudanças notáveis neste projeto são documentadas neste arquivo.

O formato é baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/),
e este projeto adota [Semver](https://semver.org/lang/pt-BR/).

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

[1.0.0]: https://github.com/HFFICEFREE/CompHub/releases/tag/v1.0.0
