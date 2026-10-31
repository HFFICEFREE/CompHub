import { z } from 'zod'

// Contratos de querystring, espelho de apps/api/src/routes/route-types.ts
// (que continua sendo o usado pelo backend Express em producao).
// Mantidos identicos de proposito durante a migracao: mesmo transform,
// mesmo comportamento — inclusive `parseInt` sem checagem de NaN, que ja
// e o comportamento atual do Express. Trocar os dois juntos, nunca so um.
export const GetPlayersInRoom = z.object({
    roomIndex: z.string().transform((val) => parseInt(val, 10)),
})

export const GetPlayerCounts = z.object({
    realmIds: z.string().transform((s) => s.split(',')),
})
