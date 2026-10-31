// Dominio puro do CompHub, compartilhado entre o backend Express
// (@comphub/api) e o backend NestJS (@comphub/api-nest).
//
// Nada aqui conhece Express, Nest, socket.io ou Supabase: sao tipos,
// funcoes e classes de estado de jogo. Essa fronteira e o que permite
// migrar a camada de transporte (Fase 2) sem duplicar regras de negocio.

export * from './session'
export * from './pathfinding'
export * from './rate-limit'
export * from './utils'
export * from './socket-schemas'
