import { z } from 'zod'

// Contrato de rede do Socket.io, compartilhado pelo backend Express
// (@comphub/api) e pelo NestJS (@comphub/api-nest). Manter os dois
// servidores lendo o MESMO schema e o que impede o protocolo de divergir
// durante a migracao da Fase 2.

export const JoinRealm = z.object({
    realmId: z.string(),
    shareId: z.string(),
})

export const MovePlayer = z.object({
    x: z.number().int(),
    y: z.number().int(),
})

export const Teleport = z.object({
    x: z.number().int(),
    y: z.number().int(),
    roomIndex: z.number().int(),
})

export const ChangedSkin = z.string()

export const NewMessage = z.string()
